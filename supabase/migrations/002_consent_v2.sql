begin;
create or replace function public.record_participation(p_hash text, p_version text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare inserted integer; n bigint;
begin
  if p_version <> '2026-11-13-v2' then raise exception 'Invalid consent version'; end if;
  insert into private.participations(browser_hash,consent_version) values(p_hash,p_version) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then update private.counter set total=total+1 where id=true returning total into n;
  else select total into n from private.counter where id=true; end if;
  return jsonb_build_object('accepted',inserted=1,'count',n);
end $$;
commit;
