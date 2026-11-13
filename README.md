# Le peuple appelle au retour du Roi

Site React/Vite, API Vercel (Node 22), base PostgreSQL Supabase. **Non publié. Collecte désactivée par défaut.** Le mode local est exclusivement une démonstration en mémoire : compteur initial à 0, aucune participation envoyée, aucun code enregistré. Aucun chiffre de démonstration n'est présenté comme réel.

## Lancer et vérifier

```sh
npm ci
npm run dev
npm test
npm run build
```

Ouvrir l'adresse locale indiquée. Tester les cinq cases, le bouton, le message de simulation, le retrait simulé, les pages et le format mobile. Recharger remet la démonstration à zéro. Le serveur Vite fournit uniquement l'API de démonstration, quelles que soient les variables locales. `npm run preview` sert la compilation statique, avec repli démonstration.

## Architecture et données

- `src/` : interface accessible, styles responsive, consentement séparé et non précoché, aucun compte.
- `api/service.js` et `server/core.js` : API à `/api/service?action=config|count|participate|withdraw|cleanup` ; secrets exclusivement côté serveur.
- `supabase/migrations/` : tables privées avec RLS sans politiques publiques ; fonctions réservées à `service_role`, `search_path` vide. Aucune clé Supabase dans le navigateur.
- Insertion unique par empreinte HMAC du code navigateur (256 bits aléatoires) et incrément atomique dans une transaction ; 256 sous-compteurs répartissent les écritures, leur somme donne le total public ; retrait idempotent et décrément transactionnel. Aucun endpoint de modification libre du compteur.
- Le code privé est enregistré localement avant l'envoi afin qu'une réponse réseau perdue ne crée pas un second identifiant. Il sert aussi au retrait. Le conserver en lieu sûr. Bloquer le stockage local empêche une participation réelle afin de ne pas perdre le code.
- Dix tentatives par fenêtre de dix minutes, partagées entre participation et retrait et persistées en base. HMAC quotidien de l'IP : pas d'IP brute ni de lien avec la table de soutien. Les IP partagées peuvent provoquer des refus temporaires. Vercel doit être directement exposé : pas de proxy non validé devant Vercel. L'API refuse les écritures hors Vercel.
- Turnstile prévu par le code pour une participation réelle, sous réserve de la revue juridique de ses finalités et traceurs : validation serveur du jeton, du domaine et de l'action `participate`. Le retrait exige la possession du code et est limité en fréquence, sans nécessiter de nouveau consentement.
- Conservation proposée : 180 jours puis purge régulière par lots. La table ne conserve ni nom, ni e-mail, ni nationalité, ni âge, ni IP brute. L'existence de la participation reste une donnée politique pseudonymisée, **pas anonyme**. Le code, l'horodatage et la version documentent le consentement vérifié côté serveur.
- Aucun analytique publicitaire ni police externe ajouté par le site ; les traceurs techniques restent soumis à la revue décrite dans le rapport juridique. Cloudflare n'est chargé qu'en mode réel. Le compteur est relu toutes les 45–60 secondes uniquement dans les onglets visibles, sans requêtes qui se chevauchent. Une réponse publique est partagée par le cache Vercel (15 secondes, revalidation en arrière-plan jusqu’à 30 secondes) et un cache mémoire court. Une panne ne produit pas un faux zéro.

## Préparer Supabase (environnement de test seulement avant validation)

1. Créer un projet Supabase dédié et choisir une région UE adaptée. Conserver la clé service_role uniquement côté serveur.
2. Appliquer dans l’ordre `supabase/migrations/001_initial.sql` puis `002_consent_v2.sql` et `003_resilience.sql` avec le SQL Editor ou `supabase db push` après liaison du projet. La migration initialise le compteur à zéro.
3. Vérifier que les rôles `anon` et `authenticated` ne peuvent ni lire les tables privées ni exécuter les fonctions RPC privées au service. Ne pas ajouter de politiques publiques ou exposer le schéma `private`.
4. Dans un projet de test **isolé**, exécuter le test concurrent avec `RUN_DATABASE_TESTS=isolated`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` fournis comme variables d'environnement, puis `npm run test:db`. Ce test insère un enregistrement synthétique et le supprime ; les empreintes de limitation expirent au nettoyage. Ne pas le lancer contre une collecte ouverte. Le test de volume `npm run test:volume` utilise uniquement une base locale en mémoire, sans réseau. Lire `docs/EXPLOITATION.md` avant déploiement.

## Variables Vercel

Copier les noms de `.env.example` dans les paramètres du projet, sans committer de secrets. Aucune variable `VITE_` n'est nécessaire.

| Variable | Usage |
|---|---|
| `COLLECTION_ENABLED` | `false` par défaut ; ouverture réelle uniquement après validation explicite |
| `LEGAL_APPROVED_VERSION` | vide tant que non validé ; version exacte du consentement validé |
| `APP_ORIGIN` | origine HTTPS exacte, sans slash final, ex. `https://appel.example` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | projet et secret serveur |
| `HASH_SECRET` | secret aléatoire indépendant d'au moins 32 caractères |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | clés production, domaine autorisé dans Cloudflare ; jamais les clés de test pour une collecte réelle |
| `LEGAL_CONTROLLER`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, `LEGAL_PUBLISHER` | identité et coordonnées validées de l'éditeur / responsable / directeur |
| `CRON_SECRET` | secret aléatoire pour protéger le nettoyage et le contrôle de santé |

Générer les secrets avec un générateur cryptographique (par exemple `openssl rand -hex 32`). Ne pas les envoyer dans un chat. La rotation de `HASH_SECRET` rend les anciens codes de retrait et l'anti-doublon incompatibles : prévoir une migration ou une fermeture/purge avant rotation.

## Avant publication : validation requise

Le présent projet n'autorise pas une publication ou une collecte immédiate. Les textes sont des **projets de mentions**, pas une certification juridique. Faire valider et compléter :

- l'identité, le statut, les coordonnées de l'éditeur et du responsable, le directeur de publication et les coordonnées légales des hébergeurs ;
- la finalité, les bases légales, le texte exact du consentement, la durée de 180 jours et les modalités d'exercice des droits ;
- les contrats de sous-traitance, les régions effectives, les éventuels transferts hors EEE, les garanties, les journaux techniques et les sauvegardes (durées et purge), ainsi que l'accès des administrateurs ;
- la configuration Turnstile et l'information liée au stockage local ; l'évaluation du besoin d'une analyse d'impact ;
- un test réel du retrait, du refus des doublons, de la purge et des autorisations dans l'environnement isolé.

Remplacer les paragraphes « à confirmer / à valider » dans `src/main.jsx` par les informations effectives. Si le texte du consentement change, versionner ensemble `VERSION` dans `server/core.js` et `src/main.jsx`, et ajouter une nouvelle migration remplaçant la version autorisée dans la fonction SQL. Conserver hors base la notice associée à chaque version dans le dépôt.

## Déploiement Vercel, après validation seulement

1. Importer le dépôt dans Vercel, framework Vite, Node 22, installation `npm ci`, build `npm run build`, sortie `dist`. `vercel.json` définit les en-têtes de sécurité et un nettoyage de secours quotidien à 03:00 UTC. Activer impérativement Supabase Cron et appliquer `supabase/operations/schedule.sql` : un lot de nettoyage par minute ; le secours Vercel seul ne suffit pas à purger un gros volume.
2. Configurer les variables et le domaine exact. Garder `COLLECTION_ENABLED=false` pour les previews et protéger leur accès. Séparer projets et secrets de test et de production.
3. Vérifier sur le domaine de test la réception des cinq déclarations, Turnstile, les refus de manipulation, les restrictions SQL et la purge planifiée. Le test de concurrence ne remplace pas une revue de sécurité.
4. Après validation des mentions et du consentement, fixer `LEGAL_APPROVED_VERSION=2026-11-13-v3` (ou version révisée validée) et `COLLECTION_ENABLED=true` en production, puis redéployer. La présence des variables ne prouve pas leur validation : cette étape reste une décision humaine.
5. Vérifier que le compteur réel est à zéro sur une base neuve, que le cron fonctionne et que l'API ne journalise ni corps de requêtes, ni codes privés. Configurer la conservation des logs chez les prestataires, l'accès minimal et la supervision d'échecs de purge. Une panne de purge doit entraîner une intervention, voire la suspension de la collecte.

Pour suspendre : `COLLECTION_ENABLED=false` puis redéployer. Le retrait par code reste disponible tant que les secrets serveur et la base restent configurés. Ne pas supprimer la clé HMAC avant d'avoir traité les retraits ou purgé la collecte. Les sauvegardes doivent suivre la durée effectivement annoncée et ne pas restaurer durablement des données retirées.

## Limites assumées

L'effacement du navigateur, plusieurs appareils, VPN ou robots avancés peuvent contourner les protections. Il ne s'agit pas d'une vérification d'identité. L'API et les protections ne garantissent ni une personne par participation ni la représentativité. L'administrateur possédant les secrets et l'accès SQL conserve le pouvoir technique de modifier les données : protéger ces accès, tracer les opérations administratives, et ne pas présenter le compteur comme infalsifiable.

## Sources de conception

- [CNIL : consentement explicite](https://www.cnil.fr/fr/les-bases-legales/consentement)
- [Supabase : sécurisation des fonctions](https://supabase.com/docs/guides/database/functions)
- [Cloudflare : validation Turnstile côté serveur](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Vercel : en-têtes de requête](https://vercel.com/docs/headers/request-headers)

## Vérification

`npm test` teste l'API avec dépendances réseau simulées. `npm run test:db` est séparé et requiert une vraie base isolée. Voir `VALIDATION.md` pour les contrôles réellement exécutés et leurs limites, et `docs/REVUE_INFORMATIONS.md` pour les obligations et les points juridiques non résolus.
