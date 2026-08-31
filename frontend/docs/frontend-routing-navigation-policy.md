# SAAS-CORE-API — Politique de routing, navigation et layouts Frontend

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1 et futurs modules métier

## 1. Objectif

Ce document fixe les décisions structurantes relatives au routing, aux layouts, aux guards et à la navigation du frontend.

L’objectif est d’obtenir une navigation :

- prévisible ;
- accessible ;
- compatible multi-workspaces ;
- cohérente avec la séparation Workspace / Platform ;
- compatible avec la politique de state management ;
- compatible avec le lazy loading ;
- réutilisable dans les futurs modules métier.

## 2. Router

React Router est retenu pour le routing de la SPA Vite.

Le router gère :

- routes ;
- navigation ;
- paramètres URL ;
- redirections ;
- routes protégées ;
- lazy loading des routes ;
- états de navigation liés à l’URL.

RTK Query reste la couche de référence pour le server state et les appels API. Les loaders de router ne doivent pas devenir une seconde stratégie concurrente de récupération de données métier.

## 3. Structure principale des routes

Structure cible :

```text
/
├── public / auth
│   ├── /
│   ├── /login
│   ├── /register
│   ├── /forgot-password
│   └── /reset-password/:token
│
├── account
│   └── /account/*
│       ├── profile
│       └── security
│
├── workspace
│   └── /workspaces/:workspaceId/*
│       ├── dashboard
│       ├── members
│       ├── invitations
│       ├── roles
│       ├── files
│       ├── subscription
│       ├── audit
│       └── settings
│
└── platform
    └── /platform/*
        ├── overview
        ├── users
        ├── workspaces
        ├── plans
        ├── subscriptions
        └── audit
```

Les segments exacts pourront être ajustés si le contrat backend ou l’UX détaillée le justifie, sans remettre en cause les frontières Public / Account / Workspace / Platform.

## 4. Workspace courant

Le `workspaceId` explicite dans l’URL est la source de vérité du contexte de navigation Workspace.

Exemple :

```text
/workspaces/:workspaceId/members
```

Le workspace lui-même reste une donnée serveur gérée par RTK Query.

Une éventuelle préférence « dernier workspace utilisé » peut servir de confort de redirection, mais ne doit jamais entrer en compétition avec un `workspaceId` présent dans l’URL.

## 5. Layouts

Quatre responsabilités de layout sont distinguées :

```text
PublicLayout
AuthLayout
WorkspaceLayout
PlatformLayout
```

### PublicLayout

Pour les éventuelles pages publiques générales.

### AuthLayout

Pour les parcours login, register, forgot/reset password et autres écrans d’authentification. Il reste volontairement léger et ne reprend pas la navigation applicative principale.

### WorkspaceLayout

Contient la structure authentifiée métier :

```text
sidebar
+ topbar
+ contexte workspace
+ contenu de route
```

### PlatformLayout

Contient la structure de pilotage Platform :

```text
sidebar configurée Platform
+ topbar
+ contexte Platform
+ contenu de route
```

Workspace et Platform doivent être clairement différenciés dans le routing et le contexte, tout en réutilisant les mêmes composants de structure lorsque leur intention UI est identique.

Un unique composant monolithique `AppLayout` contenant de multiples branches conditionnelles par contexte doit être évité.

## 6. Sidebar Workspace

La sidebar Workspace est structurée par zones fonctionnelles.

Exemple de référence :

```text
[marque]
[workspace switcher]

PRINCIPAL
Dashboard

COLLABORATION
Members
Invitations
Roles

CONTENU
Files

GESTION
Subscription
Audit
Settings

[collapse]
```

Les groupes et entrées exacts dépendent du contrat et des permissions réelles.

Règles :

- état ouvert : icônes + libellés ;
- état rétracté : icônes visibles ;
- les destinations restent identifiables par tooltip/label accessible ;
- l’état actif ne repose pas uniquement sur la couleur ;
- les entrées non pertinentes peuvent être masquées selon permissions, entitlements ou contexte ;
- le backend reste l’autorité finale d’accès.

## 7. Workspace switcher

Le switcher est situé dans la partie haute de la sidebar Workspace.

Comportements cibles :

```text
1 workspace
→ affichage du workspace courant sans interaction inutile

plusieurs workspaces
→ sélection explicite
→ recherche si la volumétrie le justifie

0 workspace
→ état guidé dédié
```

Changer de workspace provoque une navigation vers l’URL du nouveau workspace.

Exemple :

```text
/workspaces/ABC/dashboard
→ switch
/workspaces/XYZ/dashboard
```

Le switcher ne doit pas modifier uniquement une valeur Redux cachée.

## 8. Topbar

La topbar authentifiée reste sobre et contextuelle.

Structure conceptuelle :

```text
breadcrumb / titre
+ actions globales pertinentes
+ contrôle de thème si retenu ici
+ zone utilisateur
```

Elle ne doit pas dupliquer inutilement la navigation déjà présente dans la sidebar.

## 9. Menu utilisateur

L’avatar ou la pastille utilisateur ouvre un menu cohérent et constant.

Contenu cible :

```text
identité utilisateur
email si pertinent
────────────
Mon profil
Sécurité
Apparence / thème si ce choix est retenu
────────────
Se déconnecter
```

`logout` reste rapidement accessible.

`logout-all` n’est pas une action de navigation quotidienne et doit être placé dans une zone de sécurité/session appropriée, par exemple :

```text
Account
→ Security
→ Sessions
→ Déconnecter toutes les sessions
```

## 10. Navigation Platform

La console Platform possède une navigation distincte de l’espace Workspace mais réutilise les mêmes composants de structure lorsque possible.

Architecture cible :

```text
PlatformLayout
├── AppSidebar configurée Platform
└── AppTopbar
```

Navigation minimale :

```text
Overview

MANAGEMENT
Users
Workspaces

COMMERCIAL
Plans
Subscriptions

SYSTEM
Audit Logs
```

Les regroupements pourront évoluer mais les sections ne doivent apparaître que si elles correspondent au périmètre réellement exposé.

Ne pas créer des composants structurels parallèles tels que `WorkspaceSidebar`, `PlatformSidebar` et futurs sidebars visuellement divergents si une base commune configurable suffit.

## 11. Guards

Les responsabilités de protection sont séparées :

```text
Authentication Guard
→ utilisateur authentifié ?

Workspace Guard
→ accès au workspace ?

Permission Guard
→ droit UI/fonctionnel requis ?

Platform Guard
→ rôle/capacité SUPER_ADMIN ?
```

Les guards frontend améliorent l’UX et empêchent une navigation incohérente, mais ne remplacent jamais l’autorisation backend.

Une route protégée ne doit pas reposer uniquement sur le masquage d’un bouton ou une condition dans le rendu du composant cible.

## 12. 401 / 403 / 404

Le frontend distingue :

```text
401
→ session absente ou expirée
→ stratégie refresh si applicable
→ login si refresh impossible

403
→ utilisateur authentifié mais action/route interdite
→ état Forbidden contextualisé

404
→ route ou ressource non trouvée
→ état NotFound
```

Si le backend choisit de masquer une ressource derrière un `404` plutôt qu’un `403`, le frontend respecte la réponse backend et ne tente pas de reclassifier la sécurité.

## 13. Redirection après login

La redirection est déterministe.

Priorité :

```text
1. une URL protégée initialement demandée et toujours autorisée
2. sinon contexte workspace pertinent si disponible
3. plusieurs workspaces sans choix pertinent → sélection workspace
4. aucun workspace → état guidé/onboarding selon capacités backend
```

Le frontend ne redirige pas automatiquement un SUPER_ADMIN vers `/platform` uniquement parce qu’il possède ce rôle. L’accès Platform reste explicite afin de conserver la séparation des contextes.

La notion éventuelle de dernier workspace utilisé doit respecter la politique de persistance client et ne doit pas être ajoutée implicitement.

## 14. Lazy loading des routes

Le code splitting au niveau des routes est la stratégie par défaut.

Cibles :

```text
Auth routes      → lazy
Workspace routes → lazy
Platform routes  → lazy
```

Les fonctionnalités particulièrement lourdes pourront être fractionnées davantage si une mesure ou une volumétrie réelle le justifie.

Le lazy loading ne doit pas être appliqué mécaniquement aux petites primitives UI.

Un `PageLoader` partagé sert de fallback de chargement de route, conformément à `frontend-performance-loading-policy.md`.

## 15. Réutilisation des composants de navigation

Les mêmes intentions doivent utiliser les mêmes familles de composants :

```text
AppSidebar
AppSidebarGroup
AppSidebarItem
AppTopbar
UserMenu
WorkspaceSwitcher
Breadcrumbs
PageLoader
```

Les différences Workspace / Platform sont obtenues par :

- configuration ;
- composition ;
- données ;
- permissions ;
- contexte.

Elles ne justifient pas la duplication de structures visuelles entières.

## 16. Responsive

Desktop reste le contexte principal des interfaces denses.

Sur tablette/mobile, la sidebar pourra devenir un drawer/sheet ou une navigation adaptée. La décision exacte sera figée dans le cadrage responsive.

Le responsive doit préserver :

- navigation vers les fonctions essentielles ;
- accès au profil ;
- logout ;
- workspace switcher lorsque pertinent ;
- identification du contexte courant.

## 17. Règle de revue

Toute nouvelle route ou entrée de navigation doit vérifier :

```text
Quel contexte ? Public / Account / Workspace / Platform
Quel layout ?
Quel guard ?
Quelle permission ?
Quel état URL ?
Quel comportement 401/403/404 ?
Lazy loading nécessaire ?
Composant de navigation partagé déjà disponible ?
Responsive prévu ?
```

Aucune fonctionnalité ne doit introduire silencieusement une nouvelle convention de routing ou de navigation.