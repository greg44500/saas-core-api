# SAAS-CORE-API — Contrat Platform Admin pour le frontend

**Date de consolidation :** 2026-09-03  
**Checkpoint :** F9.0 à F9.6 validés ; Capability Registry validé ; backend F10.4 EntitlementOverride validé  
**Source de vérité :** code backend courant de `backend/modules/platform/`, registre applicatif de capabilities et tests associés.

## 1. Principe de sécurité

Le routeur racine Platform applique `authenticate` avant les sous-routeurs :

```text
/api/platform
  /users
  /workspaces
  /plans
  /subscriptions
  /entitlement-overrides
  /audit-logs
```

Le frontend Platform ne constitue jamais une barrière de sécurité. Les guards et actions masquées sont uniquement des protections UX ; l'autorisation réelle appartient au backend.

Le Core possède un registre distinct de permissions Platform. La politique active n'élargit aucun accès :

```text
super_admin → toutes les permissions Platform
admin       → aucune permission Platform par défaut
support     → aucune permission Platform par défaut
user        → aucune permission Platform par défaut
```

Les routes Plans et EntitlementOverride utilisent des permissions Platform granulaires. Les autres domaines déjà sécurisés peuvent conserver leur garde `SUPER_ADMIN` tant que leur migration vers une permission spécifique n'est pas nécessaire au lot courant. Cette coexistence ne change pas la politique d'accès effective.

Les permissions prévues par le registre couvrent notamment :

```text
platform:capabilities:read
platform:plans:read
platform:plans:create
platform:plans:update
platform:plans:archive
platform:subscriptions:read
platform:subscriptions:update
platform:entitlement_overrides:read
platform:entitlement_overrides:create
platform:entitlement_overrides:update
platform:entitlement_overrides:revoke
platform:users:read
platform:users:update
platform:workspaces:read
platform:workspaces:update
platform:audit_logs:read
```

Il n'existe volontairement aucune permission permettant de créer ou modifier une capability technique depuis Platform.

Référence : `docs/application-capability-registry-contract.md`.

## 2. Users Platform

Routes exposées :

```text
GET    /api/platform/users
GET    /api/platform/users/:userId
PATCH  /api/platform/users/:userId/disable
PATCH  /api/platform/users/:userId/enable
POST   /api/platform/users/:userId/revoke-sessions
PATCH  /api/platform/users/:userId/role
```

La liste est paginée avec `page >= 1` et `limit 1..100`.

Le détail expose uniquement les informations administratives nécessaires : identité, statut, rôle Platform et dates de cycle de compte. Aucun secret d'authentification n'est exposé.

Invariants importants :

- un super-admin ne peut pas désactiver son propre compte ;
- le dernier `super_admin` ne peut pas être rétrogradé ;
- les changements de rôle sensibles révoquent les sessions de la cible ;
- les mutations sensibles sont auditées selon le contrat backend courant.

## 3. Workspaces Platform

Routes exposées :

```text
GET    /api/platform/workspaces
GET    /api/platform/workspaces/:workspaceId
PATCH  /api/platform/workspaces/:workspaceId/suspend
PATCH  /api/platform/workspaces/:workspaceId/reactivate
```

Le contrat utilise `/reactivate`, pas `/restore`.

Le détail enrichit les références d'acteur via un DTO minimal :

```text
{
  id,
  firstName,
  lastName,
  email
}
```

La résolution backend utilise une projection minimale. Les IDs historiques restent conservés lorsqu'un User n'est plus résoluble, sans provoquer de 500.

La suspension nécessite un motif structuré. `statusReasonDetails` devient obligatoire lorsque le motif vaut `other`.

Aucune suppression Platform de Workspace n'est exposée dans le contrat courant.

## 4. Plans Platform

Routes exposées :

```text
GET    /api/platform/plans/capabilities
GET    /api/platform/plans
POST   /api/platform/plans
PATCH  /api/platform/plans/:planId
PATCH  /api/platform/plans/:planId/archive
```

### 4.1 Permissions

Les routes utilisent les permissions suivantes :

```text
GET capabilities   → platform:capabilities:read
GET plans          → platform:plans:read
POST plan          → platform:plans:create
PATCH plan         → platform:plans:update
PATCH archive      → platform:plans:archive
```

Le rôle `super_admin` possède actuellement ces permissions. Les autres rôles Platform n'en héritent pas par défaut.

### 4.2 Registre applicatif de capabilities

`GET /api/platform/plans/capabilities` expose le registre actif :

```text
backend/config/applicationCapability.registry.js
```

Réponse utile :

```text
features: string[]
featureDefinitions: [
  {
    key,
    label,
    description,
    category,
    categoryLabel,
    displayOrder,
    tags
  }
]
metrics: [
  {
    key,
    definition,
    presentation
  }
]
```

Les clés techniques historiques restent présentes pour compatibilité. Les métadonnées permettent au frontend de construire une interface data-driven.

Le frontend ne maintient aucune seconde liste métier de features ou de métriques.

Une application dérivée peut enregistrer une nouvelle capability métier ; si elle appartient au registre actif, elle apparaît automatiquement dans le formulaire Platform sans ajout de checkbox spécifique.

Les features sont regroupées par `category/categoryLabel`. Un fallback de présentation existe pour une capability valide sans métadonnées riches.

### 4.3 Création / modification

Principes :

- payloads stricts ;
- prix stockés en unités monétaires mineures ;
- devise en code 3 lettres majuscules ;
- features sans doublons ;
- capabilities validées contre le registre actif de l'application ;
- aucune clé arbitraire envoyée par HTTP ne peut créer une capability ;
- création avec configuration complète des métriques attendues ;
- `null = illimité`, `0 = aucune consommation`, entier positif = plafond ;
- `trialEnabled=true` impose une durée positive ;
- `trialEnabled=false` impose `trialDurationDays=null` ;
- `key` immutable après création ;
- un Plan archivé n'est plus modifiable ;
- l'archivage positionne `status=archived` et `isPublic=false`.

Le backend ne fournit pas actuellement de `GET /platform/plans/:planId`. L'écran Platform Plans utilise le DTO complet de la liste.

## 5. Subscriptions Platform

Routes exposées :

```text
GET    /api/platform/subscriptions
POST   /api/platform/subscriptions/grant-trial
GET    /api/platform/subscriptions/:subscriptionId
PATCH  /api/platform/subscriptions/:subscriptionId
PATCH  /api/platform/subscriptions/:subscriptionId/cancel
PATCH  /api/platform/subscriptions/:subscriptionId/resume
```

Le DTO de liste est explicite et ne renvoie pas une forme Mongoose brute.

Le détail expose les informations administratives nécessaires au cycle commercial : Workspace, Plan, kind, status, périodes, trial, périodicité, snapshots tarifaires, remise, manual override, changement programmé et acteurs minimaux.

Le grant trial administratif reste distinct du parcours normal utilisateur et ne contourne jamais les règles d'éligibilité du backend.

Le PATCH administratif peut gérer le Plan, la périodicité, la remise, le manual override et l'annulation programmée selon les invariants du domaine Subscription.

Après chaque mutation, le frontend invalide/refetch les données RTK Query. Un DTO partiel de mutation n'est jamais utilisé comme source durable d'état.

Composants partagés réutilisés :

```text
DataTable
DataPagination
EntityDetailsDrawer
ConfirmationDialog
DatePicker
ToastProvider
```

## 6. Entitlement Overrides Platform — F10.4 backend validé

Routes exposées :

```text
GET    /api/platform/entitlement-overrides
GET    /api/platform/entitlement-overrides/:overrideId
POST   /api/platform/entitlement-overrides
PATCH  /api/platform/entitlement-overrides/:overrideId
PATCH  /api/platform/entitlement-overrides/:overrideId/revoke
```

Permissions :

```text
GET collection/detail → platform:entitlement_overrides:read
POST                   → platform:entitlement_overrides:create
PATCH update           → platform:entitlement_overrides:update
PATCH revoke           → platform:entitlement_overrides:revoke
```

La politique Core V1 les attribue uniquement à `super_admin`.

### 6.1 Cibles et valeurs

Un override cible exactement une capability :

```text
feature → featureKey + featureEnabled:boolean
limit   → metricKey + limitValue:(entier >= 0 | null)
```

`null` signifie illimité. Le `targetType`, `featureKey` et `metricKey` sont immuables après création.

Les capabilities sont validées contre `ACTIVE_PLAN_CAPABILITY_REGISTRY`. Platform ne peut donc pas inventer une feature ou une métrique non implémentée par l'application.

Sources autorisées :

```text
promotion
commercial_gesture
support
contract
incident
administrative
```

Un motif `reason` est obligatoire à la création. `trial` n'est pas une source d'override : les essais restent un mécanisme Subscription.

### 6.2 Lifecycle

Le lifecycle est dérivé à la lecture :

```text
scheduled
active
expired
revoked
```

Il n'est pas persisté, afin qu'une expiration temporelle ne nécessite aucun job de synchronisation.

Intervalle actif :

```text
startsAt <= now < endsAt
```

avec `endsAt = null` pour une durée indéterminée.

Un override expiré ou révoqué devient historique et n'est plus modifiable. Une nouvelle exception doit être créée au lieu de réécrire l'histoire commerciale.

Les chevauchements ne sont pas rejetés en V1. Le resolver possède une priorité déterministe ; une interdiction transactionnelle forte des overlaps nécessiterait un mécanisme de sérialisation distinct et ne doit pas être simulée par un `check-then-insert` fragile.

### 6.3 Audit et sécurité

Création, modification et révocation sont auditées dans la même transaction MongoDB que la mutation :

```text
ENTITLEMENT_OVERRIDE_CREATED
ENTITLEMENT_OVERRIDE_UPDATED
ENTITLEMENT_OVERRIDE_REVOKED
```

avec :

```text
entityType = EntitlementOverride
```

Un échec d'AuditLog fait échouer la transaction de mutation.

Le DTO Platform peut exposer la justification commerciale et les acteurs nécessaires à l'administration. Ces informations ne doivent jamais être copiées telles quelles dans le contrat Workspace de F10.5.

### 6.4 Lecture et filtres

La liste est paginée avec `page` et `limit` et accepte les filtres :

```text
workspaceId
targetType
source
```

Le DTO enrichit les références Workspace et acteurs nécessaires à l'administration sans exposer un document Mongoose brut.

## 7. Audit Logs Platform — F9.6 validé

Route :

```text
GET /api/platform/audit-logs
```

Le contrat backend a été réaudité avant raccordement frontend. La route est read-only, protégée côté Platform et sa query est strictement validée.

Filtres backend disponibles :

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

`from` et `to` sont des ISO datetime avec offset et respectent `from <= to`.

DTO frontend :

```text
id
actor { id, firstName, lastName, email }
workspace { id, name }
action
status
entity { type, id }
createdAt
```

IP, user-agent et metadata ne sont pas exposés.

L'UI F9.6 propose actuellement :

```text
Action
Ressource
Statut
Période
```

Les filtres `actorId` et `workspaceId` sont volontairement différés côté UI tant qu'un lookup scalable et sécurisé n'est pas disponible. Le backend conserve leur support contractuel.

La page réutilise `DataTable`, `DataPagination` et `DatePicker`. L'état des filtres et de la pagination est conservé dans l'URL via le helper Audit Logs partagé.

Les tests ciblés, la régression frontend globale et le build Vite ont été signalés verts le 2026-09-03.

## 8. Capability Registry — règle frontend figée

Le frontend Platform consomme uniquement le catalogue renvoyé par le backend.

Flux :

```text
modules installés dans l'application dérivée
→ ACTIVE_PLAN_CAPABILITY_REGISTRY
→ GET /platform/plans/capabilities
→ RTK Query
→ regroupement de présentation
→ PlatformPlanForm
```

Le `SUPER_ADMIN` sélectionne des capabilities existantes. Il ne saisit jamais une clé de feature libre.

La sélection locale du formulaire utilise de l'état local ; les données du catalogue serveur restent dans RTK Query.

Les catégories servent à organiser l'interface, pas à accorder des droits.

## 9. Composants et maintenabilité

Les listes Platform compatibles réutilisent les composants transverses existants :

```text
DataTable
DataPagination
EntityDetailsDrawer
ConfirmationDialog
DatePicker
ToastProvider
```

Aucun domaine Platform ne doit recréer son propre tableau ou sa propre pagination lorsque le contrat est compatible.

Le frontend conserve un seul `baseApi` RTK Query.

## 10. État validé

```text
F9.0  Audit contrat backend Platform             TERMINÉ
F9.1  RTK Query Platform                         TERMINÉ
F9.2  Users Platform                             TERMINÉ
F9.3  Workspaces Platform                        TERMINÉ
F9.4  Plans Platform                             TERMINÉ
F9.5  Subscriptions Platform                     TERMINÉ
F9.6  Audit Logs Platform                        TERMINÉ
GEN-CAP Registre applicatif + UI dynamique       TERMINÉ
F10.4  API backend EntitlementOverride           TERMINÉ
```

F10.4 a été validé par tests ciblés puis régression backend globale le 2026-09-03 : 211 fichiers de tests / 990 tests verts.

## 11. Suite

F10.5 expose au Workspace uniquement les capabilities réellement applicables, sans informations commerciales internes d'override.

F10.6 pourra ensuite implémenter l'administration frontend Platform des dérogations en s'appuyant sur le contrat F10.4 désormais stabilisé.
