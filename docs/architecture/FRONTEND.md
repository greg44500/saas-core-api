# SAAS-CORE-API — Architecture frontend

**Statut :** document canonique d’architecture frontend  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** frontend React / Vite du Core et futures applications dérivées

## 1. Objet

Ce document définit l’architecture structurelle du frontend `saas-core-api`.

Il décrit :

```text
responsabilités des dossiers
sens des dépendances
routing et contextes
state management
frontière avec l’API
réutilisabilité des composants
tests
extension par les futurs modules métier
```

Les règles détaillées de design system, UX, formulaires, feedbacks, accessibilité et composants seront consolidées dans `docs/frontend/FRONTEND-GUIDELINES.md` au lot DOC-5.

---

## 2. Stack actuelle

Le `frontend/package.json` courant constitue l’autorité sur les versions installées.

```text
React 19
React DOM 19
Vite 8
JavaScript uniquement
Tailwind CSS 4
Redux Toolkit
RTK Query
React Redux
React Router 8
React Hook Form
Zod
Lucide React
Vitest
React Testing Library
user-event
```

Les composants shadcn/ui sont intégrés comme code de design system adapté au projet ; ils ne constituent pas nécessairement une dépendance npm unique.

TypeScript n’est pas utilisé.

Playwright fait partie de la stratégie E2E cible, mais n’est pas présenté comme installé tant qu’il n’apparaît pas réellement dans le package courant.

---

## 3. Arborescence actuelle

```text
frontend/src/
├── App.jsx
├── app/
├── components/
│   ├── data-display/
│   ├── forms/
│   ├── shared/
│   └── ui/
├── features/
├── hooks/
├── lib/
├── pages/
├── services/
│   └── api/
├── store/
├── test/
├── utils/
└── main.jsx
```

Cette structure est organisée **par responsabilité**, puis **par fonctionnalité**.

Les nouveaux dossiers ne doivent pas être créés par convention théorique s’ils restent vides ou sans besoin réel.

---

## 4. `app/`

`frontend/src/app/` contient la composition globale de l’application.

Responsabilités actuelles :

```text
providers globaux
routing
layouts applicatifs
navigation transverse
```

Exemples :

```text
app/providers.jsx
app/router.jsx
app/layouts/
app/workspace-navigation.js
```

`app/` ne doit pas devenir un dossier métier.

Une règle spécifique à Files, Subscription, Platform Plans ou un futur module métier doit vivre dans la feature correspondante lorsque possible.

---

## 5. Contextes de routing

Le routing actuel distingue clairement plusieurs espaces.

### Public

```text
/
/login
/register
/forgot-password
/reset-password
```

### Account

```text
/account/profile
/account/security
```

Le contexte Account appartient à la personne, pas au Workspace.

### Onboarding

```text
/onboarding/workspace
/onboarding/plans/:workspaceId
```

### Workspace

```text
/workspaces/:workspaceId/dashboard
/workspaces/:workspaceId/members
/workspaces/:workspaceId/roles
/workspaces/:workspaceId/files
/workspaces/:workspaceId/subscription
/workspaces/:workspaceId/activity
/workspaces/:workspaceId/settings
```

### Platform

```text
/platform/overview
/platform/users
/platform/workspaces
/platform/plans
/platform/subscriptions
/platform/entitlement-overrides
/platform/audit-logs
```

Ces contextes doivent rester distincts dans les layouts, guards et navigations.

---

## 6. Guards

Le frontend possède des guards de navigation :

```text
GuestGuard
AuthGuard
WorkspaceGuard
PlatformGuard
```

Ils améliorent l’expérience utilisateur et empêchent les navigations manifestement incohérentes.

Ils ne constituent jamais une barrière de sécurité suffisante.

L’autorisation finale reste appliquée par le backend.

Un futur guard basé sur une permission ou une capability doit suivre la même règle :

```text
frontend guard
→ UX

backend middleware / service
→ sécurité réelle
```

---

## 7. Lazy loading

Les routes fonctionnelles importantes sont chargées via `lazy`.

Objectifs :

```text
réduire le bundle initial
isoler les zones applicatives
éviter de charger Platform pour un utilisateur Workspace ordinaire
préparer l’ajout futur de modules métier
```

`PageLoader` sert de fallback partagé.

Le lazy loading est une optimisation de chargement ; il ne doit pas être utilisé comme mécanisme d’autorisation.

---

## 8. `features/`

`frontend/src/features/` contient les domaines fonctionnels.

Exemples actuels :

```text
account
auth
audit-log
files
plan
platform
subscription
workspace
workspace-invitation
workspace-members
workspace-roles
```

Une future application dérivée ajoute ses domaines de la même manière :

```text
features/courses/
features/products/
features/suppliers/
features/projects/
```

selon son métier réel.

Le Core ne doit pas importer une feature métier inexistante dans le socle générique.

---

## 9. Responsabilités d’une feature

Une feature peut contenir selon ses besoins :

```text
components/
pages/
api/
hooks/
helpers/
store/
validation/
tests colocated
```

Il ne faut pas imposer tous ces dossiers à chaque feature.

La règle est de garder ensemble les éléments fortement liés au domaine tout en extrayant les abstractions réellement transverses vers `components/`, `hooks/`, `lib/` ou `utils/`.

Une feature ne doit pas copier un composant partagé simplement pour modifier quelques labels ou colonnes.

---

## 10. `components/ui/`

`components/ui/` contient les briques de base du design system.

Analogie :

```text
components/ui
→ briques Lego de base
```

Ces composants doivent être :

```text
génériques
accessibles
visuellement cohérents
sans connaissance d’un domaine métier
```

Une primitive UI ne doit pas importer une feature Platform, Subscription ou métier.

---

## 11. `components/shared/`

`components/shared/` contient des assemblages transverses réutilisables dans plusieurs domaines.

Exemples actuels :

```text
ConfirmationDialog
EntityDetailsDrawer
FeatureToggle
DashboardSection
InfoTooltip
ActionIconButton
```

Analogie :

```text
components/shared
→ assemblages Lego réutilisables dans plusieurs pièces
```

Avant de créer un nouveau drawer, dialog, panneau d’information ou pattern transversal, une feature doit vérifier si un composant partagé existe déjà.

---

## 12. `components/data-display/`

Ce dossier contient les primitives transverses d’affichage de données.

Exemples actuels :

```text
DataTable
DataPagination
MetricCard
CollapsibleCard
ComparisonBarChart
DistributionBarChart
FileTypeIcon
```

La règle de maintenance est stricte :

```text
un besoin de tableau compatible
→ DataTable partagé
```

Il est interdit de recréer un système de tableau indépendant dans chaque feature lorsque `DataTable` couvre le besoin ou peut être étendu proprement.

Même principe pour la pagination.

Les primitives data-display ne doivent pas connaître RTK Query, Platform ou un domaine métier : elles reçoivent des données déjà préparées.

---

## 13. `components/forms/`

`components/forms/` est réservé aux composants de formulaire réutilisables entre plusieurs domaines.

Un formulaire propre à une seule feature reste dans :

```text
features/<feature>/components/
```

La promotion vers `components/forms/` doit être motivée par une vraie réutilisation ou un contrat transversal stable.

---

## 14. State management — règle générale

Le frontend utilise plusieurs outils parce qu’ils répondent à des problèmes différents.

### `useState` / `useReducer`

Pour l’état local :

```text
ouverture d’un drawer
onglet local
brouillon de filtre
sélection temporaire
état visuel non partagé
```

### Redux Toolkit

Pour un véritable état global client.

L’état Auth en mémoire est un exemple légitime car le token d’accès et le cycle de session doivent être connus par l’infrastructure API.

### RTK Query

Pour les données serveur :

```text
user courant
workspaces
members
roles
plans
subscriptions
files
audit logs
Platform resources
entitlements
```

### URL / Router

Pour un état qui doit être partageable, navigable ou restaurable :

```text
pagination
filtres
période d’analyse
route sélectionnée
identifiant de contexte
```

### React Hook Form

Pour l’état des formulaires.

Les valeurs des formulaires ne doivent pas être poussées dans Redux sans besoin global démontré.

---

## 15. Principe anti-duplication de state

Une donnée ne doit pas avoir plusieurs sources de vérité concurrentes.

Interdit :

```text
RTK Query contient workspace
+
slice Redux contient une copie workspace
+
state local contient une troisième copie persistante
```

Attendu :

```text
RTK Query
→ source serveur

state local
→ uniquement état UI dérivé ou temporaire
```

L’état dérivé doit être recalculé depuis sa source plutôt que synchronisé via des `useEffect` inutiles.

---

## 16. Store global actuel

Le store actuel contient :

```text
auth slice
baseApi reducer
baseApi middleware
session listener middleware
```

Lorsque la session se termine, le cache RTK Query est réinitialisé afin d’éviter qu’un second compte connecté dans le même onglet voie brièvement les données multi-tenant du compte précédent.

Cette responsabilité appartient à l’infrastructure globale du store et ne doit pas être réimplémentée dans chaque page de logout.

---

## 17. API et RTK Query

Le frontend possède un `baseApi` commun et une base query centralisée.

La base URL actuelle est :

```text
/api
```

Les headers Bearer utilisent l’access token conservé en mémoire dans le state Auth.

Le refresh token reste dans le cookie HttpOnly et n’est pas lu par JavaScript.

Toutes les requêtes utilisent `credentials: include` afin que le navigateur envoie le cookie lorsque nécessaire.

---

## 18. Reauth centralisée

`baseQueryWithReauth` centralise le traitement des `401` récupérables.

Flux :

```text
requête protégée
→ 401
→ verrou mutex
→ POST /auth/refresh
→ nouvel access token
→ retry unique
```

Le mutex évite plusieurs rotations concurrentes lorsqu’un ensemble de requêtes reçoit simultanément un `401`.

Une seconde réponse `401` après retry ne doit pas déclencher une boucle infinie de refresh.

Les endpoints qui produisent naturellement un `401` sans reauth doivent pouvoir utiliser `skipReauth`.

---

## 19. Séparation server state / client state

Une feature doit se poser les questions suivantes avant d’ajouter un slice Redux :

```text
La donnée vient-elle du serveur ?
→ RTK Query

Doit-elle être partageable dans l’URL ?
→ Router / search params

Est-elle locale au composant ?
→ useState

Est-elle un formulaire ?
→ React Hook Form

Reste-t-il réellement un état global client ?
→ Redux Toolkit
```

Redux n’est pas le stockage par défaut de toute donnée importante.

---

## 20. Pages et composants

Une page doit principalement :

```text
résoudre le contexte de route
appeler ou composer la feature
orchestrer les grands états de page
assembler les composants
```

Elle ne doit pas contenir :

```text
logique métier complexe
longues transformations de données
client HTTP direct
règles d’autorisation serveur reproduites
énorme formulaire non extrait
système de tableau spécifique
```

Lorsque le code devient difficile à lire ou tester, extraire la responsabilité au bon niveau plutôt que fragmenter arbitrairement par nombre de lignes.

---

## 21. Navigation et capabilities

Une capability absente de l’entitlement effectif ne doit pas polluer l’interface avec des écrans inutiles simplement marqués « indisponibles » lorsque la bonne UX est de ne pas présenter la fonctionnalité.

Principe :

```text
capability non disponible
→ navigation / widget / action métier absente lorsque pertinent

capability disponible mais action interdite par RBAC
→ UI adaptée à la permission
```

Le frontend consomme les droits effectifs fournis par le backend ; il ne les reconstruit pas à partir du nom du Plan.

Le masquage UI reste une décision UX et ne remplace pas la sécurité backend.

---

## 22. Workspace vs Platform

Le frontend doit maintenir une séparation claire :

```text
Workspace
→ gestion d’un tenant

Platform
→ administration globale de l’instance
```

Une feature Platform ne doit pas être utilisée pour donner à un admin Workspace un pouvoir commercial global.

Les composants génériques peuvent être partagés entre les deux contextes, mais les autorisations et données restent distinctes.

Exemple : le même `DataTable` peut afficher des Users Platform ou des Members Workspace sans fusionner leurs règles métier.

---

## 23. Réutilisation par composition

La réutilisation ne signifie pas créer un composant universel avec des dizaines de props.

Attendu :

```text
primitive générique
+
composition de feature
+
configuration locale
```

Exemple :

```text
DataTable générique
+
colonnes WorkspaceMembers
+
actions autorisées par la feature
```

plutôt que :

```text
WorkspaceMembersTable entièrement indépendant
PlatformUsersTable entièrement indépendant
ProductsTable entièrement indépendant
```

si ces composants reproduisent la même mécanique de table.

---

## 24. Helpers, hooks et utils

### `hooks/`

Hooks transverses réutilisables par plusieurs features.

### `lib/`

Abstractions techniques ou intégrations génériques.

### `utils/`

Fonctions utilitaires pures et partagées.

Une règle métier fortement liée à une feature ne doit pas être déplacée dans `utils/` uniquement pour raccourcir un fichier.

Elle doit rester au plus près du domaine.

---

## 25. Validation frontend

La validation frontend améliore l’UX.

Elle doit rester cohérente avec le contrat backend sans prétendre remplacer Zod côté API.

Stack retenue :

```text
React Hook Form
+
Zod frontend
+
resolver
```

Un champ purement visuel comme `confirmPassword` peut rester frontend uniquement et ne doit pas être envoyé artificiellement au backend.

Les règles réellement sensibles restent revalidées côté serveur.

---

## 26. Tests frontend

Les tests actuels sont majoritairement colocated :

```text
component.jsx
component.test.jsx

helper.js
helper.test.js
```

Stack :

```text
Vitest
React Testing Library
user-event
```

La stratégie cible reste hybride :

```text
unit/component
→ près du code

cross-feature integration
→ dossier dédié lorsque le besoin apparaît

E2E critique
→ Playwright lorsque la couche E2E sera installée
```

Les tests doivent privilégier les sélecteurs accessibles et le comportement visible par l’utilisateur.

Ils ne doivent pas figer les détails internes React sans nécessité.

---

## 27. Tests et composants partagés

Un composant partagé critique doit être testé directement.

Les features qui le consomment doivent ensuite tester leur propre configuration métier sans recopier toute la suite de tests du composant générique.

Exemple :

```text
DataTable.test.jsx
→ comportement générique du tableau

platform-users-page.test.jsx
→ colonnes/actions/données Users
```

Cela réduit les tests redondants tout en conservant une couverture métier réelle.

---

## 28. Extension par un SaaS dérivé

Un futur domaine doit idéalement suivre :

```text
frontend/src/features/<domaine>/
├── api/
├── components/
├── pages/
├── hooks/
├── helpers/
└── tests colocated
```

selon les besoins réellement présents.

Le module :

```text
consomme baseApi
réutilise les composants partagés
ajoute ses routes
branche ses capabilities
respecte Workspace / Platform selon son scope
```

Il ne doit pas dupliquer la session Auth, le store global, le système de table ou les layouts Core pour fonctionner.

---

## 29. Frontière Core / métier frontend

Core :

```text
auth
account
workspace
members
roles
subscription
files génériques
audit
platform
composants transverses
infrastructure API/store/router
```

Application dérivée :

```text
features métier
pages métier
composants métier
API métier
capabilities métier
permissions métier
```

Une évolution métier ne doit pas exiger l’ajout d’un `if productType === ...` dans les composants génériques du Core.

Si cela devient nécessaire de manière répétée, la frontière d’extension doit être revue.

---

## 30. Anti-patterns interdits

```text
API fetch/axios dispersée dans les composants
copie de server state dans Redux classique
gros composant mélangeant API, formulaire, tableau et navigation
nouveau tableau sans vérifier DataTable
nouveau drawer sans vérifier les composants shared
permission calculée depuis un nom de rôle
entitlement calculé depuis un nom de Plan
secret dans localStorage
refresh token accessible à JavaScript
feature métier importée dans une primitive UI
useEffect utilisé pour maintenir deux copies du même état
page contenant toute la logique métier d’une feature
```

---

## 31. Critère de qualité d’une feature

Une feature frontend est cohérente lorsqu’un développeur peut identifier rapidement :

```text
quelle route l’affiche
quelle API fournit ses données
quel state est serveur/local/global/navigation
quels composants partagés sont réutilisés
quelles permissions/capabilities pilotent l’UX
quels composants sont réellement métier
quels tests protègent le comportement
```

Si la réponse est dispersée entre plusieurs pages sans convention claire, la feature doit être revue.

---

## 32. Documents liés

```text
docs/architecture/ARCHITECTURE.md
docs/architecture/BACKEND.md
docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md
docs/frontend/FRONTEND-GUIDELINES.md
docs/security/SECURITY.md
```
