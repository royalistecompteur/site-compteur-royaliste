-- À exécuter après la migration 004 : plus aucune purge individuelle nécessaire.
-- Annule les anciens travaux sans effacer le compteur agrégé.
select cron.unschedule(jobid) from cron.job
where jobname in ('roi-purge-expired','roi-trim-cron-history');
notify pgrst, 'reload schema';
notify pgrst, 'reload config';
