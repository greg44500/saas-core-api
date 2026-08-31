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
frontend-auth-forms-ux-policy.md
frontend-subscription-navigation-ux-policy.md
frontend-onboarding-workspace-policy.md
frontend-feedback-errors-policy.md
```

Le document `frontend-cadrage-ux-ui.md` reste le journal vivant des questions et arbitrages. Les politiques normatives ci-dessus fixent les règles déjà validées.

## 3. Décisions UX/UI figées

Utilisateur de référence : professionnel métier non nécessairement technique. L’interface reste professionnelle, claire, accessible et adaptable aux futurs SaaS métier.

Densité professionnelle intermédiaire par défaut. Les interfaces Platform peuvent être plus denses lorsque le pilotage le justifie.

Responsive desktop/tablette/mobile dans le périmètre fonctionnel.

Interfaces authentifiées : sidebar gauche rétractable + topbar + contexte utilisateur + accès profil + déconnexion rapidement accessible.

Les modales sont réservées aux interactions courtes, indépendantes ou sensibles. Les listes/tableaux peuvent ouvrir un panneau latéral contextuel réutilisable afin de consulter ou éditer une entité sans perdre le contexte de la page.

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

Spacing : `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 px`.

Radius : `6 / 8 / 12 / 16 px` selon niveau.

Ombres discrètes ; hiérarchie basée prioritairement sur surfaces, bordures, spacing et contraste.

Densité : intermédiaire avec variante partagée `compact` lorsque nécessaire.

Dark mode obligatoire avec valeurs adaptées par token.

États fonctionnels séparés de la marque : success, warning, info, destructive, invalid, disabled ; critical/urgent seulement si besoin métier réel.

Référence : `frontend-design-system-components-policy.md`.

## 5. Réutilisation UI et DataTable

Une même intention visuelle utilise la même famille de composants.

Les tableaux Workspace, Platform et futurs modules métier partent d’une base `DataTable` commune.

```text
DataTable
├── TableHeader / TableBody / TableRow / TableCell
├── TableToolbar
├── TablePagination
├── TableSkeleton
├── TableEmptyState
└── RowActions lorsque pertinent
```

Les tableaux métier sont paginés par défaut. Pour les datasets non trivialement bornés : pagination serveur lorsque l’API la permet.

Les actions de ligne n’apparaissent que si l’opération backend existe, si l’utilisateur possède la permission requise et si l’action est pertinente pour l’état courant.

Une table purement informative ne possède pas de colonne d’actions artificielle.

Références : `frontend-design-system-components-policy.md` et `frontend-dashboard-activity-panel-policy.md`.

## 6. State management

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

## 7. Routing, layouts et navigation

```text
router              → React Router
server state        → RTK Query
workspace context   → /workspaces/:workspaceId/*
platform context    → /platform/*
account context     → /account/*
```

Layouts distincts : PublicLayout, AuthLayout, WorkspaceLayout, PlatformLayout.

Navigation Workspace : sidebar gauche rétractable, workspace switcher en partie haute, topbar sobre et contextuelle.

Zone de gestion Workspace :

```text
Gestion
├── Abonnement
└── Paramètres
```

`Abonnement` mène vers `/workspaces/:workspaceId/subscription` et `Paramètres` vers `/workspaces/:workspaceId/settings`.

Le menu utilisateur de topbar reste centré sur la personne : profil, sécurité, apparence, logout. Un owner peut disposer d’un raccourci vers `Gérer l’abonnement`, mais la topbar n’est pas la surface principale de gestion commerciale.

Navigation Platform : contexte distinct mais composants structurels réutilisés.

Guards : Authentication, Workspace, Permission, Platform.

401 → refresh/session puis login si nécessaire ; 403 → Forbidden contextualisé ; 404 → NotFound ou ressource masquée selon backend.

Lazy loading des routes Auth, Workspace et Platform avec PageLoader partagé.

Références : `frontend-routing-navigation-policy.md` et `frontend-subscription-navigation-ux-policy.md`.

## 8. Auth et cycle de session

```text
access token        → mémoire uniquement
refresh token       → cookie HttpOnly
bootstrap session   → POST /auth/refresh
authStatus initial  → checking
server state        → RTK Query
Auth lifecycle      → Redux Toolkit / mémoire
```

Toutes les requêtes protégées utilisent un `baseQueryWithReauth` centralisé.

Un seul refresh est autorisé à la fois grâce à un verrou/mutex partagé. Les requêtes concurrentes attendent le même cycle puis se rejouent une seule fois.

Les endpoints Auth publics n’entraînent pas de reauth automatique sur leurs 401 naturels.

Flows : login → token mémoire + cookie backend ; register → succès puis Login ; logout/logout-all/change/reset → nettoyage Auth/cache selon contrat ; forgot password → message anti-énumération ; refresh définitif échoué → Login.

Référence : `frontend-auth-session-policy.md`.

## 9. UX des formulaires Auth

Stack : React Hook Form + Zod frontend + resolver + primitives shadcn + RTK Query.

Les valeurs de formulaire ne sont jamais stockées dans Redux.

Les routes `/login` et `/register` restent distinctes et sont la source de vérité.

Le Login est l’entrée Auth par défaut. Une action `Créer un compte` navigue vers Register ; Register propose `Déjà un compte ? Se connecter`.

Un conteneur `AuthEntry` partagé peut animer la transition de manière courte et discrète (fade/slide/hauteur), sans remplacer le routing.

Register reste limité à identité + credentials. `confirmPassword` est frontend uniquement. Aucun plan, moyen de paiement ou détail commercial n’est ajouté au formulaire Register.

Politique mot de passe visible : contraintes réelles du backend, sans règles artificielles de composition ni score arbitraire.

Erreurs de champs inline, erreurs de credentials génériques, focus sur premier champ invalide, double soumission empêchée, loader local sur submit, autocomplete correct.

Auth et choix commercial restent séparés.

Référence : `frontend-auth-forms-ux-policy.md`.

## 10. Onboarding Workspace

Après login, une résolution de contexte décide entre invitation, workspace existant, création de workspace, choix multi-workspaces ou Platform pour les cas autorisés.

Priorité : une invitation valide et pertinente vers un workspace existant est traitée avant de proposer la création d’un workspace personnel.

Un utilisateur possédant déjà un workspace ne repasse pas dans l’onboarding commercial à chaque connexion.

Pour un utilisateur sans workspace :

```text
Créer workspace
↓
Free actif immédiatement
↓
[Accéder à mon espace]
ou
[Comparer les plans]
```

Le choix commercial est facultatif après création. Le frontend ne place pas un plan payant avant la création du workspace comme condition d’accès.

Le trial n’est jamais démarré automatiquement : il résulte d’une action volontaire explicite. Aucun moyen de paiement n’est artificiellement demandé tant que le backend n’en exige pas.

L’onboarding obligatoire reste minimal ; les découvertes fonctionnelles et commerciales se poursuivent ensuite par progressive disclosure dans l’application.

Destination finale commune après création Free ou trial : `/workspaces/:workspaceId/dashboard`.

Une invitation invalide/expirée propose une remédiation (`Voir mes workspaces` ou `Créer mon espace`) au lieu d’un dead end.

Aucun flag `onboardingCompleted` n’est introduit tant que l’état est dérivable du contexte réel.

SUPER_ADMIN : accès Platform possible sans obligation de créer un workspace personnel ; il n’est pas automatiquement forcé vers Platform non plus.

Aucune jauge artificielle de progression onboarding tant que le parcours obligatoire reste court.

Référence : `frontend-onboarding-workspace-policy.md`.

## 11. Subscription Workspace

L’abonnement appartient au Workspace, pas au profil utilisateur.

La page `/workspaces/:workspaceId/subscription` est la surface de référence pour plan actuel, trial, entitlement effectif, limites/usages, upgrade, downgrade, changements programmés et annulation lorsque le backend le permet.

Le Dashboard Workspace peut afficher un résumé plan/trial et un CTA vers la page Subscription.

Trial : jours restants + date absolue de fin. Une progression proportionnelle n’est affichée que si le backend fournit assez de données pour la calculer correctement.

Upgrade : accessible immédiatement lorsque l’opération backend existe.

Downgrade : impact expliqué, date d’effet visible, confirmation adaptée, révocation proposée lorsque l’API le permet.

Les actions commerciales sont affichées uniquement aux utilisateurs autorisés ; l’autorisation backend reste l’autorité.

Free est un vrai plan actif.

Le futur Billing complète la surface Subscription/Workspace et ne migre pas dans le profil utilisateur.

Références : `frontend-subscription-navigation-ux-policy.md` et `frontend-onboarding-workspace-policy.md`.

## 12. Feedback utilisateur, erreurs et confirmations

La politique active suit une règle de proximité :

```text
erreur de champ             → inline
erreur de formulaire        → dans la surface concernée
succès de mutation          → toast si utile
erreur de chargement local  → état d'erreur local
erreur de route             → page d'état
action destructive          → confirmation avant action
```

Une infrastructure globale unique de toasts est utilisée avec variantes `success`, `info`, `warning`, `error`. Les toasts ne sont pas utilisés pour les navigations évidentes ni pour chaque erreur de lecture.

Les erreurs RTK Query passent par une couche centrale de normalisation (`normalizeApiError` / abstraction équivalente). Les comparaisons dispersées basées sur le texte exact des messages backend sont interdites.

401 récupérable → invisible ; 401 définitif → nettoyage session/cache + Login ; 403 → feedback local ou surface Forbidden ; 404 → NotFound sans révéler une permission masquée ; 500 → message générique ; erreur réseau → message dédié + retry lorsque possible.

Un échec de refetch ne supprime pas automatiquement les données déjà disponibles dans le cache.

Les quotas, plans et entitlements dépassés utilisent une logique de remédiation plutôt qu'une simple erreur : explication + usage/limite + CTA adapté si pertinent.

Les actions destructrices utilisent une confirmation explicite avec conséquences réelles et libellé d'action précis. Les confirmations renforcées sont réservées aux opérations réellement critiques.

Pendant une mutation : feedback local, bouton disabled, pas de blocage plein écran sans nécessité. Après succès : UI réellement mise à jour + toast éventuel. Après échec : données saisies conservées et surface maintenue ouverte.

Une famille partagée `StateMessage`/`ErrorState`/`ForbiddenState`/`NotFoundState`/`NetworkErrorState` est retenue.

Une React Error Boundary protège les grands contextes applicatifs contre les erreurs de rendu inattendues.

Les feedbacks importants respectent l'accessibilité (`aria-live`, `role="alert"`, gestion du focus selon contexte) et ne reposent jamais uniquement sur la couleur.

Aucun secret ou credential (`password`, access/refresh/reset token, etc.) n'est journalisé côté client.

Référence : `frontend-feedback-errors-policy.md`.

## 13. Performance et chargement

Route-level code splitting → React lazy/Suspense ; route → PageLoader ; contenu structurant → Skeleton ; mutations locales → feedback local ; datasets importants → pagination/recherche/tri/filtres serveur ; infinite loading uniquement si UX justifiée ; virtualisation seulement si nécessaire.

## 14. Expérience utilisateur contextuelle

Le Core propose lorsque les données le permettent : accueil contextuel, message de retour, empty states guidés, remédiations quota/permission/entitlement, feedback clair et progressive disclosure.

Le frontend n’invente jamais une dernière connexion ou un état métier non fourni par le backend.

## 15. Dashboards Workspace et Platform

Dashboard Workspace : synthèse opérationnelle extensible avec accueil, éléments à traiter/surveiller, indicateurs Core, actions rapides, activité récente et widgets métier futurs.

Platform Overview : centre de pilotage global ; pas de faux KPI. Un futur endpoint agrégé reste recommandé avant métriques globales réelles.

## 16. Panneaux contextuels et règles d’édition

Booléen → Switch ; valeur exclusive courte → Select ; valeur exclusive recherchée → Combobox ; choix multiples → Checkbox/multi-select.

Modification significative → Annuler/Enregistrer explicite ; autosave → faible risque seulement ; destructif/irréversible → confirmation supplémentaire.

## 17. Règle pour les futures reprises

Avant toute implémentation frontend :

1. consulter le cadrage UX/UI ;
2. consulter les politiques normatives concernées ;
3. vérifier la checklist ;
4. vérifier le contrat backend/frontend ;
5. ne pas réintroduire une ancienne option remplacée par une décision normative plus récente.
