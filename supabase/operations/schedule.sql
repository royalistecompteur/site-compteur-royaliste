-- Apply only after enabling Supabase Cron (pg_cron) in the dedicated project.
-- Reusing these job names updates the schedule instead of duplicating jobs.
select cron.schedule('roi-purge-expired','* * * * *',$job$set statement_timeout='8s'; select public.purge_expired();$job$);
-- pg_cron logs are technical metadata, not participation bodies. Bound their retention.
select cron.schedule('roi-trim-cron-history','20 4 * * *',
  $cmd$delete from cron.job_run_details where end_time < now()-interval '7 days';$cmd$);

-- Refresh API-side function settings after applying migrations.
notify pgrst, 'reload schema';
notify pgrst, 'reload config';
