# État des vérifications — architecture agrégée (13 novembre 2026)

## Changements sur `main`

- Le serveur ne reçoit plus de `browserId`, ne calcule plus d'empreinte IP et n'enregistre plus de ligne personnelle.
- La migration `004_anonymous_aggregate.sql` conserve l'ancien total en addition agrégée, puis supprime les tables individuelles et historiques.
- L'interface abandonne le code privé, le stockage navigateur et le formulaire de retrait.
- Les tâches Cron obsolètes sont retirées du fichier Vercel ; le script SQL d'exploitation les désactive côté Supabase.
- Les tests d'API et SQL sont adaptés à cette architecture.

## Tests non encore exécutés sur ce nouvel état

Les tests et la compilation **n'ont pas pu être exécutés dans cette session**, faute d'accès réseau au dépôt depuis l'environnement d'exécution. Les résultats antérieurs de tests et compilation concernent l'ancienne architecture et ne prouvent pas le fonctionnement des changements agrégés.

À exécuter après un `git pull` :

```sh
npm ci
npm test
npm run build
npm run test:volume
```

Le test distant `npm run test:db` exige `RUN_DATABASE_TESTS=isolated` et une base Supabase jetable : chaque incrément y est irréversible.

## Mise en service toujours à vérifier

1. Tester la migration sur une sauvegarde isolée, notamment la conservation du total historique.
2. Appliquer la migration et la désactivation des anciens Cron dans le vrai projet Supabase.
3. Recharger le schéma PostgREST, vérifier les droits d'exécution `service_role` et l'absence des anciennes tables.
4. Mettre à jour les variables Vercel et valider les mentions légales, sous-traitants et journaux.
5. Tester le formulaire Turnstile sur le domaine HTTPS réel et vérifier les erreurs réseau.
6. N'activer `COLLECTION_ENABLED=true` et la nouvelle `LEGAL_APPROVED_VERSION` qu'après ces contrôles.

**Aucun test réussi ni déploiement effectif n'est affirmé pour cette refonte.**
