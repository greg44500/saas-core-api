# SAAS-CORE-API — F4 Redux Toolkit + RTK Query + infrastructure Auth/session

**Date :** 31 août 2026  
**Lot :** F4  
**Statut :** implémenté sur GitHub — validation locale requise

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
- `baseUrl: /api` ;
- `credentials: include` pour le cookie HttpOnly de refresh ;
- injection centralisée du Bearer depuis le store ;
- `baseQueryWithReauth` centralisé ;
- mutex partagé pour garantir un seul refresh simultané ;
- retry unique de la requête initiale après refresh ;
- absence de boucle sur un second `401` ;
- option `skipReauth` pour les endpoints Auth dont le `401` est naturel ;
- terminaison de session sur échec définitif du refresh ;
- listener middleware central réinitialisant le cache RTK Query lors d’une terminaison de session ;
- endpoints Auth contractuels injectés dans `baseApi` ;
- prise en charge explicite des réponses `204 No Content` pour logout/logout-all/change-password ;
- hooks RTK Query Auth générés pour les lots suivants.

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
- reset cache sur terminaison de session.

## Volontairement exclu de F4

- formulaires Login/Register ;
- React Hook Form + Zod frontend ;
- bootstrap visuel empêchant le flash Login ;
- AuthGuard / WorkspaceGuard / PermissionGuard / PlatformGuard finaux ;
- redirection post-login ;
- onboarding Workspace ;
- synchronisation backend de la préférence de thème.

Ces responsabilités restent dans F5 et les lots suivants.

## Validation locale requise

Après `git pull`, depuis `frontend/` :

```bash
npm install
npm run test
npm run build
```

Puis depuis la racine :

```bash
npm test
```

Vérifier enfin :

```bash
git status --short
```

Le lockfile doit être modifié par l’ajout de Redux Toolkit, React Redux et async-mutex, puis versionné après validation.

## Critères de clôture

F4 pourra passer à `TERMINÉ` lorsque :

- installation des dépendances réussie ;
- tests frontend verts ;
- build Vite vert ;
- tests backend verts ;
- lockfile F4 versionné ;
- working tree clean.
