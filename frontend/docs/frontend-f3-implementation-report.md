# SAAS-CORE-API — F3 Router, providers et layouts minimaux

**Date :** 31 août 2026  
**Lot :** F3  
**Statut :** implémenté sur GitHub — validation locale requise

## Objectif

Mettre en place le routing SPA, les providers applicatifs et les quatre layouts structurants sans introduire encore l’authentification réelle, Redux Toolkit, RTK Query ou les écrans métier définitifs.

## Implémenté

- React Router v8 en Data Router ;
- `createBrowserRouter` créé une seule fois hors de l’arbre React ;
- `AppProviders` comme point d’assemblage des providers actuels ;
- `ThemeProvider` conservé au niveau applicatif ;
- `RouterProvider` au niveau racine ;
- `PageLoader` partagé comme fallback initial du router ;
- `PublicLayout` ;
- `AuthLayout` ;
- `WorkspaceLayout` ;
- `PlatformLayout` ;
- route publique `/` ;
- routes Auth temporaires `/login` et `/register` ;
- route Workspace `/workspaces/:workspaceId/dashboard` ;
- route Platform `/platform/overview` ;
- route wildcard `*` vers une vraie page `NotFound` ;
- lazy loading des implémentations Auth, Workspace, Platform et NotFound ;
- tests de navigation avec `createMemoryRouter`.

## Règles architecturales respectées

### URL comme source de vérité

Le `workspaceId` est lu depuis `useParams()` dans le layout Workspace. Aucun état Redux ou contexte parallèle n’est créé pour représenter la destination courante.

### Pas de récupération métier dans le router

Aucun `loader` métier n’est ajouté. RTK Query restera la couche de référence pour le server state en F4 et au-delà.

### Guards volontairement différés

Les responsabilités Authentication / Workspace / Permission / Platform sont déjà prévues par la politique de routing, mais aucun faux guard n’est ajouté en F3 : l’état Auth réel n’existe pas encore. Les guards seront branchés lorsque l’infrastructure session sera disponible.

### Lazy loading

Les routes Auth, Workspace et Platform utilisent `route.lazy` afin de séparer les implémentations de pages du bundle initial. Les layouts restent légers et disponibles immédiatement pour structurer la navigation.

## Placeholders assumés

Les pages suivantes sont des surfaces temporaires de validation structurelle :

```text
/login
/register
/workspaces/:workspaceId/dashboard
/platform/overview
```

Elles n’anticipent ni formulaires Auth, ni shell Workspace définitif, ni données Platform.

## Tests ajoutés

La suite `src/app/router.test.jsx` vérifie :

1. la route publique dans `PublicLayout` ;
2. le chargement lazy de `/login` dans `AuthLayout` ;
3. la conservation de `workspaceId` dans le layout Workspace ;
4. la séparation du contexte Platform ;
5. le rendu NotFound et le retour vers `/`.

Les tests F2 existants restent conservés.

## Validation locale requise

Depuis la racine du dépôt après `git pull` :

```bash
cd frontend
npm install
npm run test
npm run build
npm run dev
```

Vérifier manuellement :

```text
/
/login
/register
/workspaces/demo-workspace/dashboard
/platform/overview
/route-inconnue
```

La dernière URL doit afficher `Page introuvable` et permettre un retour vers l’accueil.

Puis depuis la racine :

```bash
cd ..
npm test
git status --short
```

Le `npm install` doit mettre à jour `frontend/package-lock.json` avec React Router si nécessaire.

## Critères de clôture

F3 pourra passer à `TERMINÉ` lorsque :

- installation React Router réussie ;
- tests frontend verts ;
- build Vite vert ;
- navigation manuelle des routes cibles validée ;
- NotFound validé ;
- tests backend verts ;
- lockfile synchronisé ;
- working tree clean.

## Hors périmètre F3

- Redux Toolkit ;
- RTK Query ;
- access token ;
- refresh HttpOnly ;
- bootstrap session ;
- guards Auth réels ;
- permissions ;
- formulaires Login/Register ;
- shell Workspace définitif ;
- navigation sidebar finale.

Ces responsabilités commencent en F4/F5 et F7.
