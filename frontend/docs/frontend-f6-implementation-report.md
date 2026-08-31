# SAAS-CORE-API — F6 Onboarding Workspace Free

**Date :** 31 août 2026  
**Lot :** F6  
**Statut :** implémenté sur GitHub — validation locale requise

## Objectif

Implémenter la résolution de contexte Workspace après authentification et permettre à un utilisateur sans workspace de créer son premier espace avec le plan Free immédiatement disponible, sans tunnel commercial bloquant ni trial automatique.

## Invariants backend utilisés

Le frontend s'appuie exclusivement sur les contrats backend existants :

```text
GET  /api/workspaces
POST /api/workspaces
GET  /api/plans
POST /api/invitations/accept
```

La création d'un workspace reçoit uniquement :

```json
{
  "name": "Nom du workspace"
}
```

Le backend crée transactionnellement : workspace, rôles système, membership owner, subscription Free, première consommation de quota membre et AuditLog. Le frontend ne duplique aucune de ces règles métier.

## Résolution post-login

La destination par défaut après Login n'est plus `/` mais `/workspaces`.

```text
/workspaces
↓
GET /api/workspaces
├── 0 workspace → /onboarding/workspace
├── 1 workspace → /workspaces/:workspaceId/dashboard
└── N workspaces → choix explicite
```

Aucune préférence de dernier workspace n'est persistée et aucun `onboardingCompleted` n'est créé.

Le `GuestGuard` redirige également un utilisateur déjà authentifié visitant `/login` ou `/register` vers `/workspaces` afin d'utiliser le même resolver.

## State management

```text
liste des workspaces → RTK Query
catalogue des plans  → RTK Query
workspace courant    → URL / router
formulaire création  → React Hook Form
workspace créé       → useState local de confirmation
résolution 0/1/N     → fonction pure dérivée
```

Aucun nouveau slice Redux n'est introduit.

## RTK Query

`baseApi` déclare :

```text
WorkspaceList
PlanCatalog
```

Nouveaux endpoints frontend :

```text
listWorkspaces
createWorkspace
listPublicPlans
acceptWorkspaceInvitation
```

La création d'un workspace et l'acceptation d'une invitation invalident `WorkspaceList` afin que le nouveau contexte multi-tenant soit reflété immédiatement.

## Création du premier workspace

Route :

```text
/onboarding/workspace
```

Le formulaire demande uniquement :

```text
Nom du workspace
```

Validation alignée backend : trim, 2 à 120 caractères.

Si l'utilisateur possède déjà un workspace, cette route ne maintient pas artificiellement l'utilisateur dans l'onboarding et renvoie vers `/workspaces`.

Après création réussie :

```text
Espace créé
Plan actuel : Free
Aucun trial démarré automatiquement
```

Deux actions sont proposées :

```text
Accéder à mon espace
Comparer les plans
```

La destination produit reste `/workspaces/:workspaceId/dashboard`.

## Comparaison de plans

Route :

```text
/onboarding/plans/:workspaceId
```

Le catalogue utilise `GET /api/plans` et un composant réutilisable `PlanCard`.

L'affichage des montants utilise les unités mineures du backend et `Intl.NumberFormat` afin de respecter la devise.

Cette surface est volontairement en lecture seule en F6. Le contrat public actuel du catalogue n'expose pas les métadonnées de trial ; le frontend n'invente donc ni éligibilité ni CTA de démarrage d'essai.

Free reste toujours utilisable même si le catalogue est temporairement indisponible.

## Invitations ciblées

Le backend génère les liens :

```text
/invitations/accept?token=...
```

Cette route est placée sous `AuthGuard`.

Parcours non authentifié :

```text
lien invitation
→ Login avec state.from
→ connexion réussie
→ retour au lien invitation avec query string conservée
→ acceptation explicite
→ workspace rejoint
→ dashboard
```

Le token est validé côté frontend sur sa forme avant mutation puis envoyé uniquement dans le body de `POST /api/invitations/accept`.

Après acceptation réussie, le query paramètre contenant le token est retiré de l'URL via un remplacement d'historique.

Une invitation invalide/expirée fournit une remédiation : voir les workspaces existants ou créer un espace si aucun n'existe.

## Composants et fichiers principaux

```text
app/layouts/onboarding-layout.jsx
features/workspace/api/workspace-api.js
features/workspace/lib/resolve-workspace-context.js
features/workspace/validation/workspace-schemas.js
features/workspace/pages/workspace-entry-page.jsx
features/workspace/pages/create-workspace-page.jsx
features/workspace/pages/onboarding-plans-page.jsx
features/plan/api/plan-api.js
features/plan/components/plan-card.jsx
features/workspace-invitation/api/workspace-invitation-api.js
features/workspace-invitation/validation/workspace-invitation-schemas.js
features/workspace-invitation/pages/accept-workspace-invitation-page.jsx
utils/format-money.js
```

## Tests F6 ajoutés

Les nouvelles suites couvrent notamment :

- validation du nom Workspace ;
- résolution 0 / 1 / N workspaces ;
- redirection réelle vers onboarding avec 0 workspace ;
- redirection réelle vers le dashboard avec 1 workspace ;
- choix explicite avec plusieurs workspaces ;
- création avec nom trimé ;
- confirmation du plan Free ;
- absence d'appel API sur nom invalide ;
- formatage monétaire depuis les unités mineures ;
- validation du token d'invitation ;
- fallback Login vers `/workspaces` ;
- conservation pathname/search/hash d'une destination protégée.

Le test de devise sans décimales ne dépend pas du caractère précis de groupement fourni par ICU afin de rester portable entre environnements Node.

## Aucun changement de dépendances

F6 n'ajoute aucune dépendance npm.

Après `git pull`, `frontend/package-lock.json` ne doit donc pas être modifié par ce lot.

## Point de contrat restant — SUPER_ADMIN

La politique frontend figée prévoit qu'un `SUPER_ADMIN` sans workspace puisse utiliser Platform sans être obligé de créer un workspace personnel.

Le modèle backend possède `platformRole`, mais les DTO publics Auth actuels (`register`, `login`, `refresh`, `me`) l'excluent explicitement et les tests Auth verrouillent cette frontière publique.

F6 ne modifie donc pas silencieusement ce contrat de sécurité. La résolution automatique du cas `SUPER_ADMIN` reste une dette de contrat à traiter explicitement avec le futur contexte Platform / `PlatformGuard`.

Un accès direct à la branche Platform reste séparé, mais le resolver `/workspaces` d'un utilisateur sans workspace ne peut pas déduire son rôle plateforme avec le contrat public actuel.

## Volontairement exclu de F6

- shell Workspace final ;
- `WorkspaceGuard` métier complet vérifiant réellement membership/contexte côté route ;
- `PermissionGuard` ;
- `PlatformGuard` ;
- résolution automatique du rôle Platform ;
- gestion complète Subscription ;
- démarrage de trial ;
- upgrade/downgrade ;
- changement de plan depuis le catalogue ;
- persistance d'un dernier workspace ;
- pages métier du dashboard.

Ces responsabilités restent dans F7 et les lots Subscription/Platform concernés.

## Validation locale requise

Depuis la racine :

```bash
git pull
```

Puis depuis `frontend/` :

```bash
npm run test
npm run build
npm run dev
```

Aucune installation de nouvelle dépendance n'est nécessaire pour F6.

### Smoke test recommandé — utilisateur sans workspace

1. créer/connecter un utilisateur sans workspace ;
2. vérifier la navigation `Login → /workspaces → /onboarding/workspace` ;
3. créer un workspace avec un nom valide ;
4. vérifier `POST /api/workspaces` → `201` ;
5. vérifier l'écran de confirmation `Plan actuel : Free` ;
6. ouvrir `Comparer les plans` et vérifier `GET /api/plans` → `200` ;
7. revenir avec `Continuer avec Free` ;
8. vérifier `/workspaces/:workspaceId/dashboard`.

### Smoke test recommandé — utilisateur avec workspace

1. se connecter avec un compte possédant un seul workspace ;
2. vérifier que `/workspaces` mène directement à son dashboard ;
3. si plusieurs workspaces sont disponibles, vérifier que le choix explicite est affiché ;
4. vérifier qu'un utilisateur authentifié saisissant `/login` ou `/register` passe par `/workspaces`.

### Invitation

Si un lien d'invitation de test est disponible :

1. ouvrir `/invitations/accept?token=...` hors session ;
2. vérifier le passage par Login ;
3. vérifier le retour sur l'invitation après connexion ;
4. accepter explicitement ;
5. vérifier le dashboard du workspace rejoint ;
6. vérifier que le token a disparu de l'URL après succès.

Puis depuis la racine :

```bash
npm test
git status --short
```

Le résultat attendu de `git status --short` est vide puisque F6 n'ajoute aucune dépendance locale.

## Critères de clôture

F6 pourra passer à `TERMINÉ` lorsque :

- tests frontend verts ;
- build Vite vert ;
- smoke test création Workspace Free validé ;
- résolution 0 / 1 / N validée ;
- comparaison de plans validée ;
- tests backend verts ;
- working tree clean.
