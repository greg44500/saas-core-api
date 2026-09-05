# SAAS-CORE-API — Contrat Core canonique

**Statut :** canonique — actif  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** frontière HTTP du Core, sécurité d’accès, multi-tenant, comptes, workspaces, membres, rôles, invitations, fichiers, audit et administration Platform  
**Sources d’autorité :** code et tests du dépôt `main`

---

## 1. Objet

Ce document est le contrat de référence du **Core générique** de `saas-core-api`.

Il remplace progressivement les anciens contrats frontend/backend dispersés. Tant que ces anciens fichiers n’ont pas été explicitement supprimés, ils restent des sources historiques de travail, mais **ils ne prévalent plus sur le présent contrat lorsqu’une règle y est consolidée et vérifiée contre le code courant**.

Le contrat distingue trois niveaux :

```text
CORE-CONTRACT.md
→ contrat transversal du Core et de ses frontières HTTP

COMMERCIAL.md
→ Plans, Subscription, Trial, entitlement, quotas et overrides

CAPABILITIES.md
→ registre des capabilities et extension par les SaaS dérivés
```

Le présent document ne décrit pas les choix de design visuel ni les détails d’implémentation interne de chaque composant frontend.

---

## 2. Hiérarchie d’autorité

En cas de contradiction :

1. code courant et contraintes de base de données ;
2. tests automatisés validés ;
3. présent contrat et contrats canoniques spécialisés ;
4. architecture et sécurité canoniques ;
5. documentation historique ;
6. `REPRISE-CURRENT.md`.

Le frontend n’est jamais une source d’autorité pour l’authentification, l’autorisation, les droits commerciaux, les quotas, la validation finale ou la frontière multi-tenant.

---

## 3. Frontières du Core

Le Core fournit les mécanismes génériques suivants :

```text
User / Account
Auth / AuthSession
Workspace
WorkspaceMember
WorkspaceInvitation
Role / Permissions
Plan
Subscription / TrialEligibility
Entitlement / UsageMetric
EntitlementOverride
Files
AuditLog
Platform Admin
Capability Registry
```

Les modules métier d’un SaaS dérivé consomment ces mécanismes mais ne doivent pas être importés par le Core.

Dépendance attendue :

```text
MODULE MÉTIER
     ↓
    CORE
```

et jamais :

```text
CORE
 ↓
MODULE MÉTIER
```

---

## 4. Conventions HTTP générales

### 4.1 Base API

Les routes applicatives sont exposées sous :

```text
/api
```

Préfixes principaux :

```text
/api/auth
/api/users
/api/plans
/api/workspaces
/api/invitations
/api/platform
/api/health
```

Les ressources tenant-scoped utilisent explicitement `workspaceId` dans leur chemin.

### 4.2 Réponse de succès avec données

Convention générale :

```json
{
  "status": "success",
  "data": {}
}
```

La propriété interne de `data` dépend du domaine : `user`, `workspace`, `workspaces`, `members`, `roles`, `plans`, `subscription`, `files`, etc.

### 4.3 Réponse 204

Une réponse `204 No Content` ne contient aucun JSON. Le frontend ne doit jamais tenter de parser un body après un `204`.

### 4.4 Erreurs opérationnelles

Une erreur contrôlée expose :

```json
{
  "status": "fail",
  "message": "..."
}
```

ou une autre valeur de `status` contrôlée par l’erreur opérationnelle.

Le client doit s’appuyer d’abord sur :

```text
status HTTP
+
contexte de l’endpoint
```

et ne doit pas construire une machine métier en analysant le texte libre de `message`.

### 4.5 Erreurs inattendues

En production, une erreur non opérationnelle retourne :

```json
{
  "status": "error",
  "message": "Une erreur interne est survenue"
}
```

Les détails techniques et stacks ne font pas partie du contrat de production.

### 4.6 Validation des requêtes

Les routes utilisant `validateRequest` valident `body`, `params` et/ou `query` avant le controller. Les couches suivantes consomment les données validées via `req.validated`.

Les schémas de domaine doivent rester stricts lorsque le contrat l’exige. Une propriété HTTP supplémentaire ne doit jamais être utilisée pour piloter implicitement un champ interne sensible.

---

## 5. Authentification et sessions

Préfixe :

```text
/api/auth
```

### 5.1 Endpoints actuels

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/logout-all
POST /api/auth/change-password
GET  /api/auth/me
```

### 5.2 Access token / refresh token

Le Core sépare :

```text
access token
→ retourné au client
→ utilisé avec Authorization: Bearer <token>

refresh token
→ cookie HttpOnly
→ non accessible au JavaScript du frontend
```

Le frontend ne doit jamais chercher à lire, stocker ou reconstruire le refresh token.

### 5.3 Refresh

`POST /api/auth/refresh` n’utilise pas `authenticate`, car l’access token peut précisément être expiré.

Le frontend doit centraliser le mécanisme de réauthentification et coordonner les requêtes concurrentes afin d’éviter plusieurs rotations simultanées du même refresh token.

### 5.4 Logout

`POST /api/auth/logout` utilise le refresh cookie et reste exploitable même lorsque l’access token est expiré.

`POST /api/auth/logout-all` nécessite une authentification valide et révoque toutes les sessions de l’utilisateur.

### 5.5 Changement et réinitialisation du mot de passe

Après changement ou reset réussi du mot de passe, les sessions existantes sont invalidées conformément au backend.

Le frontend doit considérer la session courante comme terminée lorsque le workflow serveur le confirme.

### 5.6 Anti-énumération

Le workflow `forgot-password` conserve une réponse qui ne doit pas permettre au client de révéler si un compte existe.

---

## 6. Compte utilisateur global

Le compte utilisateur est global et n’appartient à aucun Workspace particulier.

### 6.1 Lecture

```text
GET /api/auth/me
```

### 6.2 Modification du profil

```text
PATCH /api/users/me
```

La route actuelle permet uniquement la modification des champs de profil autorisés par le schéma de validation.

Le client ne peut pas piloter par cette route :

```text
email
platformRole
status
champs internes d’authentification
```

Le changement d’email nécessite un futur workflow dédié avec vérification de la nouvelle adresse.

### 6.3 Fermeture de compte

Le Core n’expose pas encore de route publique complète de fermeture de compte.

Ce sujet reste suivi dans `docs/DEBT.md` et ne doit pas être simulé côté frontend.

---

## 7. Frontière multi-tenant Workspace

Un `User` peut appartenir à plusieurs Workspaces.

Le frontend ne doit donc jamais considérer le premier Workspace retourné comme une identité globale ou supposer qu’un utilisateur ne possède qu’un seul tenant.

Pour toute ressource tenant-scoped :

```text
workspaceId
→ sélectionne le tenant

membership actif + permissions
→ autorisent l’action utilisateur

entitlement effectif
→ détermine les capacités commerciales disponibles
```

Un identifiant MongoDB n’est jamais une preuve d’autorisation.

Les requêtes sensibles qui utilisent un identifiant de ressource doivent vérifier que cette ressource appartient au Workspace courant.

---

## 8. Workspaces

### 8.1 Endpoints

```text
POST  /api/workspaces
GET   /api/workspaces
GET   /api/workspaces/:workspaceId
PATCH /api/workspaces/:workspaceId
```

### 8.2 Création

La création est authentifiée. Le backend reste l’autorité pour l’initialisation du Workspace, de son owner, de ses rôles système et de sa baseline commerciale.

Le frontend ne doit jamais créer manuellement les documents internes associés.

### 8.3 Lecture et modification

La lecture unitaire passe par le contexte Workspace et la permission `workspace:read`.

La modification passe par `workspace:update` et le contrôle du mode d’accès du Workspace.

Une mutation ordinaire peut être refusée lorsque le Workspace est dans un état nécessitant une remédiation.

---

## 9. Membres et gestion d’équipe

### 9.1 Listing

```text
GET /api/workspaces/:workspaceId/members
```

La lecture nécessite `member:read` et la capability commerciale `team_management`.

La pagination serveur utilise les conventions communes `page` / `limit`.

### 9.2 Mutations

```text
PATCH  /api/workspaces/:workspaceId/members/:memberId/role
POST   /api/workspaces/:workspaceId/members/:memberId/suspend
DELETE /api/workspaces/:workspaceId/members/:memberId
```

Permissions :

```text
member:update
member:suspend
member:remove
```

Ces actions nécessitent également `team_management`.

Le changement de rôle passe en plus par le contrôle de délégation afin d’empêcher une élévation de privilèges indirecte.

La suppression d’un membre est autorisée pendant une remédiation lorsqu’elle constitue une action corrective, mais elle ne contourne pas la permission ni la capability commerciale.

### 9.3 Owner

Le owner n’est pas administré comme un membre ordinaire pour les opérations sensibles qui possèdent un workflow métier dédié.

---

## 10. Invitations

### 10.1 Gestion dans le Workspace

```text
POST   /api/workspaces/:workspaceId/invitations
GET    /api/workspaces/:workspaceId/invitations
POST   /api/workspaces/:workspaceId/invitations/:invitationId/resend
DELETE /api/workspaces/:workspaceId/invitations/:invitationId
```

Ces routes nécessitent :

```text
member:invite
+
team_management
```

La création passe également par le contrôle de délégation du rôle cible.

### 10.2 Acceptation

```text
POST /api/invitations/accept
```

Cette route est authentifiée mais ne charge volontairement pas un contexte Workspace existant : l’utilisateur n’est précisément pas encore membre du Workspace au moment de l’acceptation.

Le service doit revalider dans sa transaction les conditions nécessaires avant de créer ou réactiver le membership.

Le token brut d’invitation ne doit jamais être exposé dans les listes administratives.

---

## 11. Rôles et permissions Workspace

Préfixe :

```text
/api/workspaces/:workspaceId/roles
```

Endpoints :

```text
GET    /
POST   /
PATCH  /:roleId
DELETE /:roleId
```

Permissions :

```text
role:read
role:create
role:update
role:delete
```

Toutes ces routes nécessitent la capability `team_management`.

Les mutations nécessitent également un mode d’accès autorisant les modifications.

### 11.1 Rôles système

Les rôles système sont protégés. Les commandes génériques ne doivent pas permettre de transformer un rôle système en rôle personnalisé ni de contourner les invariants d’ownership.

### 11.2 Anti-escalade

Une permission attribuable à un rôle personnalisé doit appartenir au registre actif et respecter les règles de délégation du Core.

Un rôle personnalisé ne doit jamais servir de moyen indirect pour obtenir une permission réservée à une gouvernance dédiée.

### 11.3 Soft delete

La suppression d’un rôle personnalisé est logique afin de préserver les références historiques et l’audit.

---

## 12. Transfert d’ownership

Endpoint :

```text
PATCH /api/workspaces/:workspaceId/ownership
```

Permission dédiée :

```text
workspace:ownership:transfer
```

Ce workflow est distinct de la mutation générique d’un membership.

Le backend exige les données de confirmation prévues par son schéma, dont le mot de passe courant, afin de renforcer cette opération sensible.

Le transfert d’ownership ne doit pas être reconstitué côté frontend comme une simple succession de changements de rôles.

---

## 13. Fichiers

Préfixe :

```text
/api/workspaces/:workspaceId/files
```

Endpoints :

```text
GET    /
GET    /:fileId
GET    /:fileId/download
POST   /
DELETE /:fileId
```

### 13.1 Lectures

Les lectures nécessitent `file:read`.

Elles restent possibles en remédiation et **ne dépendent pas de `file_upload`** : un plan qui interdit de nouveaux dépôts ne doit pas masquer les fichiers actifs déjà détenus par le Workspace.

### 13.2 Upload

L’upload nécessite simultanément :

```text
authentification
contexte Workspace
permission file:upload
mode d’accès autorisant la mutation
capability file_upload
pipeline de validation/sécurité fichier
quotas applicables
```

La validation et les contrôles serveur restent l’autorité. Masquer un bouton Upload côté frontend n’est jamais un contrôle de sécurité suffisant.

### 13.3 Suppression

La suppression logique nécessite `file:delete`.

Elle peut être autorisée pendant une remédiation car elle peut réduire la consommation. La suppression logique ne signifie pas purge physique immédiate.

### 13.4 Restauration

Aucune route de restauration n’est actuellement exposée. La corbeille/restauration reste suivie comme dette distincte dans `DEBT.md`.

---

## 14. AuditLog Workspace

Endpoint de consultation :

```text
GET /api/workspaces/:workspaceId/audit-logs
```

La consultation nécessite :

```text
audit:read
+
audit_logs
```

`audit_logs` est une capability commerciale de consultation.

La **production** des traces AuditLog nécessaires à la sécurité et à la traçabilité reste un invariant du Core et ne doit pas être désactivée parce qu’un plan n’autorise pas leur consultation.

---

## 15. Contrat commercial et entitlement

Les détails normatifs sont consolidés dans :

```text
docs/contracts/COMMERCIAL.md
```

Règle transversale :

```text
RBAC
→ l’utilisateur peut-il effectuer l’action ?

Entitlement
→ le Workspace possède-t-il commercialement la capability ?
```

Ces deux contrôles sont distincts et peuvent être nécessaires simultanément.

Le frontend ne doit jamais calculer seul l’entitlement effectif à partir du nom, du prix ou de la clé interne d’un Plan.

---

## 16. Capability Registry

Le contrat du registre applicatif est consolidé dans :

```text
docs/contracts/CAPABILITIES.md
```

Règle transversale : une capability existe parce que le logiciel sait réellement l’exécuter. Elle n’est jamais créée par une saisie libre dans l’administration Platform.

---

## 17. Administration Platform

Préfixe :

```text
/api/platform
```

Le routeur Platform racine exige l’authentification.

La politique Core V1 attribue toutes les permissions Platform au seul `super_admin`. Les rôles Platform `admin`, `support` et `user` n’en reçoivent aucune par défaut.

Certaines routes utilisent déjà les permissions granulaires Platform ; d’autres restent encore protégées directement par `super_admin`. Cette coexistence ne doit pas être interprétée comme un élargissement d’accès.

### 17.1 Overview

```text
GET /api/platform/overview
```

Permission :

```text
platform:overview:read
```

Le cockpit est analytique. Il ne devient jamais une autorité transactionnelle.

### 17.2 Users

```text
GET    /api/platform/users
GET    /api/platform/users/:userId
PATCH  /api/platform/users/:userId/disable
PATCH  /api/platform/users/:userId/enable
POST   /api/platform/users/:userId/revoke-sessions
PATCH  /api/platform/users/:userId/role
```

Politique effective actuelle : `super_admin` uniquement.

### 17.3 Workspaces

```text
GET    /api/platform/workspaces
GET    /api/platform/workspaces/:workspaceId
PATCH  /api/platform/workspaces/:workspaceId/suspend
PATCH  /api/platform/workspaces/:workspaceId/reactivate
```

Politique effective actuelle : `super_admin` uniquement.

### 17.4 Plans

```text
GET    /api/platform/plans/capabilities
GET    /api/platform/plans
POST   /api/platform/plans
PATCH  /api/platform/plans/:planId
PATCH  /api/platform/plans/:planId/archive
```

Permissions granulaires :

```text
platform:capabilities:read
platform:plans:read
platform:plans:create
platform:plans:update
platform:plans:archive
```

### 17.5 Subscriptions

```text
GET    /api/platform/subscriptions
POST   /api/platform/subscriptions/grant-trial
GET    /api/platform/subscriptions/:subscriptionId
PATCH  /api/platform/subscriptions/:subscriptionId
PATCH  /api/platform/subscriptions/:subscriptionId/cancel
PATCH  /api/platform/subscriptions/:subscriptionId/resume
```

Politique effective actuelle : `super_admin` uniquement.

### 17.6 Entitlement Overrides

```text
GET    /api/platform/entitlement-overrides
GET    /api/platform/entitlement-overrides/workspaces/:workspaceId/context
GET    /api/platform/entitlement-overrides/:overrideId
POST   /api/platform/entitlement-overrides
PATCH  /api/platform/entitlement-overrides/:overrideId
PATCH  /api/platform/entitlement-overrides/:overrideId/revoke
```

Permissions granulaires :

```text
platform:entitlement_overrides:read
platform:entitlement_overrides:create
platform:entitlement_overrides:update
platform:entitlement_overrides:revoke
```

### 17.7 Audit Logs Platform

```text
GET /api/platform/audit-logs
```

Politique effective actuelle : `super_admin` uniquement.

---

## 18. Sécurité : ordre conceptuel des contrôles

Selon le domaine, une mutation tenant-scoped peut nécessiter :

```text
authentification
→ validation stricte
→ chargement du contexte Workspace
→ permission RBAC
→ mode d’accès Workspace
→ capability / entitlement
→ quota
→ service métier
→ contraintes base de données / transaction
→ AuditLog
```

Tous les maillons ne sont pas présents sur toutes les routes, mais aucune couche frontend ne remplace les contrôles nécessaires côté backend.

Le document `docs/security/SECURITY.md` détaillera ces mécanismes lors du lot documentaire sécurité.

---

## 19. Responsabilités frontend

Le frontend doit :

- consommer les données serveur via RTK Query ;
- conserver `useState` pour l’état local strictement UI ;
- ne pas dupliquer une ressource serveur dans Redux Toolkit classique ;
- masquer ou désactiver les actions manifestement indisponibles pour améliorer l’UX ;
- accepter qu’une mutation soit malgré tout refusée par le serveur si l’état a changé ;
- invalider/refetch les données serveur après les mutations concernées ;
- ne jamais utiliser une route cachée, un composant masqué ou une permission calculée localement comme barrière de sécurité.

Les règles de composants réutilisables, DataTable, Drawer, formulaires, toasts et navigation seront consolidées dans `docs/frontend/FRONTEND-GUIDELINES.md`.

---

## 20. Hors périmètre actuel du contrat Core

Ne sont pas encore des contrats Core complets :

```text
fermeture autonome complète du compte
changement d’email avec vérification
corbeille/restauration File
MFA / passkeys / SSO
Billing / Payment réel
facturation / TVA / remboursements
observabilité technique de production
API keys / webhooks génériques
modules métier des SaaS dérivés
```

Les sujets actifs sont suivis dans `docs/DEBT.md` lorsque nécessaire.

---

## 21. Documents historiques absorbés progressivement

Ce contrat absorbe les règles encore valides de plusieurs documents existants, notamment :

```text
frontend-backend-integration-contract.md
frontend-backend-account-security-contract.md
frontend-backend-roles-permissions-contract.md
frontend-platform-admin-contract.md
```

Les détails commerciaux sont absorbés par `COMMERCIAL.md` et les règles de registre par `CAPABILITIES.md`.

Aucun de ces anciens fichiers ne doit être supprimé avant validation explicite du lot de nettoyage correspondant.

---

## 22. Règle de maintenance

Toute évolution qui modifie une surface HTTP observable, une règle d’autorisation, une frontière tenant, un DTO public ou un invariant transversal doit vérifier dans le même lot si ce contrat doit être mis à jour.

Une synthèse de reprise ou un rapport de milestone ne doit jamais devenir le lieu où une nouvelle règle contractuelle est figée durablement.
