# SAAS-CORE-API — Checklist F0.3 Auth/session Frontend

**Statut :** cadrage F0.3 figé, implémentation à faire  
**Date :** 31 août 2026

## Décisions figées

- [x] Access token conservé en mémoire uniquement.
- [x] Refresh token conservé uniquement dans le cookie HttpOnly backend/browser.
- [x] Bootstrap de session par `POST /api/auth/refresh` au démarrage.
- [x] État initial `authStatus = checking` avant résolution de session.
- [x] Pas d’appel `/me` systématique immédiatement après un refresh réussi.
- [x] Bearer token injecté centralement par la base API.
- [x] Gestion centralisée des 401 via `baseQueryWithReauth`.
- [x] Un seul refresh simultané grâce à un mutex/verrou partagé.
- [x] Les requêtes concurrentes attendent le même cycle de refresh puis se rejouent une fois.
- [x] Une seule tentative de retry après refresh ; aucune boucle de refresh.
- [x] Les endpoints Auth publics sont exclus du reauth automatique lorsque leur 401 est naturel.
- [x] Login : access token mémoire + cookie HttpOnly posé par backend.
- [x] Register : succès puis redirection Login, pas d’auto-login artificiel.
- [x] Logout : clear Auth + reset cache RTK Query + Login.
- [x] Logout-all : confirmation explicite + révocation globale + nettoyage + Login.
- [x] Change password : toutes sessions révoquées + nettoyage frontend + Login.
- [x] Reset password : pas de nouvelle session automatique + Login.
- [x] Forgot password : préserver la réponse générique anti-énumération.
- [x] Échec définitif refresh : session terminée, nettoyage Auth/cache, retour Login.
- [x] Destination protégée initiale préservée par React Router lorsque toujours autorisée.
- [x] Nettoyage du cache RTK Query lors de tout changement définitif d’identité/session.

## Implémentation à faire

- [ ] Créer le slice Auth minimal (`accessToken`, `authStatus`).
- [ ] Créer/configurer la base API RTK Query.
- [ ] Ajouter `prepareHeaders` pour le Bearer token.
- [ ] Configurer les credentials nécessaires au cookie HttpOnly.
- [ ] Implémenter `baseQueryWithReauth`.
- [ ] Implémenter le mutex/verrou de refresh concurrent.
- [ ] Garantir un seul retry de la requête initiale.
- [ ] Exclure login/register/refresh/forgot/reset du reauth automatique approprié.
- [ ] Implémenter l’AuthBootstrap.
- [ ] Implémenter le reset central du cache RTK Query.
- [ ] Implémenter login.
- [ ] Implémenter register.
- [ ] Implémenter forgot password.
- [ ] Implémenter reset password.
- [ ] Implémenter logout.
- [ ] Implémenter logout-all.
- [ ] Implémenter change password.
- [ ] Implémenter `/me` pour le rafraîchissement explicite du profil.
- [ ] Implémenter les redirections et messages d’expiration de session.

## Tests requis

### Unitaires

- [ ] reducer/slice Auth.
- [ ] mise à jour/clear access token.
- [ ] transitions `checking` / `authenticated` / `unauthenticated`.
- [ ] fonctions de classification des endpoints exclus du refresh automatique si abstraction dédiée.

### Intégration

- [ ] requête protégée avec token valide.
- [ ] 401 → refresh réussi → requête rejouée une seule fois.
- [ ] plusieurs 401 simultanés → un seul appel refresh.
- [ ] refresh échoué → nettoyage Auth et cache.
- [ ] retry encore 401 → aucun second refresh.
- [ ] 401 login → aucun refresh automatique.
- [ ] logout nettoie cache et session.
- [ ] logout-all nettoie cache et session.
- [ ] change-password force le retour Login.
- [ ] reset-password nettoie une éventuelle session locale.

### E2E

- [ ] login puis accès à une route protégée.
- [ ] reload navigateur avec refresh cookie valide → session restaurée sans flash Login.
- [ ] expiration access token pendant plusieurs appels → UX transparente et session conservée.
- [ ] refresh invalide/révoqué → retour Login avec message générique approprié.
- [ ] logout puis connexion d’une autre identité → aucune donnée résiduelle du compte précédent.
- [ ] retour vers l’URL protégée initialement demandée après authentification.

## Validation manuelle

- [ ] aucun token dans localStorage/sessionStorage.
- [ ] aucun refresh token accessible au JavaScript.
- [ ] aucun flash de contenu privé ou Login pendant le bootstrap.
- [ ] aucune boucle de refresh observable.
- [ ] aucun message technique JWT/AuthSession exposé à l’utilisateur.
- [ ] comportement cohérent sur desktop/tablette/mobile.
- [ ] focus et navigation clavier corrects sur tous les formulaires Auth.
