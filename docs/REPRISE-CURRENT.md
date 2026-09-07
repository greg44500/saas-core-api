# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il décrit l'état réel du travail au moment de la reprise. Il n'est pas normatif : le code, les contraintes DB, les tests réellement validés et les contrats canoniques priment.
>
> **Dernière mise à jour : 2026-09-07**

---

## 1. Hiérarchie d'autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés réellement exécutés et validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. présent fichier de reprise.

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement prêt pour la production.

À la reprise : toujours commencer par `git pull` et travailler depuis le HEAD courant plutôt que d'exiger un SHA documentaire précis.

---

## 2. Objectif du Core

`saas-core-api` est un **socle SaaS générique clonable, maintenable et évolutif**.

Le Core porte les responsabilités transversales :

```text
authentification / sessions
RBAC Workspace
RBAC Platform
Workspaces / membres
Plans / Subscriptions / trial
Entitlements / quotas / dérogations
Files sécurisés
Audit logs
administration Platform
lifecycle Account / Workspace
points d'extension métier
rétention / purge générique sécurisée
onboarding commercial générique
versionnement / migrations / upgrade
E2E Core
```

Les modules métier réels ne doivent pas être développés directement dans le dépôt Core.

---

## 3. Roadmap réelle jusqu'au clonage métier

Ordre figé après clôture D-018 :

```text
D-019 moteur sécurisé de rétention / purge Core
→ D-020 invitation commerciale client / offre privée Découverte
→ D-015 versionnement / provenance / migrations / release
→ D-016 Playwright / E2E Core
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
→ release v1.0.0
→ clone du véritable SaaS métier
→ cadrage puis développement des modules métier
```

Important :

```text
D-017
= clone pilote technique temporaire destiné à éprouver dérivation + upgrade

clone métier réel
= seulement après validation du Core et release v1.0.0
```

---

## 4. D-018 — VALIDÉ

D-018 « Équipe de la Plateforme / RBAC Platform / invitations internes » est **clôturé et VALIDÉ le 2026-09-07**.

Contrat canonique :

```text
docs/contracts/PLATFORM-TEAM.md
```

Dette canonique :

```text
docs/DEBT.md
```

### 4.1 Architecture validée

```text
User
→ identité / authentification globale

PlatformTeamMember
→ appartenance à l'équipe interne

PlatformRole
→ rôle système ou personnalisé

PlatformPermission
→ autorité administrative effective

PlatformInvitation
→ invitation interne sécurisée

Fondateur
→ qualité historique protégée, distincte du rôle RBAC
```

Invariants :

```text
exactement un Fondateur actif
Fondateur → toujours Super administrateur
Super administrateur → pas nécessairement Fondateur
plusieurs Super administrateurs possibles
Administrateur de la Plateforme ≠ Super administrateur
1 PlatformTeamMember → 1 PlatformRole
permissions → dérivées du rôle et de l'état DB courant
RBAC Platform ≠ RBAC Workspace
```

Le Fondateur ne peut pas être rétrogradé, suspendu, révoqué ou fermé via l'administration ordinaire.

Le dernier Super administrateur actif est protégé.

L'autorisation Platform sensible est recalculée depuis MongoDB via `resolvePlatformAuthorization()` ; une suspension ou révocation prend effet sans attendre l'expiration d'un JWT.

`User.platformRole` reste un fallback backend historique limité et ne constitue pas une autorité frontend.

### 4.2 Gouvernance des rôles validée

Rôles système :

```text
Super administrateur
Administrateur de la Plateforme
Support technique
Support commercial
Support client
```

Les rôles système sont immuables depuis l'administration courante.

Les rôles personnalisés utilisent uniquement le registre Platform actif, ne peuvent recevoir aucune permission `RESERVED`, ne peuvent cloner exactement un rôle actif et restent soumis aux règles anti-escalade.

Décision RBAC déjà validée :

```text
platform:roles:read
→ DÉLÉGABLE

platform:roles:create
platform:roles:update
platform:roles:archive
→ RÉSERVÉES
```

Le Fondateur / Super administrateur conserve la gouvernance des rôles personnalisés.

### 4.3 Invitations Platform validées

`PlatformInvitation` reste strictement dédiée aux collaborateurs internes de la Plateforme.

Validé : token aléatoire, hash SHA-256 persisté, expiration, resend avec rotation du secret, revoke, accept-existing / accept-new, contrôle email, revalidation de l'autorité de l'invitant, audit, rate limiting et absence de secret brut dans les réponses/listings/audits.

`PlatformInvitation` ne doit jamais être réutilisée pour une invitation commerciale d'un prospect ou client.

### 4.4 Frontend D-018 validé

L'administration de l'équipe Platform reste **une seule page fonctionnelle** accessible depuis la navigation par une entrée unique « Gestion des membres ».

La page conserve ses onglets :

```text
Membres
Invitations
Rôles & permissions
```

Ces onglets ne doivent pas devenir trois entrées de sidebar : ils appartiennent au même domaine fonctionnel et ce regroupement est validé pour une UI/UX optimisée.

Réutilisation obligatoire confirmée des composants partagés existants (`DataTable`, drawers, confirmations, boutons d'action, champs partagés, badges, etc.).

Le frontend resynchronise le contexte Platform après un `403` sur une route Platform via invalidation/refetch de `/api/platform/me` puis redirection vers une route encore autorisée ou `/workspaces`.

### 4.5 Validation finale D-018

L'utilisateur a confirmé :

```text
backend ciblé D-018       ✅
backend global             ✅
frontend ciblé             ✅
frontend global            ✅
build Vite production      ✅
```

Aucune nouvelle modification D-018 n'est à faire à la prochaine reprise.

---

## 5. D-019 — prochain bloc exact

```text
D-019 — Moteur sécurisé de rétention et purge des données Core
```

Le **Gate de cadrage D-019.1 est désormais figé**. La prochaine conversation peut donc commencer le premier mini-lot d'implémentation, après vérification du code courant.

D-019 reste distinct de D-006 :

```text
D-019
→ mécanismes génériques, sécurisés, configurables et traçables de rétention / purge

D-006
→ règles juridiques / produit réelles concernant les données personnelles :
   quoi conserver, pourquoi, combien de temps, anonymiser ou détruire
```

Le Core ne doit pas inventer une durée juridique universelle pour les données personnelles.

### 5.1 Trois notions de rétention à ne plus confondre

#### A. Corbeille `File`

La suppression utilisateur d'un fichier est un **soft-delete**.

Cycle fonctionnel figé :

```text
ACTIVE
→ suppression utilisateur
→ DELETED
   deletedAt
   deletedBy
   purgeScheduledAt
→ corbeille temporaire
→ restauration future possible via D-002
OU
→ échéance de rétention atteinte
→ purge physique automatique sécurisée
→ PURGED / purgedAt
```

Règles :

- l'utilisateur ne provoque pas une destruction physique immédiate lors d'un delete ordinaire ;
- la corbeille ne peut pas conserver indéfiniment des fichiers parce que l'utilisateur oublierait de la vider ;
- durée Core par défaut retenue : **30 jours** ;
- la durée ne doit pas être codée en dur dans la logique métier ;
- la purge physique automatique après échéance est un garde-fou Core ;
- le moteur doit être idempotent, reprendre après échec et être sûr en concurrence ;
- une restauration concurrente ne doit jamais réussir silencieusement pendant qu'un worker a déjà réclamé le fichier pour purge.

D-002 reste distinct :

```text
D-002
→ UI corbeille
→ listing
→ restauration
→ permissions de restauration
→ comportement produit associé

D-019
→ exécution automatique et sécurisée de la purge après échéance
```

D-002 ne doit pas être développé pendant le lot D-019.

#### B. Rétention des `AuditLog`

Les AuditLogs s'accumulent et nécessitent une vraie politique de rétention configurable.

Le Core doit permettre de paramétrer de manière sécurisée au minimum :

```text
quoi purger
combien de temps conserver
quand exécuter
à quelle fréquence
par quelle taille de lots
combien de lots maximum si nécessaire
activation / désactivation
preview / dry-run
exécution manuelle autorisée
traçabilité des exécutions
reprise après erreur
concurrence multi-instance
```

Le frontend ne fournit jamais :

- un filtre MongoDB libre ;
- une collection arbitraire ;
- une date cutoff arbitraire ;
- une requête de suppression générique.

L'éligibilité et le cutoff sont calculés côté serveur à partir d'une policy validée.

Les AuditLogs ordinaires restent protégés contre les suppressions applicatives normales. Le moteur D-019 devra disposer d'un chemin technique étroit, explicite et testé pour la rétention.

#### C. Rétention des données personnelles

D-019 doit préparer des points d'extension permettant plus tard d'appliquer des policies de conservation/anonymisation/suppression à des données personnelles du produit.

Les durées et règles réelles restent à définir dans D-006 et dans chaque SaaS dérivé selon ses traitements et obligations.

### 5.2 Quota de stockage et corbeille — invariant figé

Tant qu'un fichier est encore présent physiquement dans la corbeille, il continue de consommer le stockage réel.

Invariant :

```text
storage_bytes
= fichiers actifs + fichiers DELETED encore physiquement stockés
```

L'espace n'est libéré qu'après purge physique réussie.

Le frontend ne recalcule jamais ce quota lui-même : le backend reste l'autorité.

Toute UI pertinente affichant le quota doit expliquer cette sémantique avec le composant partagé **déjà existant** :

```text
frontend/src/components/shared/info-tooltip.jsx
```

Il est interdit de créer un second `InfoTooltip`.

Contenu UX attendu, à adapter au contexte :

> Le stockage utilisé inclut les fichiers actifs et les fichiers présents dans la corbeille. L'espace correspondant aux fichiers supprimés est libéré après leur suppression définitive.

### 5.3 Gouvernance Platform de la rétention AuditLog

L'autorisation doit rester pilotée par les permissions effectives D-018, jamais par un simple contrôle de rôle codé en dur.

Permissions cibles figées :

```text
platform:retention:read
→ SENSITIVE
→ consulter configuration, état et exécutions

platform:retention:preview
→ SENSITIVE
→ simuler les effets d'une policy

platform:retention:update
→ RESERVED
→ modifier / activer une policy

platform:retention:execute
→ RESERVED
→ déclencher manuellement une purge destructive
```

Attribution par défaut retenue :

```text
Fondateur / Super administrateur
→ read + preview + update + execute

Administrateur de la Plateforme
→ read + preview
→ pas update
→ pas execute

Support technique
→ aucun droit de rétention par défaut

Support commercial / Support client
→ aucun droit de rétention par défaut

rôle personnalisé
→ éventuellement permissions non-RESERVED selon les règles D-018
→ jamais update / execute
```

Les exécutions planifiées automatiques ne doivent pas usurper un User SuperAdmin. Elles utilisent une identité / origine technique système clairement tracée.

### 5.4 Traçabilité durable de la purge

Une purge d'AuditLogs ne peut pas être tracée uniquement par un AuditLog qui serait lui-même supprimable plus tard.

Le moteur doit disposer d'une trace technique durable indépendante des données purgées, conceptuellement de type :

```text
RetentionExecution / RetentionRun
```

Cette trace doit conserver au minimum :

- policy / version ;
- type de déclenchement (`scheduled`, `manual`, système si nécessaire) ;
- début / fin ;
- cutoff serveur ;
- statut ;
- compteurs ;
- nombre de lots ;
- initiateur lorsque manuel ;
- snapshot sûr de la configuration exécutée ;
- informations de lock / lease nécessaires ;
- code d'erreur exploitable sans secret ni copie du contenu supprimé.

Ne jamais recopier les AuditLogs supprimés dans la trace de purge.

### 5.5 Concurrence, scheduler et sécurité

D-019 doit prévoir :

- traitement borné par lots ;
- idempotence ;
- lock / lease distribué ;
- compatibilité multi-instance ;
- reprise après panne ;
- absence de double exécution dangereuse ;
- indexes adaptés aux sélections d'éligibilité ;
- erreurs fail-closed ;
- tests sécurité, concurrence et non-régression.

Pour les Files, le cas critique est :

```text
worker sélectionne un DELETED arrivé à échéance
↔
restauration concurrente future D-002
```

La prise en charge pour purge devra être atomiquement détectable afin d'empêcher une restauration de faire croire qu'un fichier reste restaurable alors que son contenu physique est déjà en cours de destruction.

### 5.6 Policy configurable : frontière à respecter

Le besoin produit est bien un paramétrage runtime sûr de la rétention AuditLog, mais il ne doit jamais rendre la base librement requêtable depuis l'administration.

Architecture cible à confirmer précisément au début de D-019.2 :

```text
registre code-owned
→ définit les targets autorisées, capacités, bornes et adapters

configuration persistée validée
→ stocke uniquement les réglages autorisés d'une policy
```

Cette approche hybride permet le paramétrage Platform sans exposer de filtre arbitraire.

Le choix exact des champs et du modèle Mongoose doit être confirmé depuis le code courant avant création du modèle.

### 5.7 Navigation Platform — cible UX figée

La navigation Platform doit reprendre les **règles UX déjà validées de la sidebar Workspace/utilisateur**, et non inventer un second comportement.

Règles à réutiliser :

- sidebar globale rétractable ;
- groupes internes ouvrables/repliables ;
- un seul groupe ouvert à la fois ;
- route active → resynchronisation et ouverture du groupe correspondant ;
- simple rerender → ne rouvre pas un groupe volontairement fermé ;
- sidebar réduite → groupe ouvert via flyout ;
- fermeture du flyout après navigation ;
- tooltips en mode réduit ;
- filtrage par accès avant rendu ;
- groupe sans enfant visible → groupe non rendu ;
- backend toujours autorité de sécurité.

Structure cible :

```text
Vue d'ensemble

Gestion clients
└── Utilisateurs
└── Espaces de travail

Offre commerciale
└── Plans
└── Abonnements
└── Dérogations

Équipe Platform
└── Gestion des membres

Sécurité & données
└── Journaux d'audit
└── Rétention & purge
```

Important : `Équipe Platform` possède **un seul enfant de sidebar** : `Gestion des membres`.

Dans cette page unique, conserver les onglets :

```text
Membres | Invitations | Rôles & permissions
```

Ne pas transformer ces onglets en trois entrées de navigation.

La réorganisation de sidebar appartient au lot frontend D-019 et ne doit pas détourner le travail backend-first.

### 5.8 Gate D-019.1 — état

Le cadrage fonctionnel et de sécurité suivant est considéré comme figé pour démarrer l'implémentation :

1. delete File utilisateur = soft-delete ;
2. corbeille temporaire, 30 jours par défaut ;
3. purge physique automatique après échéance ;
4. fichiers en corbeille comptés dans `storage_bytes` jusqu'à purge physique ;
5. `InfoTooltip` partagé existant réutilisé pour expliquer le quota ;
6. D-002 conserve listing/restauration de corbeille et n'est pas ouvert maintenant ;
7. première policy de rétention administrable = AuditLog ;
8. aucun filtre/cutoff Mongo arbitraire fourni par le frontend ;
9. validation Zod stricte ;
10. permissions Platform dédiées `read/preview/update/execute` avec `update/execute` RESERVED ;
11. exécution destructive manuelle réservée aux autorités système protégées disposant de la permission ;
12. scheduler = identité technique, pas faux User SuperAdmin ;
13. trace durable indépendante des AuditLogs purgés ;
14. lots, idempotence, concurrence multi-instance, reprise après panne ;
15. points d'extension futurs pour D-006 sans coder de durée juridique universelle ;
16. frontend Platform traité seulement après sécurisation backend ;
17. sidebar Platform reprend les règles UX de la sidebar Workspace ;
18. `Gestion des membres` reste une seule page à onglets.

Aucun code D-019 n'a été modifié pendant ce cadrage. La présente mise à jour documentaire prépare la prochaine conversation.

---

## 6. D-019 — découpage d'implémentation recommandé

Ne pas développer D-019 comme un seul gros lot.

### D-019.2 — fondations non destructives

Premier mini-lot à ouvrir à la prochaine conversation :

```text
1. relire le code courant concerné
2. vérifier les conventions du registre Platform Permissions
3. ajouter les permissions de rétention et leurs sensibilités
4. figer le contrat code-owned des targets / capabilities de rétention
5. définir puis tester la validation stricte de configuration
6. aucun delete physique dans ce premier mini-lot
```

Avant de créer un modèle `RetentionPolicy`, confirmer précisément l'architecture hybride registre code-owned + configuration persistée et les bornes de configuration.

### D-019.3 — persistence / RetentionExecution

Ensuite seulement :

- modèle de policy persistée si confirmé ;
- modèle de trace d'exécution durable ;
- invariants / indexes ;
- tests modèle / validation.

### D-019.4 — purge File sécurisée

- réexaminer le `filePurge.service.js` actuel ;
- vérifier `FILE_RETENTION_DAYS`, `purgeScheduledAt`, `purgedAt` ;
- conserver le soft-delete utilisateur ;
- sécuriser claim / concurrence / idempotence / quota ;
- ne pas développer la restauration D-002.

### D-019.5 — policy AuditLog

- adapter technique de rétention étroit ;
- preview serveur ;
- exécution par lots ;
- scheduler ;
- lock distribué ;
- RetentionExecution ;
- tests sécurité / concurrence.

### D-019.6 — API Platform

- lecture ;
- preview ;
- modification contrôlée ;
- exécution manuelle ;
- permissions et confirmations ;
- aucune route générique de suppression.

### D-019.7 — frontend Platform

- page `Rétention & purge` ;
- boutons conditionnés aux permissions ;
- réorganisation de la navigation ;
- comportement des groupes identique à la sidebar Workspace ;
- réutilisation `InfoTooltip` pour le quota lorsqu'affiché ;
- composants partagés existants obligatoires.

### D-019.8 — validation et clôture

- tests ciblés ;
- backend global ;
- frontend ciblé/global si concerné ;
- build Vite ;
- gates manuels destructifs contrôlés ;
- documentation canonique ;
- mise à jour `DEBT.md` uniquement lorsque les critères de clôture sont réellement atteints.

---

## 7. D-020 — bloc figé avant D-015

```text
D-020 — Invitation commerciale client et offres privées de découverte
```

D-020 sera traité **après D-019 et avant D-015**.

Séparation obligatoire :

```text
PlatformInvitation
→ collaborateur interne de l'éditeur

CommercialInvitation
→ prospect / futur client utilisateur
```

Une offre privée « Découverte commerciale » peut s'appuyer sur un Plan privé (`isPublic=false`) avec fonctionnalités et limites explicitement choisies.

Ne pas implémenter une règle dynamique « toutes les fonctionnalités sauf IA » : une future capability ne doit pas être accordée automatiquement.

Distinction maintenue :

```text
trial
→ temporaire

accès commercial gratuit durable
→ pas un trial illimité
```

D-020 ne doit pas commencer tant que D-019 n'est pas terminé.

---

## 8. D-015, D-016, audit final et D-017

### D-015

Versionnement / provenance / migrations / release : SemVer, tags, releases, migrations, rollback, variables d'environnement, dépendances système, provenance Core machine-readable et procédure d'upgrade.

D-015 ne commence qu'après D-019 et D-020.

### D-016

Playwright / E2E Core sur les parcours transversaux critiques.

### Audit final

Revue architecture / sécurité / qualité avant dérivation pilote.

### D-017

Exercice pilote obligatoire de clonage + petite extension métier + upgrade depuis `upstream-core`.

Toute faiblesse générique découverte doit revenir dans le Core avant `v1.0.0`.

---

## 9. Stratégie canonique de clonage du vrai SaaS métier

Références :

```text
docs/derived-saas/DERIVED-SAAS.md
docs/derived-saas/EXTENSION-POINTS.md
```

Après release stable :

```bash
git clone <URL_SAAS_CORE_API> <nom-du-produit>
cd <nom-du-produit>

git remote rename origin upstream-core
git remote add origin <URL_NOUVEAU_DEPOT_PRODUIT>

git push -u origin main
```

```text
origin
→ dépôt du SaaS métier

upstream-core
→ dépôt maître saas-core-api
```

Secrets, base de données, environnement et configuration produit restent propres au produit dérivé.

---

## 10. Règles permanentes de développement

### Backend

```text
backend/modules/<domaine>/
├── routes
├── controller
├── service
├── model
├── validation
└── tests
```

- JavaScript uniquement ;
- Zod strict ;
- logique métier dans les services ;
- isolation Workspace ;
- RBAC ;
- entitlement / quotas si nécessaire ;
- audit ;
- transaction lorsque l'invariant l'exige ;
- aucune logique métier lourde dans routes/controllers.

### Frontend

```text
frontend/src/features/<domaine>/
├── api
├── components
├── hooks si nécessaire
├── pages
├── validation / helpers
└── tests
```

Gestion d'état :

```text
useState      → état UI local
Redux Toolkit → état client global
RTK Query     → état serveur
```

Réutilisation obligatoire des composants partagés. Aucun second DataTable, système de drawer générique, confirmation générique, `InfoTooltip`, toast ou stratégie RTK Query parallèle ne doit être créé sans justification architecturale.

---

## 11. Sécurité permanente

Invariant :

```text
ne jamais faire confiance au frontend
ne jamais faire dépendre la sécurité d'un bouton masqué
```

Backend = autorité sur identité, ownership, memberships, permissions, entitlements, quotas, lifecycle, transitions sensibles et purge/rétention.

Validation Zod stricte obligatoire.

`sanitizeFilter` reste activé. Utiliser `mongoose.trusted()` uniquement pour les opérateurs MongoDB construits intentionnellement par le serveur.

Les mutations sensibles doivent rester fail-closed, réautoriser depuis l'état courant lorsque nécessaire et conserver un audit approprié.

---

## 12. Prochaine reprise exacte

La prochaine conversation ne doit **plus refaire le cadrage D-019.1** sauf incohérence démontrée par le code courant.

Ordre :

```text
1. git pull
2. vérifier le HEAD courant
3. lire docs/REPRISE-CURRENT.md
4. lire docs/DEBT.md — D-019
5. inspecter le code réel des permissions Platform, AuditLog, File purge et jobs
6. vérifier que le Gate D-019.1 ne contredit aucun invariant actuel
7. proposer le mini-lot D-019.2 exact
8. commencer uniquement les fondations non destructives après explication
9. écrire les tests ciblés
10. vérifier la cohérence globale avant lot suivant
```

Ne pas commencer D-020, D-015 ou D-002 pendant ce premier lot.

---

## 13. Fichiers prioritaires à la prochaine conversation

```text
docs/REPRISE-CURRENT.md
docs/DEBT.md

backend/constants/platformPermissions.constants.js
backend/config/applicationPlatformPermission.registry.js
backend/modules/platformRole/platformRole.presets.js
backend/modules/platformRole/platformRole.policy.js

backend/modules/auditLog/auditLog.model.js
backend/modules/file/file.model.js
backend/modules/file/filePurge.service.js
backend/jobs/files/purgeDeletedFiles.job.js
backend/config/env.js

frontend/src/features/platform/lib/platform-navigation.js
frontend/src/features/platform/components/platform-sidebar.jsx
frontend/src/features/workspace/components/workspace-sidebar.jsx
frontend/src/components/shared/info-tooltip.jsx
```

Les chemins doivent être revérifiés depuis le HEAD courant avant modification.

---

## 14. Ce qu'il ne faut pas faire

Ne pas :

- rouvrir D-018 sans bug ou besoin nouveau démontré ;
- recommencer le cadrage D-019 depuis zéro ;
- créer une route générique de suppression ;
- exposer un filtre MongoDB ou cutoff arbitraire au frontend ;
- faire dépendre une permission destructive d'un bouton masqué ;
- donner `retention:update` ou `retention:execute` à un rôle personnalisé ;
- supprimer physiquement un File immédiatement lors du delete utilisateur ;
- libérer `storage_bytes` tant que le File supprimé existe encore physiquement ;
- créer un nouveau `InfoTooltip` ;
- transformer Membres / Invitations / Rôles en trois entrées de sidebar Platform ;
- développer D-002 pendant D-019 ;
- coder une durée juridique universelle de rétention des données personnelles ;
- commencer D-020 ou D-015 avant clôture de D-019 ;
- commencer les modules métier réels dans le dépôt Core ;
- déclarer `v1.0.0` avant D-015, D-016, audit final et D-017.

---

## 15. Résumé de reprise en une phrase

D-018 est **VALIDÉ** ; le Gate fonctionnel/sécurité **D-019.1 est désormais figé** — corbeille File soft-delete avec purge physique différée à 30 jours, quota incluant la corbeille, moteur de rétention AuditLog configurable et gouverné par permissions Platform, traçabilité durable et concurrence sécurisée, navigation Platform alignée sur la sidebar Workspace — et la prochaine conversation doit commencer le mini-lot backend non destructif **D-019.2**, sans ouvrir D-002, D-020 ou D-015.