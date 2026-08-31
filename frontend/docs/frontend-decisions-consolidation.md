# SAAS-CORE-API — Consolidation des décisions Frontend actives

**Statut :** registre de consolidation  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1

## 1. Rôle

Ce document indique les décisions frontend actuellement actives lorsque plusieurs documents de cadrage ont évolué à des moments différents.

En cas d’ancienne mention encore présente dans un document vivant, la décision normative la plus récente référencée ici prévaut jusqu’à la prochaine consolidation globale.

## 2. Références normatives actives

```text
frontend-architecture-security-principles.md
frontend-state-management-policy.md
frontend-design-system-components-policy.md
frontend-performance-loading-policy.md
frontend-ux-experience-policy.md
frontend-routing-navigation-policy.md
```

Le document `frontend-cadrage-ux-ui.md` reste le journal vivant des questions et arbitrages. Les politiques normatives ci-dessus fixent les règles déjà validées.

## 3. Décisions UX/UI figées

### Utilisateur de référence

Utilisateur métier non nécessairement technique. L’interface reste professionnelle, claire, accessible et adaptable aux futurs SaaS métier.

### Densité

Densité professionnelle intermédiaire par défaut. Les interfaces Platform peuvent être plus denses lorsque le pilotage le justifie.

### Responsive

Desktop, tablette et mobile sont dans le périmètre fonctionnel. Les composants complexes doivent disposer d’un comportement responsive dédié.

### Navigation

Interfaces authentifiées :

```text
sidebar gauche rétractable
+ topbar
+ contexte utilisateur
+ accès profil
+ déconnexion rapidement accessible
```

Sidebar ouverte : icônes + libellés.  
Sidebar rétractée : icônes conservées avec identification accessible.

### Modales

Les modales sont utilisées pour les interactions courtes, contextuelles ou sensibles. Les parcours longs ou complexes utilisent une page ou un wizard approprié.

## 4. Palette et thème

Palette de marque :

```text
#137C8B
#709CA7
#B8CBD0
#7A90A4
#344D59
```

Répartition de référence :

```text
primary     → #137C8B
secondary   → #709CA7
muted       → #B8CBD0
accent      → #7A90A4
brand-dark  → #344D59
```

Cette répartition est une base de tokenisation et non une autorisation à utiliser directement les codes hexadécimaux dans les composants métier.

Le dark mode est obligatoire.

Les états fonctionnels restent indépendants de la palette de marque :

```text
success
warning
info
destructive
invalid
disabled
critical / urgent seulement si besoin métier réel
```

Les variantes exactes light/dark et les valeurs fonctionnelles devront être validées par contraste avant implémentation finale.

Référence détaillée : `frontend-design-system-components-policy.md`.

## 5. Réutilisation UI

La réutilisation des composants est une exigence structurante.

Une même intention visuelle doit utiliser la même famille de composants.

Exemple critique : les tableaux Workspace, Platform et futurs modules métier doivent partir d’une base `DataTable`/primitives partagées commune plutôt que de réimplémenter chacun pagination, densité, états, actions et responsive.

Les différences métier sont obtenues par composition et configuration explicite, sans créer un composant universel sur-paramétré.

Référence détaillée : `frontend-design-system-components-policy.md`.

## 6. State management

Politique active :

```text
server state        → RTK Query
navigation state    → URL / router
form state          → outil de formulaire dédié
local UI state      → useState / useReducer
global client state → Redux Toolkit seulement si justifié
derived state       → calculé depuis la source
browser persistence → interdite par défaut
```

TanStack Query n’est pas utilisé parallèlement à RTK Query.

Référence détaillée : `frontend-state-management-policy.md`.

## 7. Routing, layouts et navigation

Décisions actives :

```text
router              → React Router
server state        → RTK Query, pas loaders router concurrents
workspace context   → /workspaces/:workspaceId/*
platform context    → /platform/*
account context     → /account/*
```

Layouts distincts :

```text
PublicLayout
AuthLayout
WorkspaceLayout
PlatformLayout
```

Navigation Workspace : sidebar gauche rétractable structurée par zones fonctionnelles, workspace switcher en partie haute, topbar sobre et contextuelle.

Navigation Platform : contexte distinct mais composants de structure réutilisés avec une configuration Platform dédiée.

Menu utilisateur : profil et sécurité accessibles depuis l’avatar/pastille ; logout rapidement accessible ; logout-all réservé à la zone sécurité/session.

Guards séparés :

```text
Authentication Guard
Workspace Guard
Permission Guard
Platform Guard
```

Traitement :

```text
401 → refresh/session puis login si nécessaire
403 → Forbidden contextualisé
404 → NotFound ou ressource masquée selon réponse backend
```

Après login, priorité à l’URL protégée initialement demandée lorsqu’elle reste autorisée. Un SUPER_ADMIN n’est pas redirigé automatiquement vers Platform uniquement en raison de son rôle.

Lazy loading des routes Auth, Workspace et Platform par défaut, avec `PageLoader` partagé.

Référence détaillée : `frontend-routing-navigation-policy.md`.

## 8. Performance et chargement

Décisions actives :

```text
route-level code splitting → React lazy / Suspense
chargement de route        → PageLoader dédié
chargement structurant     → Skeleton
mutation locale            → feedback local
large datasets             → pagination/recherche/tri/filtres serveur
server state               → RTK Query
infinite loading           → uniquement si l’UX le justifie
virtualisation             → uniquement si le volume rendu le nécessite
```

Une forte volumétrie de données ne doit jamais conduire à charger tout le dataset dans le navigateur par défaut.

Référence détaillée : `frontend-performance-loading-policy.md`.

## 9. Expérience utilisateur contextuelle

Le Core doit proposer une expérience plus qualitative qu’une simple interface CRUD lorsque les données disponibles permettent une contextualisation fiable.

Exemples retenus :

```text
message de bienvenue lors d’une première expérience identifiable
message « ravi de vous revoir » après une absence significative
empty states guidés
remédiations en cas de quota/permission/entitlement
feedback clair après actions
progressive disclosure
```

Le seuil d’environ trois jours pour un message de retour est une intention UX à centraliser/configurer lors de l’implémentation.

Cette fonctionnalité ne doit être implémentée que si le backend fournit une donnée fiable permettant de connaître la dernière activité/connexion. Le frontend ne doit pas inventer cette information.

Référence détaillée : `frontend-ux-experience-policy.md`.

## 10. Règle pour les futures reprises

Avant toute implémentation frontend :

1. consulter le cadrage UX/UI ;
2. consulter les politiques normatives concernées ;
3. vérifier la checklist ;
4. vérifier le contrat backend/frontend ;
5. ne pas réintroduire une ancienne option remplacée par une décision normative plus récente.

Les politiques spécifiques ont priorité sur les anciennes formulations non encore consolidées dans les documents vivants.