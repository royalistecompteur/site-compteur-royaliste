# Revue des informations — 13 novembre 2026

Périmètre : appel citoyen privé, porté par un particulier à titre non professionnel (statut confirmé), sans vente, compte, newsletter ni publicité ciblée. Revue documentaire des textes et du code local, pas validation juridique définitive ni contrôle d'un hébergement réel. **La collecte et la publication restent désactivées.**

## Ce qui est obligatoire, nécessaire ou facultatif

| Information / demande | Qualification pour ce projet | Placement retenu / suite |
|---|---|---|
| Identité et contact du responsable, objectif, données traitées et droits | Information RGPD obligatoire avant collecte | Résumé dans le formulaire + notice complète ; identité et contact manquants |
| Traitement d'une opinion politique | Donnée sensible ; consentement explicite retenu pour ce projet | Case distincte, non précochée ; refus possible sans empêcher la consultation |
| Durée, destinataires, transferts et garanties éventuels | À préciser avant collecte | Notice ; prestataires, contrats, pays, journaux et sauvegardes non finalisés |
| Retrait, droits applicables, réclamation | À informer et rendre effectivement utilisables | Code privé, contact et lien CNIL ; retrait réel encore à tester chez l'hébergeur |
| Français, 18 ans ou plus, première participation | Conditions choisies par l'organisateur, pas obligations légales générales d'une pétition | Conservées conformément au concept ; sans justificatif |
| Soutien à la monarchie | Objet même de la démarche | Déclaration distincte du consentement au traitement |
| « Pas un sondage représentatif », limites des doublons | Nécessaires pour expliquer honnêtement le compteur ; pas une formule juridique magique | Mention courte près du compteur, méthode détaillée ailleurs |
| Sans compte, sans nom affiché, gratuit | Informations utiles et cohérentes avec le produit | Conservées ; pas de promesse d'anonymat absolu |
| Nom, pièce d'identité, date de naissance, téléphone du participant | Non nécessaires au parcours retenu | Non collectés |
| SIRET, TVA, CGV, médiation de consommation | Non pertinents dans le périmètre actuel sans entreprise ni vente | À réexaminer si le modèle change ; ne rien inventer |

Références : [information des personnes, CNIL](https://www.cnil.fr/fr/informer-les-personnes), [exemples de formulaires, CNIL](https://www.cnil.fr/fr/exemples-de-formulaire-de-collecte-de-donnees-caractere-personnel), [consentement, CNIL](https://www.cnil.fr/fr/les-bases-legales/consentement), [articles 12 et 13 du RGPD](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3). Le formulaire peut rester court grâce à une information à deux niveaux, mais le second niveau doit être complet avant ouverture.

## Particularité du statut non professionnel

L'article 1-1 II de la LCEN prévoit une possibilité de préserver l'anonymat de l'éditeur non professionnel en publiant les informations d'hébergement qu'il prévoit, sous réserve que l'hébergeur connaisse son identité. Ce régime doit être distingué des mentions ordinaires du I (notamment directeur de publication et coordonnées). Il ne faut donc pas présenter la publication du domicile et du téléphone personnel comme une exigence inconditionnelle pour ce statut. [Texte en vigueur, Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049568614/).

En revanche, l'article 13 du RGPD impose de communiquer aux participants l'identité et les coordonnées du responsable de la collecte. **L'exception LCEN ne suffit donc pas à promettre l'anonymat de l'organisateur de cette collecte.** Le mode de présentation de ces coordonnées et une éventuelle adresse de correspondance doivent être validés. Aucun nom, domicile ou numéro personnel n'a été déduit du compte ni ajouté au site. Les paramètres actuels `LEGAL_ADDRESS` et `LEGAL_PUBLISHER` sont des choix conservateurs du prototype, pas une description exhaustive des obligations d'un particulier.

## Corrections réalisées

- Information courte au formulaire : responsable/contact, caractère volontaire, effet d'un refus, données sensibles, accès aux détails.
- Distinction explicite entre données pseudonymisées et anonymes. L'empreinte en base reste associée à un soutien politique.
- Les critères Français/18+/première participation sont présentés comme règles du projet.
- « Rien n'est envoyé » est remplacé par l'absence de transmission des déclarations en simulation : servir une page produit malgré tout des échanges techniques.
- Le compteur est décrit comme un stock de participations conservées : les retraits et purges le font baisser. Une participation échue peut rester comptée jusqu'au nettoyage quotidien.
- La durée de 180 jours est une proposition à justifier. Le RGPD ne fixe pas cette durée pour ce projet. Une purge quotidienne prévue ne garantit pas un maximum absolu de 24 heures en cas de panne. [Durées de conservation, CNIL](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).
- La notice distingue le traitement temporaire de l'IP par le serveur de l'absence d'IP brute dans les tables. Elle précise les droits et les finalités de sécurité à qualifier séparément.
- La version de consentement passe à `2026-11-13-v2`, avec migration SQL et refus de l'ancienne version. Le secret du nettoyage planifié est désormais requis pour ouvrir la collecte. Cela ne remplace pas le contrôle de l'exécution du nettoyage.

## Point particulier : Turnstile et les traceurs

Cloudflare décrit deux rôles : sous-traitant pour sécuriser le site et responsable distinct pour améliorer sa détection. Il cite notamment l'IP et des signaux du navigateur. La notice précédente ne rendait pas suffisamment compte de cette distinction ; elle est corrigée et liée à la [notice officielle Turnstile](https://www.cloudflare.com/turnstile-privacy-policy/).

La CNIL n'exempte pas automatiquement tout CAPTCHA : la finalité exclusivement nécessaire et les réutilisations du fournisseur comptent. **L'absence de bandeau ne peut pas être validée sur la seule affirmation « outil de sécurité ».** Examiner la configuration, les contrats et les opérations réellement réalisées par Turnstile et le stockage local ; si l'exemption n'est pas applicable, prévoir un mécanisme conforme ou une alternative technique. Le consentement à l'opinion politique n'autorise pas globalement les autres finalités. [FAQ CNIL, questions 16 à 18](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ).

## À résoudre avant ouverture

1. Identité et contact joignable du responsable ; régime de présentation de l'éditeur ; informations légales vérifiées de l'hébergeur et du stockage. Les simples marques Vercel/Supabase ne suffisent pas à finaliser les mentions.
2. Justification de la durée de 180 jours et acceptation du compteur décroissant ; durées des journaux, sauvegardes et éventuelle fermeture anticipée de l'initiative.
3. Qualification des traitements de sécurité, mise en balance de l'intérêt légitime envisagé, examen Turnstile/traceurs ; information complète sur les destinataires et transferts effectifs. Aucun transfert « uniquement en France/UE » n'est promis.
4. Organisation de l'exercice des droits et gestion des incidents. Tenir la documentation du traitement ; évaluer l'analyse d'impact et le besoin d'un DPO si le traitement atteint une grande échelle. Le seul statut de particulier ne règle pas ces questions. [CNIL : données sensibles et obligations associées](https://www.cnil.fr/fr/comprendre-le-rgpd/reglement-general-sur-la-protection-des-donnees-ce-qui-change-pour-les-professionnels).
5. Tests sur environnement distant isolé : retrait, purge, concurrence, accès SQL, Turnstile et absence de données sensibles dans les journaux. La présence des variables d'environnement ne vaut pas conformité.

Aucune pièce d'identité ni coordonnée personnelle n'est nécessaire pour poursuivre les essais locaux. La validation finale devra porter sur les textes complétés **et** les paramètres effectifs des services.
