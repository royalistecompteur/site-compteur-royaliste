-- Operator-only checks; never expose these as public endpoints.
select public.system_status();
select public.public_count() as counter,
       (select count(*) from private.participations) as actual_rows;
select pg_size_pretty(pg_total_relation_size('private.participations')) as participation_storage;
select jobname,active,schedule from cron.job where jobname like 'roi-%';
select jobid,status,start_time,end_time from cron.job_run_details order by start_time desc limit 10;
-- A mismatch requires investigation. Do not reset a live counter blindly.
