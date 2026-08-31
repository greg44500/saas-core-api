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
frontend-dashboard-activity-panel-policy.md
frontend-auth-session-policy.md
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

### Modales et panneaux contextuels

Les modales sont réservées aux interactions courtes, indépendantes ou sensibles, notamment confirmations destructrices et confirmations de sécurité.

Les listes et tableaux professionnels peuvent ouvrir un panneau latéral contextuel réutilisable afin de consulter ou éditer une entité sans perdre le contexte de la page.

Les parcours longs ou complexes utilisent une page ou un wizard approprié.

## 4. Design system détaillé

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

Police principale : `Inter`.

Échelle de spacing de référence :

```text
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 px
```

Radius :

```text
sm 6 px
md 8 px
lg 12 px
xl 16 px
```

Les ombres restent discrètes ; bordures, surfaces, spacing et contraste structurent prioritairement la hiérarchie visuelle.

Densité : professionnelle intermédiaire avec variante partagée `compact` lorsque nécessaire.

Le dark mode est obligatoire et utilise des valeurs adaptées par token, jamais une inversion mécanique.

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

Les variantes finales light/dark et valeurs fonctionnelles seront validées par contraste au moment de la configuration CSS.

Référence détaillée : `frontend-design-system-components-policy.md`.

## 5. Réutilisation UI et DataTable

La réutilisation des composants est une exigence structurante.

Une même intention visuelle doit utiliser la même famille de composants.

Les tableaux Workspace, Platform et futurs modules métier partent d’une base `DataTable`/primitives communes plutôt que de réimplémenter pagination, densité, loading, empty state, actions ou responsive.

Architecture de référence :

```text
DataTable
├── TableHeader / TableBody / TableRow / TableCell
├── TableToolbar
├── TablePagination
├── TableSkeleton
├── TableEmptyState
└── RowActions lorsque pertinent
```

### Pagination

Les tableaux de données métier sont paginés par défaut.

Pour les datasets non trivialement bornés : pagination serveur lorsque l’API la permet. Le frontend ne charge pas de gros volumes uniquement pour les paginer localement.

Une petite liste strictement bornée peut exceptionnellement ne pas être paginée si le volume maximal est connu et faible.

### Actions

Les actions de ligne (`Voir`, `Modifier`, `Supprimer`, etc.) n’apparaissent que si :

```text
opération backend réellement disponible
+ permission utilisateur suffisante
+ action pertinente pour l’état courant
```

Une table purement informative ne possède pas artificiellement de colonne d’actions.

Les actions sensibles suivent les conventions de confirmation et de feedback déjà figées.

Les panneaux de détail utilisent une primitive/famille partagée pour structure, scrolling, responsive et actions de footer.

Références détaillées : `frontend-design-system-components-policy.md` et `frontend-dashboard-activity-panel-policy.md`.

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

## 8. Auth et cycle de session

Décisions actives :

```text
access token        → mémoire uniquement
refresh token       → cookie HttpOnly
bootstrap session   → POST /auth/refresh
authStatus initial  → checking
server state        → RTK Query
Auth lifecycle      → Redux Toolkit / mémoire
```

Le résultat de `/auth/refresh` initialise la session sans appel `/me` systématique immédiatement après, puisque le backend renvoie déjà `user + accessToken`.

Toutes les requêtes protégées utilisent un `baseQueryWithReauth` centralisé qui injecte le Bearer token et gère les 401.

### Refresh concurrent

Un seul refresh est autorisé à la fois. Si plusieurs requêtes reçoivent 401 simultanément :

```text
première requête 401 → lance refresh
autres 401           → attendent le même cycle de refresh
refresh réussi       → nouveau token partagé
                      → requêtes rejouées une fois
```

Cette règle est critique car le backend utilise une rotation du refresh token avec consommation unique et détection de réutilisation.

Une requête n’est rejouée qu’une seule fois après refresh afin d’éviter toute boucle.

Les endpoints Auth publics comme login, register, forgot/reset password et refresh lui-même ne déclenchent pas automatiquement un reauth sur leurs 401 naturels.

### Flows

```text
login            → access token mémoire + cookie backend + navigation déterministe
register         → succès puis Login, pas d’auto-login artificiel
logout           → clear Auth + reset RTK Query + Login
logout-all       → confirmation + clear Auth/cache + Login
change-password  → toutes sessions révoquées + clear Auth/cache + Login
reset-password   → session non recréée + Login
forgot-password  → message générique anti-enumération
refresh échoué   → session terminée + nettoyage + Login
```

Le cache RTK Query sensible est nettoyé à chaque changement d’identité/session définitif afin d’éviter toute fuite visuelle ou incohérence multi-user.

La destination protégée initialement demandée reste sous la responsabilité du router et est restaurée après login lorsqu’elle reste autorisée.

Référence détaillée : `frontend-auth-session-policy.md`.

## 9. Performance et chargement

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

## 10. Expérience utilisateur contextuelle

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

## 11. Dashboards Workspace et Platform

### Dashboard Workspace

Le Dashboard Workspace est une synthèse opérationnelle extensible, pas une collection décorative de KPI.

Structure de référence :

```text
accueil/contextualisation
éléments à traiter ou surveiller
indicateurs Core utiles
actions rapides
activité récente
widgets métier futurs
```

La structure générale reste commune entre rôles ; les blocs et actions sont affichés selon les permissions et données réellement disponibles.

Les indicateurs Core potentiels incluent membres, stockage, uploads mensuels, plan, trial/subscription et invitations en attente, uniquement si l’API permet de les alimenter proprement.

Les quotas/capacités utilisent une famille de composants réutilisable de type `UsageIndicator`.

L’activité récente provient des AuditLogs backend. Les codes techniques sont traduits en messages humains avec acteur, action, objet et temps relatif. Une date absolue reste disponible lorsque la précision audit est nécessaire.

Les futurs modules métier peuvent injecter leurs propres widgets par composition : indicateurs métier, évolution tarifaire, tâches prioritaires, alertes réellement justifiées, etc.

### Dashboard Platform

Le Platform Overview est un centre de pilotage global.

Le frontend ne charge pas de grandes listes uniquement pour calculer des compteurs. Un futur endpoint agrégé tel que `GET /api/platform/overview` est recommandé pour les métriques globales ; cet endpoint n’existe pas encore.

Tant qu’il n’existe pas, l’Overview Platform reste un hub utile vers Users, Workspaces, Plans, Subscriptions et Audit Logs, sans faux KPI.

Référence détaillée : `frontend-dashboard-activity-panel-policy.md`.

## 12. Panneaux contextuels et règles d’édition

Les listes/tableaux professionnels utilisent lorsque pertinent un panneau latéral contextuel (`DetailsPanel`/`Sheet`) pour consulter ou éditer une entité sans perdre pagination, filtres, recherche ou position dans la liste.

Contrôles UI :

```text
booléen                     → Switch
valeur exclusive courte     → Select
valeur exclusive recherchée → Combobox
choix multiples             → Checkbox / multi-select
```

Un rôle exclusif n’est pas représenté par plusieurs switches.

Sauvegarde :

```text
modification significative → Annuler / Enregistrer explicite
autosave                   → seulement faible risque et comportement sans ambiguïté
destructif / irréversible  → confirmation supplémentaire
```

La fermeture d’un panneau ne valide pas implicitement une modification sensible.

Après mutation réussie, un toast peut confirmer l’action. Les erreurs de champs restent inline.

Référence détaillée : `frontend-dashboard-activity-panel-policy.md`.

## 13. Règle pour les futures reprises

Avant toute implémentation frontend :

1. consulter le cadrage UX/UI ;
2. consulter les politiques normatives concernées ;
3. vérifier la checklist ;
4. vérifier le contrat backend/frontend ;
5. ne pas réintroduire une ancienne option remplacée par une décision normative plus récente.

Les politiques spécifiques ont priorité sur les anciennes formulations non encore consolidées dans les documents vivants.