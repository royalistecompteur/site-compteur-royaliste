# Vérification du 13 novembre 2026

## Réalisé

- Installation des dépendances avec fichier de verrouillage ; audit npm : zéro vulnérabilité signalée lors de l'installation.
- `npm test` : 13 tests réussis, zéro échec.
- Douze tests serveur couvrent la collecte fermée, le compteur de démonstration à zéro, l'origine, le format/taille des requêtes, les déclarations strictes, la version, les limites de fréquence, Turnstile (réponses simulées), les doublons, la panne de base, les retraits pendant suspension, le cron et l'absence de secrets dans la configuration publique.
- Migration exécutée dans PGlite (PostgreSQL local) : insertion unique, requêtes multiples, compteur, retrait idempotent, expiration, limitation de fréquence, refus aux rôles anon/authenticated et autorisation service_role.
- `npm run build` : compilation de production réussie.
- Vérification dans le navigateur de la démonstration : bouton désactivé tant que le consentement manque, simulation 0 → 1, confirmation et blocage d'un second clic, réinitialisation 1 → 0, navigation vers la confidentialité et retour.
- Affichage mobile contrôlé à 390 × 844 ; largeur du document égale à 390, sans débordement horizontal. Contrôle du format bureau à 1280 px.

## À vérifier avant ouverture

Aucun projet Supabase distant ni déploiement Vercel n'a été créé ou modifié. Pas de publication, pas de données personnelles réelles collectées.

Le test `npm run test:db` sur un projet Supabase isolé est fourni mais n'a pas été exécuté : il vérifie notamment la concurrence sur des connexions réelles (PGlite sérialise ses requêtes). L'intégration Turnstile réelle, les en-têtes appliqués par Vercel, le cron hébergé, les politiques de journaux/sauvegardes et le retrait de bout en bout restent à vérifier dans l'environnement de test configuré. Les textes juridiques sont à compléter et valider.

## Revue des informations (même date)

Statut confirmé : particulier non professionnel. Voir `docs/REVUE_INFORMATIONS.md` pour les sources, corrections et points à résoudre. Formulaire/notice révisés, nouvelle version de consentement `2026-11-13-v2` et migration `002_consent_v2.sql`. Les 13 tests passent après modification : la base refuse la v1, les autorisations restent restreintes et le serveur refuse l'ouverture sans secret de purge. La compilation réussit. Aucune vérification juridique finale ni configuration distante n'a été réalisée.

## Renforcement de la durée et du volume (13 novembre 2026)

- 18 tests réussis (dont migration d’une base déjà peuplée sans perte de participations) : cache partagé entre 100 lecteurs simultanés d'une instance, erreurs non cachées, reprise après panne, santé privée, requêtes répétées sans double comptage, droits SQL, transaction annulée sans dérive du compteur, refus d'insertion si entretien en retard, retrait toujours disponible, purge bornée et reprise du lot suivant.
- Test de volume local avec 1 000 000 lignes fictives : total exact, purge de 5 000 lignes, total final 995 000. Résultats chiffrés dans `docs/volume-result.json`.
- Compilation réussie. Test distant de concurrence, configuration réelle du cache CDN, Supabase Cron, alertes et restauration de sauvegarde restent à effectuer avant ouverture. Aucune garantie de débit hébergé n'est déduite du moteur local.
