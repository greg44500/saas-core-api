# SAAS-CORE-API — F4 Redux Toolkit + RTK Query + infrastructure Auth/session

**Date :** 31 août 2026  
**Lot :** F4  
**Statut :** TERMINÉ — validé localement

## Objectif

Mettre en place l’infrastructure d’état global client, de server state et de session Auth sans développer les formulaires Login/Register ni les guards finaux de F5.

## Implémenté

- Redux Toolkit `2.12.0` ;
- React Redux `9.3.0` ;
- `async-mutex` `0.5.0` ;
- store central via `configureStore` ;
- `Provider` Redux intégré à `AppProviders` ;
- slice Auth minimal avec uniquement `accessToken` et `authStatus` ;
- access token conservé en mémoire uniquement ;
- aucun token Auth persisté dans le navigateur ;
- `baseApi` RTK Query unique pour le backend Core ;
- `baseUrl: /api` en runtime navigateur ;
- factory de base query testable avec origine absolue en environnement Vitest/Node ;
- `credentials: include` pour le cookie HttpOnly de refresh ;
- injection centralisée du Bearer depuis le store ;
- `baseQueryWithReauth` centralisé ;
- mutex partagé en runtime pour garantir un seul refresh simultané ;
- mutex isolé par instance dans les tests ;
- retry unique de la requête initiale après refresh ;
- absence de boucle sur un second `401` ;
- option `skipReauth` pour les endpoints Auth dont le `401` est naturel ;
- terminaison de session sur échec définitif du refresh ;
- listener middleware central réinitialisant le cache RTK Query lors d’une terminaison de session ;
- endpoints Auth contractuels injectés dans `baseApi` ;
- prise en charge explicite des réponses `204 No Content` pour logout/logout-all/change-password ;
- hooks RTK Query Auth générés pour les lots suivants ;
- suppression de `baseUrl` dans `jsconfig.json`, devenu inutile avec `paths`.

## Répartition des responsabilités

```text
accessToken + authStatus
→ Redux Toolkit / mémoire

current user et autres données backend
→ RTK Query

refresh token
→ cookie HttpOnly inaccessible au JavaScript

navigation
→ React Router
```

Le user courant n’est pas copié dans la slice Auth.

## Cycle de reauth

```text
requête protégée
↓
401
↓
attente du mutex
↓
un seul POST /api/auth/refresh
↓
succès
├── nouveau accessToken en mémoire
└── retry unique via rawBaseQuery

échec
├── sessionTerminated
└── reset central du cache RTK Query
```

Le retry utilise volontairement `rawBaseQuery` et non `baseQueryWithReauth`. Un second `401` arrête donc le cycle.

## Endpoints Auth préparés

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
GET  /auth/me
POST /auth/logout
POST /auth/logout-all
POST /auth/change-password
POST /auth/forgot-password
POST /auth/reset-password
```

Les écrans et validations de formulaires restent dans F5.

## Tests ajoutés

Les tests F4 couvrent notamment :

- état initial `checking` ;
- stockage mémoire du token ;
- nettoyage Auth ;
- injection Bearer ;
- transport `credentials: include` ;
- refresh puis retry ;
- absence de boucle après second `401` ;
- exclusion `skipReauth` ;
- deux `401` concurrents pour un seul refresh ;
- intégration reducer RTK Query dans le store ;
- reset cache sur terminaison de session ;
- résolution absolue des URLs de test sans modifier le `baseUrl` runtime `/api`.

## Validation locale obtenue

Validations remontées le 31 août 2026 :

- installation des dépendances F4 réussie ;
- tests frontend : `5` fichiers / `19` tests verts ;
- build Vite : vert ;
- smoke test du frontend : fonctionnel ;
- tests backend : verts ;
- correction de test des URLs relatives validée ;
- `frontend/package-lock.json` versionné avec Redux Toolkit, React Redux et async-mutex ;
- commit de lock F4 présent sur `main` : `e3645b088e7ed7dc05248ea2e347cca6e599013f` ;
- rebase local réalisé sans perte de modification ;
- working tree final annoncé propre.

## Volontairement exclu de F4

- formulaires Login/Register ;
- React Hook Form + Zod frontend ;
- bootstrap visuel empêchant le flash Login ;
- AuthGuard / WorkspaceGuard / PermissionGuard / PlatformGuard finaux ;
- redirection post-login ;
- onboarding Workspace ;
- synchronisation backend de la préférence de thème.

Ces responsabilités restent dans F5 et les lots suivants.

## Critères de clôture

Tous les critères de clôture F4 sont satisfaits. Le lot est terminé et ne porte pas de dette bloquante pour F5.
