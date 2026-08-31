# SAAS-CORE-API — F5 Login/Register + bootstrap session

**Date :** 31 août 2026  
**Lot :** F5  
**Statut :** implémenté sur GitHub — validation locale requise

## Objectif

Implémenter le bootstrap réel de session, les guards Auth, les formulaires Login/Register et leur validation UX, sans démarrer la résolution métier d’onboarding Workspace prévue en F6.

## Implémenté

- `SessionBootstrap` monté à la racine applicative ;
- un seul appel `POST /api/auth/refresh` au démarrage, y compris sous `StrictMode` ;
- `AuthGuard` basé sur `authStatus` ;
- `GuestGuard` pour Login/Register ;
- `PageLoader` pendant `authStatus = checking` afin d’éviter le flash Login ;
- conservation de la destination protégée demandée dans le state React Router ;
- retour vers cette destination après login réussi ;
- fallback post-login `/` lorsque aucune destination protégée n’existe ;
- page Login réelle ;
- page Register réelle ;
- React Hook Form + resolver Zod ;
- schémas frontend séparés du backend ;
- validation alignée avec le contrat backend ;
- mot de passe 15 à 128 caractères sans règle artificielle de composition ;
- `confirmPassword` frontend uniquement et exclu du payload API ;
- composants réutilisables `FormField`, `PasswordField`, `Input` ;
- affichage/masquage accessible du mot de passe ;
- autocomplete adapté ;
- double soumission empêchée via `isLoading` ;
- erreur Login volontairement générique ;
- register réussi → Login avec message de succès ;
- navigation Login ↔ Register via le router.

## Dépendances F5

```text
react-hook-form      7.87.0
@hookform/resolvers  5.9.1
zod                  4.5.4
```

## Validation alignée backend

```text
firstName  → trim, 1..100
lastName   → trim, 1..100
email      → email valide, max 254
password   → 15..128, jamais trimé
```

`confirmPassword` est validé côté frontend mais n’est jamais envoyé au backend.

## Routing Auth

```text
application start
↓
SessionBootstrap
↓
authStatus = checking
↓
POST /api/auth/refresh
├── succès → authenticated
└── échec  → unauthenticated
```

Une route protégée demandée sans session suit :

```text
/workspaces/:id/dashboard
→ /login + state.from
→ login réussi
→ retour à la destination initiale
```

## Tests ajoutés / adaptés

- validation Login conforme ;
- refus password < 15 ;
- confirmation password divergente ;
- trim prénom/nom sans trim du password ;
- bootstrap unique sous StrictMode ;
- route Login visiteur ;
- redirection route protégée vers Login ;
- conservation de la destination ;
- accès Workspace authentifié ;
- accès Platform authentifié ;
- non-régression NotFound.

## Volontairement exclu de F5

- résolution post-login des workspaces réels ;
- sélection multi-workspaces ;
- création du premier workspace ;
- traitement prioritaire des invitations ;
- onboarding commercial Free/trial ;
- `WorkspaceGuard` métier fondé sur les données serveur ;
- `PermissionGuard` ;
- `PlatformGuard` SUPER_ADMIN ;
- Forgot/Reset Password UI ;
- Account/Security UI ;
- synchronisation multi-device de la préférence de thème.

La destination de secours post-login reste donc `/` jusqu’à F6. Cette décision évite d’inventer un contexte workspace non encore chargé.

## Validation locale requise

Après `git pull`, depuis `frontend/` :

```bash
npm install
npm run test
npm run build
npm run dev
```

Vérifier manuellement :

1. `/login` affiche le formulaire Login ;
2. `/register` affiche le formulaire Register ;
3. mot de passe < 15 caractères → erreur inline ;
4. confirmations différentes → erreur inline ;
5. bouton d’affichage/masquage du password accessible ;
6. navigation Login ↔ Register ;
7. une route protégée non authentifiée redirige vers `/login` sans afficher brièvement le contenu protégé ;
8. aucune erreur React/Redux/Router dans la console.

Puis depuis la racine :

```bash
npm test
git status --short
```

Le lockfile frontend doit être modifié par les trois dépendances F5 puis versionné après validation.

## Critères de clôture

F5 pourra passer à `TERMINÉ` lorsque :

- installation des dépendances réussie ;
- tests frontend verts ;
- build Vite vert ;
- smoke test Auth visuel validé ;
- tests backend verts ;
- lockfile F5 versionné ;
- working tree clean.
