# SAAS-CORE-API — Contrat Platform Admin pour le frontend

**Date d’audit :** 2026-09-02  
**Checkpoint :** F9.0  
**Source de vérité :** code backend courant de `backend/modules/platform/` et tests associés.

## 1. Principe de sécurité

Le routeur racine Platform applique `authenticate` avant les sous-routeurs :

```text
/api/platform
  /users
  /workspaces
  /plans
  /subscriptions
  /audit-logs
```

Chaque domaine applique ensuite `authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN)` à ses routes ou à son sous-routeur.

Le guard frontend Platform reste uniquement une protection UX. L’autorisation réelle appartient au backend.

## 2. Users Platform

Routes réellement exposées :

```text
GET    /api/platform/users
GET    /api/platform/users/:userId
PATCH  /api/platform/users/:userId/disable
PATCH  /api/platform/users/:userId/enable
POST   /api/platform/users/:userId/revoke-sessions
PATCH  /api/platform/users/:userId/role
```

### Liste

Query :

```text
page  entier >= 1, défaut 1
limit entier 1..100, défaut 20
```

Réponse :

```json
{
  "status": "success",
  "data": {
    "users": []
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

La liste expose uniquement les champs d’identité et d’état nécessaires à l’administration. Aucun secret d’authentification n’est exposé.

### Détail

Le détail expose notamment :

```text
id
firstName
lastName
email
status
platformRole
emailVerifiedAt
passwordChangedAt
lastLoginAt
disabledAt
disabledReason
deletionRequestedAt
closedAt
closureReason
createdAt
updatedAt
```

### Désactivation

Body strict :

```json
{
  "disabledReason": "motif de 3 à 500 caractères"
}
```

Invariants :

- uniquement `active -> disabled` ;
- un super-admin ne peut pas désactiver son propre compte ;
- les sessions actives de la cible sont révoquées dans la transaction ;
- l’action est auditée.

### Réactivation

Transition autorisée :

```text
disabled -> active
```

Les champs de désactivation sont nettoyés et l’action est auditée.

### Révocation des sessions

La cible doit exister. Toutes ses sessions sont révoquées avec la raison administrative prévue par le domaine AuthSession.

L’audit de cette opération est actuellement **best effort** : une panne d’écriture de l’AuditLog n’annule pas une révocation de sessions déjà effectuée.

### Rôle plateforme

Body strict :

```json
{
  "platformRole": "user | support | admin | super_admin"
}
```

Invariants :

- aucun changement vers le rôle déjà présent ;
- impossible pour le super-admin courant de rétrograder son propre rôle ;
- impossible de rétrograder le dernier `super_admin` ;
- protection contre une modification concurrente ;
- révocation des sessions de la cible après changement ;
- action auditée.

## 3. Workspaces Platform

Routes réellement exposées :

```text
GET    /api/platform/workspaces
GET    /api/platform/workspaces/:workspaceId
PATCH  /api/platform/workspaces/:workspaceId/suspend
PATCH  /api/platform/workspaces/:workspaceId/reactivate
```

Important : le contrat courant utilise `/reactivate`, et non l’ancienne route documentaire `/restore`.

### Liste

Pagination identique : `page >= 1`, `limit 1..100`.

La liste expose notamment :

```text
id
name
status
statusReason
statusChangedAt
createdBy
createdAt
updatedAt
```

### Détail

Le détail ajoute notamment :

```text
statusReasonDetails
statusChangedBy
updatedBy
```

### Suspension

Body strict :

```text
statusReason        enum backend obligatoire
statusReasonDetails optionnel 3..500
```

`statusReasonDetails` devient obligatoire lorsque `statusReason === other`.

Transition :

```text
active -> suspended
```

La mutation et l’AuditLog sont transactionnels.

### Réactivation

Transition :

```text
suspended -> active
```

Les motifs précédents sont nettoyés et l’action est auditée.

Aucune suppression Platform de workspace n’est exposée dans le contrat courant. Le frontend ne doit pas en inventer.

## 4. Plans Platform

Routes réellement exposées :

```text
GET    /api/platform/plans
POST   /api/platform/plans
PATCH  /api/platform/plans/:planId
PATCH  /api/platform/plans/:planId/archive
```

### Liste

Pagination `page >= 1`, `limit 1..100`.

La liste administrative contient aussi les plans privés, inactifs et archivés.

DTO exposé :

```text
id
key
name
description
status
isPublic
displayOrder
currency
priceMonthlyExclTaxMinor
priceYearlyExclTaxMinor
features
limits
createdBy
updatedBy
createdAt
updatedAt
```

### Création / modification

Principes importants :

- payloads `strictObject` ;
- prix en unités monétaires mineures, entiers positifs ou nuls ;
- devise normalisée en code 3 lettres majuscules ;
- features sans doublons ;
- limites : `null = illimité`, `0 = aucune consommation`, entier positif = plafond ;
- les capabilities sont aussi validées contre le registre métier backend ;
- `key` est immutable après création ;
- l’archivage ne passe jamais par le PATCH générique ;
- un plan archivé n’est plus modifiable ;
- mutations et AuditLogs associés sont transactionnels.

### Archivage

L’archivage positionne :

```text
status = archived
isPublic = false
```

Une seconde tentative d’archivage est refusée.

Le backend ne fournit pas actuellement de `GET /platform/plans/:planId`. Un futur écran doit donc s’appuyer sur le contrat de liste ou faire évoluer le backend avant d’inventer une lecture individuelle.

## 5. Subscriptions Platform

Routes réellement exposées :

```text
GET    /api/platform/subscriptions
POST   /api/platform/subscriptions/grant-trial
GET    /api/platform/subscriptions/:subscriptionId
PATCH  /api/platform/subscriptions/:subscriptionId
PATCH  /api/platform/subscriptions/:subscriptionId/cancel
PATCH  /api/platform/subscriptions/:subscriptionId/resume
```

Important : le contrat courant utilise des PATCH dédiés pour `cancel` et `resume`, et `POST /grant-trial` pour l’attribution administrative d’un trial.

### Grant trial

Body strict :

```json
{
  "workspaceId": "ObjectId",
  "planId": "ObjectId",
  "billingInterval": "monthly | yearly"
}
```

La même opération peut créer un premier trial ou changer le plan d’un trial déjà actif sans réinitialiser son horloge ; la réponse est donc `200`.

### Détail

Le DTO individuel expose explicitement les données Workspace/Plan utiles, cycle de vie, périodicité, prix snapshoté, provider, remises et dérogation administrative.

### PATCH administratif

Champs admis :

```text
plan
billingInterval
discountType
discountValue
discountReason
discountEndsAt
manualOverride
manualOverrideReason
cancelAtPeriodEnd
```

Invariants principaux :

- le plan cible doit être actif ;
- Free impose `billingInterval = none` et prix nul ;
- un plan payant impose monthly/yearly ;
- devise et prix sont snapshotés depuis le Plan lors d’un changement pertinent ;
- une remise en pourcentage doit être comprise entre 1 et 100 ;
- une remise fixe doit être > 0 et ne peut pas dépasser le prix HT ;
- toute remise active nécessite un motif ;
- `manualOverride=true` nécessite un motif ;
- `manualOverrideBy` vient exclusivement de l’acteur authentifié ;
- la mutation est auditée.

### Annulation / reprise

L’annulation administrative délègue les invariants de cycle au domaine Subscription et supporte :

```text
immediate
period_end
```

Un motif est obligatoire.

La reprise retire uniquement une annulation programmée compatible avec les invariants du domaine Subscription.

### Point de vigilance avant l’écran Subscriptions

Le service de liste renvoie actuellement des documents `lean()` avec `workspace` et `plan` peuplés, alors que le détail utilise un DTO explicitement construit. Ce n’est pas bloquant pour F9 Users, mais ce contrat devra être revérifié avant l’implémentation de l’écran Subscriptions afin de ne pas coupler inutilement l’UI à la forme interne Mongoose.

## 6. Audit Logs Platform

Route réellement exposée :

```text
GET /api/platform/audit-logs
```

Filtres validés :

```text
page
limit
workspaceId
actorId
action
entityType
status
from
to
```

`from` et `to` doivent être des ISO datetime avec offset et `from <= to`.

La réponse de liste expose :

```text
id
actor { id, firstName, lastName, email }
workspace { id, name }
action
status
entity { type, id }
createdAt
```

Les IP, user-agent et metadata restent volontairement absents de ce contrat frontend.

## 7. Couverture backend observée

Les cinq domaines Platform disposent de tests ciblés couvrant selon les cas :

- routes et gardes `super_admin` ;
- validation Zod ;
- services de lecture ;
- mutations métier et invariants ;
- cas de conflit/ressource absente ;
- audit des mutations sensibles.

Cet audit confirme qu’aucune modification backend n’est requise pour commencer **F9.1 RTK Query Platform Users** et **F9.2 Users Platform**.

La présence des tests dans le dépôt ne remplace pas leur exécution locale lors de la validation du lot frontend.

## 8. Décisions frontend issues de F9.0

- conserver un seul `baseApi` RTK Query ;
- commencer par Users ;
- ne pas ajouter recherche/filtres Users tant que le backend n’en expose pas ;
- utiliser `DataTable` et `DataPagination` pour la liste ;
- utiliser `EntityDetailsDrawer` pour le détail ;
- utiliser `ConfirmationDialog` pour désactivation, réactivation, révocation des sessions et changement de rôle ;
- succès durable en Toast ;
- erreur de mutation conservée dans la confirmation lorsqu’un retry est possible ;
- masquer les opérations sensibles sur le compte courant comme garde UX, sans considérer ce masquage comme une autorisation ;
- laisser Workspaces, Plans, Subscriptions et Audit Logs en placeholder jusqu’à leurs sous-lots dédiés ;
- ne pas introduire `EntitlementOverride` avant F10.
