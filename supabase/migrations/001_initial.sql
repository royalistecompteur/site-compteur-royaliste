begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.participations (
  browser_hash text primary key check (browser_hash ~ '^[a-f0-9]{64}$'),
  consent_version text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '180 days'
);
create index on private.participations(expires_at);
create table private.counter (id boolean primary key default true check(id), total bigint not null default 0 check(total >= 0));
insert into private.counter values (true,0);
create table private.rate_limits (key text primary key, attempts integer not null, expires_at timestamptz not null);
alter table private.participations enable row level security;
alter table private.counter enable row level security;
alter table private.rate_limits enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;
create function public.public_count() returns bigint language sql security definer set search_path = '' as $$ select total from private.counter where id = true $$;
create function public.record_participation(p_hash text, p_version text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare inserted integer; n bigint;
begin
  if p_version <> '2026-11-13-v1' then raise exception 'Invalid consent version'; end if;
  insert into private.participations(browser_hash,consent_version) values(p_hash,p_version) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then update private.counter set total=total+1 where id=true returning total into n;
  else select total into n from private.counter where id=true; end if;
  return jsonb_build_object('accepted',inserted=1,'count',n);
end $$;
create function public.withdraw_participation(p_hash text) returns void language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  delete from private.participations where browser_hash=p_hash;
  get diagnostics removed = row_count;
  if removed=1 then update private.counter set total=total-1 where id=true; end if;
end $$;
create function public.take_rate_slot(p_key text) returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into private.rate_limits as r values(p_key,1,now()+interval '10 minutes')
  on conflict(key) do update set attempts=case when r.expires_at<=now() then 1 else r.attempts+1 end,
    expires_at=case when r.expires_at<=now() then now()+interval '10 minutes' else r.expires_at end
  returning attempts into n;
  return n<=10;
end $$;
create function public.purge_expired() returns void language plpgsql security definer set search_path = '' as $$
declare removed bigint;
begin
  delete from private.participations where expires_at<=now(); get diagnostics removed = row_count;
  update private.counter set total=total-removed where id=true;
  delete from private.rate_limits where expires_at<=now();
end $$;
revoke execute on function public.public_count(), public.record_participation(text,text), public.withdraw_participation(text), public.take_rate_slot(text), public.purge_expired() from public, anon, authenticated;
grant execute on function public.public_count(), public.record_participation(text,text), public.withdraw_participation(text), public.take_rate_slot(text), public.purge_expired() to service_role;
commit;
