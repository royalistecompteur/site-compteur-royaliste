begin;
-- Keep the migration consistent if it is applied to an existing collection.
lock table private.participations in access exclusive mode;
alter table private.participations add column bucket smallint generated always as
  (get_byte(decode(substr(browser_hash,1,2),'hex'),0)) stored;
create table private.counter_buckets (
  bucket smallint primary key check(bucket between 0 and 255),
  total bigint not null default 0 check(total>=0)
);
insert into private.counter_buckets(bucket,total)
select b, count(p.browser_hash) from generate_series(0,255) b
left join private.participations p on p.bucket=b group by b;
alter table private.counter_buckets enable row level security;
revoke all on private.counter_buckets from public,anon,authenticated;

-- Aggregate each statement, then acquire bucket locks in a stable order.
create function private.count_insertions() returns trigger language plpgsql security definer set search_path='' as $$
declare r record;
begin
  for r in select bucket,count(*) as n from inserted group by bucket order by bucket loop
    update private.counter_buckets set total=total+r.n where bucket=r.bucket;
  end loop;
  return null;
end $$;
create function private.count_deletions() returns trigger language plpgsql security definer set search_path='' as $$
declare r record;
begin
  for r in select bucket,count(*) as n from deleted group by bucket order by bucket loop
    update private.counter_buckets set total=total-r.n where bucket=r.bucket;
  end loop;
  return null;
end $$;
create trigger participation_inserted after insert on private.participations
referencing new table as inserted for each statement execute function private.count_insertions();
create trigger participation_deleted after delete on private.participations
referencing old table as deleted for each statement execute function private.count_deletions();
create or replace function public.public_count() returns bigint language sql security definer set search_path='' as $$
select coalesce(sum(total),0)::bigint from private.counter_buckets $$;

create table private.maintenance (
  id boolean primary key default true check(id),
  last_cleanup_at timestamptz
);
insert into private.maintenance(id) values(true);
alter table private.maintenance enable row level security;
revoke all on private.maintenance from public,anon,authenticated;
create index rate_limits_expiry_idx on private.rate_limits(expires_at);
create function public.system_status() returns jsonb language sql security definer set search_path='' as $$
select jsonb_build_object(
 'lastCleanupAt',last_cleanup_at,
 'healthy',coalesce(last_cleanup_at > now()-interval '26 hours',false)
   and not exists(select 1 from private.participations where expires_at < now()-interval '24 hours'),
 'pendingCleanup',exists(select 1 from private.participations where expires_at<=now())
) from private.maintenance where id=true $$;

create or replace function public.record_participation(p_hash text,p_version text) returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' set lock_timeout='2s' as $$
declare n integer;
begin
  if p_version is distinct from '2026-11-13-v3' then raise exception 'Invalid consent version'; end if;
  if not (public.system_status()->>'healthy')::boolean then raise exception 'Maintenance overdue'; end if;
  insert into private.participations(browser_hash,consent_version) values(p_hash,p_version) on conflict do nothing;
  get diagnostics n=row_count;
  -- The same private code is an idempotency key, including after a lost response.
  return jsonb_build_object('accepted',n=1,'alreadyRecorded',n=0,'count',public.public_count());
end $$;
drop function public.withdraw_participation(text);
create function public.withdraw_participation(p_hash text) returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' set lock_timeout='2s' as $$
begin
  delete from private.participations where browser_hash=p_hash;
  return jsonb_build_object('ok',true,'count',public.public_count());
end $$;

-- One bounded transaction. Repeated runs drain a backlog without a giant deletion.
drop function public.purge_expired();
create function public.purge_expired() returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' set lock_timeout='2s' as $$
declare n integer; rates integer;
begin
  if not pg_try_advisory_xact_lock(73510291) then return jsonb_build_object('busy',true); end if;
  with batch as (
    select browser_hash from private.participations where expires_at<=now()
    order by expires_at,browser_hash limit 5000 for update skip locked
  ) delete from private.participations p using batch where p.browser_hash=batch.browser_hash;
  get diagnostics n=row_count;
  with batch as (
    select key from private.rate_limits where expires_at<=now()
    order by expires_at,key limit 5000 for update skip locked
  ) delete from private.rate_limits r using batch where r.key=batch.key;
  get diagnostics rates=row_count;
  update private.maintenance set last_cleanup_at=now() where id=true;
  return jsonb_build_object('removed',n,'rateEntriesRemoved',rates,'pending',
    exists(select 1 from private.participations where expires_at<=now()) or
    exists(select 1 from private.rate_limits where expires_at<=now()));
end $$;
-- Avoid unlimited write churn on an already exhausted rate bucket.
create or replace function public.take_rate_slot(p_key text) returns boolean language plpgsql security definer set search_path='' set statement_timeout='3s' set lock_timeout='1s' as $$
declare n integer;
begin
  insert into private.rate_limits as r values(p_key,1,now()+interval '10 minutes')
  on conflict(key) do update set attempts=case when r.expires_at<=now() then 1 else r.attempts+1 end,
    expires_at=case when r.expires_at<=now() then now()+interval '10 minutes' else r.expires_at end
  where r.expires_at<=now() or r.attempts<10
  returning attempts into n;
  return n is not null and n<=10;
end $$;
-- Old counter no longer has writers or readers.
drop table private.counter;
revoke all on function private.count_insertions(),private.count_deletions() from public,anon,authenticated;
revoke execute on function public.system_status(),public.withdraw_participation(text),public.purge_expired() from public,anon,authenticated;
grant execute on function public.system_status(),public.withdraw_participation(text),public.purge_expired() to service_role;
select public.purge_expired();
commit;
