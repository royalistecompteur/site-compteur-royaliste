# Le peuple appelle au retour du Roi

Compteur participatif anonyme conçu avec React/Vite, API Vercel et PostgreSQL Supabase. **La collecte est désactivée par défaut**. Les participations ne constituent ni un sondage représentatif ni un décompte fiable de personnes uniques.

## Principes de confidentialité

- Aucune connexion Google, Apple ou autre.
- Aucun nom, courriel, identifiant de navigateur, empreinte HMAC, IP ou horodatage individuel stocké dans les tables de participation.
- Uniquement une ligne interne `private.aggregate_count` avec un total numérique ; seule l'API serveur peut l'incrémenter avec `public.increment_count()`.
- Pas de code de retrait, pas d'enregistrement `localStorage`. Aucune possibilité de retrouver ou retirer individuellement une participation déjà intégrée.
- Pas de verrou anti-multiparticipation. Une personne peut participer plusieurs fois. Il ne faut jamais présenter ce total comme un nombre de personnes distinctes.
- Le clic peut avoir été compté même si la réponse réseau s'est perdue. Éviter les tentatives répétées après une erreur.
- Cloudflare Turnstile reste activé en mode réel contre certains robots. Il ne garantit pas l'unicité et peut traiter des signaux du navigateur et des données techniques.
- Vercel, Supabase, Cloudflare et les réseaux intermédiaires peuvent traiter ou journaliser des adresses IP, indépendamment de la base applicative. L'anonymat absolu sur internet n'est pas garanti.

## Démarrage local

```sh
npm ci
npm run dev
npm test
npm run build
```

Le serveur Vite est volontairement en mode démonstration, sans écriture distante et avec un compteur fictif remis à zéro au rechargement. Les tests SQL utilisent PGlite. `npm run test:db` écrit dans un projet Supabase **isolé** et ses incréments ne sont pas réversibles.

## Mise à jour de Supabase

Dans le SQL Editor du projet existant, appliquer `supabase/migrations/004_anonymous_aggregate.sql` **une seule fois** et vérifier son succès. Elle conserve le nombre actuel de participations sous forme agrégée et détruit irréversiblement les lignes individuelles, les empreintes, limitations temporaires et anciens sous-compteurs. Faites auparavant un bilan des obligations de conservation et de sauvegarde : des copies préexistantes peuvent encore contenir les anciennes données. Évitez une restauration d'ancienne sauvegarde qui réintroduirait les fiches.

Sur une nouvelle base, exécuter `001_initial.sql`, `002_consent_v2.sql`, `003_resilience.sql`, puis `004_anonymous_aggregate.sql` dans cet ordre. Les migrations antérieures sont conservées pour permettre l'évolution contrôlée des installations existantes.

Après la migration, appliquer `supabase/operations/schedule.sql` afin de désactiver les tâches Cron devenues inutiles ; elles pouvaient appeler d'anciennes fonctions de purge. Appliquer `supabase/operations/checks.sql` pour vérifier le compteur et l'absence des tables sensibles. La migration et les changements de Cron **ne sont pas déclenchés automatiquement par les commits GitHub**.

## Configuration Vercel

Variables d'environnement serveur (pas de préfixe `VITE_`) :

| Variable | Usage |
|---|---|
| `COLLECTION_ENABLED` | `false` par défaut |
| `LEGAL_APPROVED_VERSION` | `2026-11-13-aggregate-v1` uniquement après validation juridique |
| `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` | Accès SQL serveur exclusivement |
| `APP_ORIGIN` | Origine HTTPS exacte, sans slash final |
| `TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET_KEY` | Protection anti-robots |
| `LEGAL_CONTROLLER`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, `LEGAL_PUBLISHER` | Mentions légales validées |

`HASH_SECRET` et `CRON_SECRET` sont devenus inutiles et peuvent être supprimés des variables Vercel après la migration. Les anciennes fonctions `withdraw`, `cleanup`, `status` ne sont plus exposées. `vercel.json` n'installe plus de Cron de nettoyage.

**Important :** la loi et les mentions légales peuvent imposer la publication de coordonnées ou des formalités particulières, indépendamment du fait que l'application n'enregistre pas de données individuelles. Ne pas renseigner de fausses mentions pour rechercher l'anonymat public. Faire valider les mentions et le rôle des prestataires avant d'activer la collecte.

Pour ouvrir après cette validation : configurer `LEGAL_APPROVED_VERSION=2026-11-13-aggregate-v1` et `COLLECTION_ENABLED=true`, puis redéployer. Tant que ces deux conditions ne sont pas remplies, le site reste en démonstration.

## Déroulement

1. Le visiteur atteste être majeur, français, favorable au retour du Roi et n'avoir jamais participé.
2. Il consent explicitement à ajouter son soutien politique à un total collectif.
3. Turnstile valide la tentative, puis une fonction SQL incrémente atomiquement le total.
4. L'API renvoie seulement le nouveau total. Aucune ligne individuelle n'est créée.

Il n'existe plus de mécanisme de rétractation individuelle, de dédoublonnage ou de purge des participations : ce sont des limitations conscientes de l'agrégation irréversible. Ne pas annoncer de garantie contre les robots ni contre les doublons.

## Vérifications et limites

`npm test` : tests d'API, cache et SQL en local ; `npm run test:volume` : mesure agrégée synthétique, non représentative d'une charge réelle. Les scénarios Turnstile et API sont simulés. Tester impérativement le fonctionnement du site déployé et la migration sur une copie isolée avant ouverture. La présence du code sur GitHub n'implique ni migration appliquée ni collecte activée.

## Anonymat public de l'éditeur (non-professionnel)

La réponse publique `/api/service?action=config` ne contient désormais que `live`, `version`, `siteKey` (publique lorsqu'activée) et `email` de contact du projet. Aucune variable `LEGAL_CONTROLLER`, `LEGAL_ADDRESS` ou `LEGAL_PUBLISHER` n'est renvoyée ; elles ne sont plus requises pour activer le compteur.

Les pages publiques utilisent des mentions d'éditeur non professionnel anonymisé et l'adresse professionnelle de l'hébergeur Vercel. Cette modalité suppose l'application de l'article 1-1 II de la LCEN et la communication des informations personnelles exactes à l'hébergeur. Elle ne garantit pas une absence de lien par les historiques GitHub, archives, métadonnées de domaine ou logs de prestataires.

**Action requise dans Vercel :** supprimer les anciennes variables `LEGAL_CONTROLLER`, `LEGAL_ADDRESS`, `LEGAL_PUBLISHER` afin de ne pas conserver inutilement de données personnelles ; conserver `LEGAL_EMAIL` dédié. Les anciens déploiements, historiques Git ou journaux peuvent nécessiter une revue séparée. Laisser `COLLECTION_ENABLED=false` jusqu'aux tests et à la validation juridique.
