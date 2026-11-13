begin;
-- Passage définitif à un compteur agrégé : aucune ligne par participant.
-- Conservation du total existant, sans les identifiants individuels.
lock table private.participations in access exclusive mode;
create table private.aggregate_count (
 id boolean primary key default true check (id),
 total bigint not null check (total >= 0)
);
insert into private.aggregate_count(id,total)
select true,count(*)::bigint from private.participations;
alter table private.aggregate_count enable row level security;
revoke all on private.aggregate_count from public,anon,authenticated;

-- Les anciennes fonctions qui s'appuyaient sur les lignes individuelles disparaissent.
drop function public.record_participation(text,text);
drop function public.withdraw_participation(text);
drop function public.take_rate_slot(text);
drop function public.purge_expired();
drop function public.system_status();
drop function public.public_count();

drop table private.participations cascade;
drop table private.rate_limits cascade;
drop table private.counter_buckets cascade;
drop table private.maintenance cascade;

create function public.public_count() returns bigint
language sql security definer set search_path='' as $$
 select total from private.aggregate_count where id=true
$$;
create function public.increment_count() returns bigint
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare n bigint;
begin
 update private.aggregate_count set total=total+1 where id=true returning total into n;
 if n is null then raise exception 'Counter unavailable'; end if;
 return n;
end $$;
revoke execute on function public.public_count(),public.increment_count() from public,anon,authenticated;
grant execute on function public.public_count(),public.increment_count() to service_role;
commit;
