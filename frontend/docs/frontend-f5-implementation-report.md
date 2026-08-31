# SAAS-CORE-API — F5 Login/Register + bootstrap session

**Date :** 31 août 2026  
**Lot :** F5  
**Statut :** TERMINÉ — validé localement

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
- navigation Login ↔ Register via le router ;
- proxy Vite `/api` vers le backend de développement, configurable via `VITE_API_PROXY_TARGET` ;
- arbre de routes isolé par router via `createAppRoutes()` ;
- lazy routes alignées avec l’API React Router 8.

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

La résolution de destination post-login sans `state.from` est volontairement confiée à F6.

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

## Validation locale obtenue

Validations remontées le 31 août 2026 :

- tests frontend : verts ;
- build Vite : vert ;
- tests backend : verts ;
- parcours Register réel : fonctionnel via backend ;
- parcours Login réel : fonctionnel via backend ;
- bootstrap session réel : fonctionnel ;
- `GuestGuard` validé ;
- proxy Vite `/api` validé ;
- `frontend/package-lock.json` versionné ;
- commit de lock F5 présent sur `main` : `ba20378538588cc364ad7a6f56c19228cc3d221b` ;
- working tree final annoncé propre.

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

## Critères de clôture

Tous les critères de clôture F5 sont satisfaits. Le lot est terminé et la résolution post-login passe désormais sous la responsabilité de F6.
