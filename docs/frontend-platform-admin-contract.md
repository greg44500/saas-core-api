# SAAS-CORE-API — Contrat Platform Admin pour le frontend

**Date de consolidation :** 2026-09-03  
**Checkpoint :** F9.5 validé  
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

Les trois références d’acteur du détail (`createdBy`, `updatedBy`, `statusChangedBy`) sont enrichies sous forme de DTO minimal :

```text
{
  id,
  firstName,
  lastName,
  email
}
```

Règles de sécurité associées :

- résolution via une seule requête `User.find` bornée sur les trois identifiants ;
- projection explicite `_id firstName lastName email` ;
- aucun statut utilisateur, rôle Platform, email canonique ou champ d’authentification n’est exposé ;
- l’opérateur interne `$in` est construit par le backend et marqué `mongoose.trusted()` afin de conserver `sanitizeFilter` global ;
- si un User historique n’est plus résoluble, l’identifiant est conservé et les champs d’identité deviennent `null` au lieu de provoquer une erreur 500.

Le frontend affiche le nom et l’email lorsqu’ils existent. Les identifiants techniques restent présents dans le DTO mais ne sont pas affichés dans le Drawer courant.

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
GET    /api/platform/plans/capabilities
GET    /api/platform/plans
POST   /api/platform/plans
PATCH  /api/platform/plans/:planId
PATCH  /api/platform/plans/:planId/archive
```

### Registre de capabilities

`GET /api/platform/plans/capabilities` expose la source de vérité backend utilisée par le formulaire administratif.

Réponse utile :

```text
features: string[]
metrics: [{ key, definition }]
```

Le frontend ne doit pas maintenir une seconde liste métier de features ou de métriques. Les libellés de présentation peuvent avoir des correspondances connues avec fallback pour les futures clés.

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
trialEnabled
trialDurationDays
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
- la création impose une configuration complète de toutes les métriques du registre ;
- lorsqu’un objet `limits` est validé, toute métrique du registre absente constitue une configuration de plan incomplète ;
- les capabilities sont validées contre le registre métier backend ;
- `trialEnabled=true` impose un `trialDurationDays` entier positif ;
- `trialEnabled=false` impose `trialDurationDays=null` ;
- en mise à jour, toute modification de la configuration trial envoie atomiquement les deux champs ;
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

Le backend ne fournit pas actuellement de `GET /platform/plans/:planId`. L’écran Platform Plans s’appuie donc sur le DTO complet de liste et ne fabrique pas une lecture individuelle inexistante.

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

### Liste administrative

La liste a été normalisée avant raccordement frontend et ne renvoie plus directement la forme Mongoose issue de `lean()` / `populate()`.

DTO de liste :

```text
id
workspace { id, name }
plan { id, key, name }
kind
status
currentPeriodStart
currentPeriodEnd
trialEndsAt
cancelAtPeriodEnd
billingInterval
currency
priceExclTaxMinor
manualOverride
createdAt
updatedAt
```

La requête backend utilise une projection racine explicite et des `populate()` minimaux. Les identifiants provider, motifs détaillés et autres champs administratifs ne peuvent donc pas fuiter accidentellement dans la liste si le modèle évolue.

### Grant trial administratif

Body strict :

```json
{
  "workspaceId": "ObjectId",
  "planId": "ObjectId",
  "billingInterval": "monthly | yearly"
}
```

La même opération peut créer un premier trial ou changer le plan d’un trial déjà actif sans réinitialiser son horloge ; la réponse est donc `200`.

Cette route constitue un levier administratif distinct du trial normal déclenché par le parcours commercial utilisateur. Elle ne contourne pas les invariants backend d’éligibilité.

### Détail

Le DTO individuel est construit explicitement et expose notamment :

```text
id
workspace { id, name }
plan { id, key, name, status }
kind
status
currentPeriodStart
currentPeriodEnd
trialEndsAt
cancelAtPeriodEnd
billingInterval
currency
priceExclTaxMinor
provider
providerCustomerId
providerSubscriptionId
discountType
discountValue
discountReason
discountEndsAt
manualOverride
manualOverrideReason
manualOverrideBy { id, firstName, lastName, email }
scheduledChange {
  type,
  targetPlan { id, key, name },
  targetBillingInterval,
  targetCurrency,
  targetPriceExclTaxMinor,
  effectiveAt,
  requestedAt,
  requestedBy { id, firstName, lastName, email }
}
createdBy
updatedBy
createdAt
updatedAt
```

Les références utilisateur résolues utilisent des projections minimales. Le frontend affiche les informations administratives utiles et n’expose pas de secrets d’authentification.

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
- `discountEndsAt` peut borner une remise temporaire ;
- lorsque le frontend supprime une remise, valeur, motif et date de fin repartent à leur état neutre ;
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

### Règle frontend après mutation

Les réponses des mutations `update`, `cancel`, `resume` et `grant-trial` sont volontairement traitées comme des accusés de succès partiels et non comme la source complète d’état de l’écran.

Le frontend invalide les tags RTK Query concernés et relit ensuite la liste/le détail. Le DTO de détail reste la source complète après mutation.

### Composants frontend validés

F9.5 réutilise :

```text
DataTable
DataPagination
EntityDetailsDrawer
ConfirmationDialog
DatePicker
ToastProvider
```

Aucune table, pagination, modale de confirmation ou primitive date spécifique à Subscriptions n’a été recréée.

## 6. Audit Logs Platform

Route réellement exposée :

```text
GET /api/platform/audit-logs
```

Filtres validés au checkpoint F9.0 :

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

F9.6 doit réauditer ce contrat courant avant toute UI afin de vérifier qu’aucune évolution backend intervenue depuis F9.0 ne modifie les filtres, la projection ou la sécurité.

## 7. Couverture backend observée et validée

Les domaines Platform disposent de tests ciblés couvrant selon les cas :

- routes et gardes `super_admin` ;
- validation Zod ;
- services de lecture ;
- mutations métier et invariants ;
- cas de conflit/ressource absente ;
- audit des mutations sensibles ;
- registre de capabilities Plans ;
- cohérence trial et complétude des métriques ;
- résolution minimale et sécurisée des acteurs Workspace ;
- projection explicite des listes/détails Subscriptions ;
- grant trial, modification, annulation et reprise des Subscriptions.

Les tests backend ciblés F9.5, les tests frontend ciblés, la régression frontend globale et le build Vite ont été signalés verts le 2026-09-03.

## 8. Décisions frontend figées à l’issue de F9.5

- conserver un seul `baseApi` RTK Query ;
- utiliser `DataTable` et `DataPagination` pour les listes Platform compatibles ;
- utiliser `EntityDetailsDrawer` pour les détails ;
- utiliser `ConfirmationDialog` pour les actions bloquantes ;
- réutiliser `DatePicker` pour toute date compatible ;
- succès durable en Toast ;
- erreur de mutation conservée dans la confirmation lorsqu’un retry est possible ;
- masquer une action reste une garde UX et ne remplace jamais l’autorisation backend ;
- Users, Workspaces, Plans et Subscriptions sont désormais raccordés à leurs contrats réels ;
- les Plans utilisent le registre backend pour construire features et limites ;
- aucune restauration de plan archivé n’est inventée ;
- les Subscriptions invalident/refetchent après mutation au lieu de reconstruire leur état depuis les DTO partiels ;
- Audit Logs reste à traiter dans F9.6 ;
- ne pas introduire `EntitlementOverride` avant F10.

## 9. État F9 au 2026-09-03

```text
F9.0  Audit contrat backend Platform      TERMINÉ
F9.1  RTK Query Platform                  TERMINÉ
F9.2  Users Platform                      TERMINÉ
F9.3  Workspaces Platform                 TERMINÉ
F9.4  Plans Platform                      TERMINÉ
F9.5  Subscriptions Platform              TERMINÉ
F9.6  Audit Logs Platform                 EN COURS
```
