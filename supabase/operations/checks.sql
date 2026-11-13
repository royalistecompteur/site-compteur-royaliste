-- Vérifications d'exploitation du compteur strictement agrégé.
select public.public_count() as total;
select id,total from private.aggregate_count;
-- Aucune table de participations ni de limitation IP ne doit rester.
select to_regclass('private.participations') as individual_records,
       to_regclass('private.rate_limits') as ip_rate_limits;
select jobname,active,schedule from cron.job where jobname like 'roi-%';
