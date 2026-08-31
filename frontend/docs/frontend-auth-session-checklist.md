# SAAS-CORE-API — Checklist F0.3 Auth/session Frontend

**Statut :** cadrage F0.3 Auth/session + formulaires figé, implémentation à faire  
**Date :** 31 août 2026

## Décisions Auth/session figées

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

## Décisions formulaires et UX Auth figées

- [x] React Hook Form + Zod frontend + resolver retenus.
- [x] Les valeurs de formulaire ne sont pas stockées dans Redux.
- [x] Les schémas Zod frontend restent séparés des modules backend mais alignés avec le contrat HTTP.
- [x] Famille partagée de composants de formulaire (`FormField`, `FormLabel`, `FormMessage`, `PasswordField` selon besoin).
- [x] `/login` et `/register` restent deux vraies routes.
- [x] Login est l’entrée Auth par défaut.
- [x] `Créer un compte` navigue vers Register ; `Déjà un compte ? Se connecter` retourne vers Login.
- [x] `AuthEntry` peut animer sobrement la transition sans remplacer le routing.
- [x] Login : email, mot de passe, mot de passe oublié, CTA connexion, CTA création de compte.
- [x] Register : prénom, nom, email, mot de passe, confirmation, CTA création, retour Login.
- [x] `confirmPassword` est frontend uniquement et n’est jamais envoyé à l’API.
- [x] Register ne contient ni plan, ni paiement, ni informations commerciales détaillées.
- [x] Politique mot de passe frontend alignée sur les règles backend réelles ; aucune règle artificielle ajoutée.
- [x] Aucun score de robustesse arbitraire en V1.
- [x] Forgot password conserve le message générique anti-énumération.
- [x] Reset password lit le token depuis l’URL et demande uniquement nouveau mot de passe + confirmation.
- [x] Change password informe que toutes les sessions seront déconnectées.
- [x] Validation initiale au blur ou submit ; réévaluation pendant correction si champ déjà invalide.
- [x] Erreurs de champ inline ; erreurs globales seulement lorsqu’elles ne sont pas rattachables proprement à un champ.
- [x] Focus sur le premier champ invalide après submit lorsque possible.
- [x] Double soumission empêchée par bouton désactivé + loader local.
- [x] Pas d’overlay global pour une mutation de formulaire ordinaire.
- [x] Mot de passe de login conservable temporairement dans le state du formulaire après erreur serveur, jamais persisté.
- [x] Attributs autocomplete corrects ; pas de désactivation globale des password managers.
- [x] AuthLayout sans sidebar, centré, responsive, light/dark et visuellement soigné.
- [x] Auth et choix commercial restent séparés.
- [x] Un utilisateur créant son propre workspace dispose d’un chemin Free/trial/plan sans blocage artificiel.
- [x] Un utilisateur rejoignant un workspace existant ne choisit pas d’abonnement personnel.

## Implémentation Auth/session à faire

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
- [ ] Implémenter `/me` pour le rafraîchissement explicite du profil.
- [ ] Implémenter les redirections et messages d’expiration de session.

## Implémentation formulaires à faire

- [ ] Installer/configurer React Hook Form, Zod frontend et resolver.
- [ ] Créer les schémas frontend Auth alignés au contrat backend.
- [ ] Créer les primitives partagées de formulaire nécessaires.
- [ ] Créer `PasswordField` accessible avec Eye/EyeOff.
- [ ] Créer `AuthLayout` et le conteneur partagé `AuthEntry`.
- [ ] Implémenter LoginForm/LoginPage.
- [ ] Implémenter RegisterForm/RegisterPage.
- [ ] Implémenter ForgotPasswordForm/Page.
- [ ] Implémenter ResetPasswordForm/Page.
- [ ] Implémenter ChangePasswordForm dans Account/Security.
- [ ] Implémenter la transition Login/Register respectueuse de `prefers-reduced-motion`.
- [ ] Implémenter erreurs inline, focus premier invalide et feedback submit.
- [ ] Implémenter les attributs autocomplete corrects.

## Tests requis

### Unitaires

- [ ] reducer/slice Auth.
- [ ] transitions `checking` / `authenticated` / `unauthenticated`.
- [ ] schémas frontend Login/Register/Forgot/Reset/Change password.
- [ ] confirmation mot de passe frontend.
- [ ] composant PasswordField.

### Intégration

- [ ] requête protégée avec token valide.
- [ ] 401 → refresh réussi → requête rejouée une seule fois.
- [ ] plusieurs 401 simultanés → un seul appel refresh.
- [ ] refresh échoué → nettoyage Auth et cache.
- [ ] retry encore 401 → aucun second refresh.
- [ ] 401 login → aucun refresh automatique.
- [ ] login invalide affiche un message générique.
- [ ] register valide n’envoie pas `confirmPassword`.
- [ ] forgot password ne révèle jamais l’existence du compte.
- [ ] validation inline et focus premier champ invalide.
- [ ] double submit impossible pendant mutation.
- [ ] logout/logout-all/change-password nettoient cache et session conformément au contrat.

### E2E

- [ ] Login affiché par défaut.
- [ ] navigation Login → Register → Login avec URL correcte et transition non bloquante.
- [ ] login puis accès à une route protégée.
- [ ] reload navigateur avec refresh cookie valide → session restaurée sans flash Login.
- [ ] expiration access token pendant plusieurs appels → UX transparente et session conservée.
- [ ] refresh invalide/révoqué → retour Login avec message générique approprié.
- [ ] register → succès → Login.
- [ ] forgot/reset password complets.
- [ ] change password → toutes sessions déconnectées → Login.
- [ ] logout puis connexion d’une autre identité → aucune donnée résiduelle du compte précédent.
- [ ] retour vers l’URL protégée initialement demandée après authentification.

## Validation manuelle

- [ ] aucun token dans localStorage/sessionStorage.
- [ ] aucun refresh token accessible au JavaScript.
- [ ] aucun flash de contenu privé ou Login pendant le bootstrap.
- [ ] aucune boucle de refresh observable.
- [ ] aucun message technique JWT/AuthSession exposé à l’utilisateur.
- [ ] aucun plan/paiement dans le formulaire Register.
- [ ] Login/Register fluides, sobres et utilisables avec `prefers-reduced-motion`.
- [ ] password managers/autocomplete fonctionnels.
- [ ] comportement cohérent sur desktop/tablette/mobile.
- [ ] focus et navigation clavier corrects sur tous les formulaires Auth.
