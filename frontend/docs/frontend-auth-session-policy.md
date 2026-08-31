# SAAS-CORE-API — Politique Auth/session Frontend

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1

## 1. Objectif

Ce document fixe les règles de gestion de session frontend en cohérence avec le contrat backend actuel.

Le backend expose notamment :

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/logout-all
POST /api/auth/change-password
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
```

Le login et le refresh retournent un `accessToken` dans le JSON. Le refresh token reste uniquement dans un cookie HttpOnly géré par le navigateur/backend.

## 2. Access token

L’access token est conservé en mémoire uniquement.

```text
access token
→ Redux Toolkit / état mémoire central
→ jamais localStorage
→ jamais sessionStorage
```

Un slice Auth minimal peut contenir l’état client strictement nécessaire, par exemple :

```text
accessToken
authStatus
```

Les données serveur utilisateur ne doivent pas être dupliquées inutilement si RTK Query ou une réponse Auth constitue déjà une source adaptée.

## 3. Refresh token

Le refresh token :

```text
→ cookie HttpOnly
→ inaccessible au JavaScript
→ jamais copié dans Redux, localStorage ou sessionStorage
```

Le frontend ne connaît jamais sa valeur.

Les appels Auth concernés utilisent la configuration de credentials nécessaire pour que le navigateur transporte le cookie.

## 4. Bootstrap de session

Au rechargement de la SPA, l’access token mémoire est perdu.

Le bootstrap suit :

```text
application démarre
↓
authStatus = checking
↓
POST /api/auth/refresh
↓
succès
├── nouveau access token en mémoire
├── refresh cookie rotaté par le backend
└── session authentifiée

échec
└── session non authentifiée
```

L’interface protégée ne doit pas afficher brièvement la page Login avant la résolution du bootstrap.

Le backend renvoyant déjà `user + accessToken` lors du refresh, un appel `/me` systématique immédiatement après chaque refresh n’est pas requis.

`/me` reste utile lorsqu’un rafraîchissement explicite du profil est nécessaire.

## 5. Base API centralisée

Toutes les requêtes protégées RTK Query passent par une base API unique.

L’Authorization Bearer est ajouté centralement lorsque l’access token existe.

```text
baseApi
└── baseQueryWithReauth
    ├── prepareHeaders
    ├── Bearer token
    ├── gestion 401
    └── refresh centralisé
```

Aucun composant ou endpoint de feature ne doit reconstruire manuellement le header Authorization.

## 6. Gestion centralisée des 401

Pour une requête protégée :

```text
requête
↓
401
↓
refresh
↓
succès
├── stocker nouveau token
└── rejouer une seule fois la requête initiale

échec
├── vider état Auth
├── nettoyer cache RTK Query sensible
└── session non authentifiée
```

La logique n’est jamais dupliquée dans les features.

## 7. Un seul refresh simultané — décision critique

Le backend utilise la rotation du refresh token avec consommation unique et détection de réutilisation.

Plusieurs requêtes protégées peuvent recevoir `401` simultanément lorsque l’access token expire.

Le frontend doit garantir qu’un seul appel `/auth/refresh` est actif à la fois :

```text
premier 401
→ acquiert le verrou
→ exécute refresh

autres 401 simultanés
→ attendent le même cycle de refresh

refresh réussi
→ tous réutilisent le nouveau token
→ chacun rejoue sa requête une fois
```

Un mutex/verrou partagé ou mécanisme équivalent est requis.

Ce comportement évite les rotations concurrentes du même refresh token et protège contre les échecs artificiels liés à la réutilisation d’un token déjà consommé.

## 8. Pas de boucle de refresh

Une requête n’est rejouée qu’une seule fois après refresh.

```text
401
→ refresh
→ retry
→ encore 401
→ STOP
```

Le frontend ne doit jamais créer une boucle `401 → refresh → 401 → refresh`.

## 9. Endpoints Auth exclus du reauth automatique

Les 401 provenant d’endpoints publics Auth ne déclenchent pas automatiquement le mécanisme de refresh lorsque le 401 représente l’échec naturel de l’opération.

Exemples :

```text
login
refresh lui-même
register
forgot-password
reset-password
```

## 10. Login

```text
formulaire
→ POST /auth/login
→ succès
   ├── refresh cookie posé par backend
   ├── access token en mémoire
   ├── user disponible
   └── navigation post-login déterministe
```

Le frontend ne manipule jamais directement le refresh cookie.

## 11. Register

Le backend actuel ne connecte pas automatiquement l’utilisateur après inscription et ne retourne pas d’access token.

Après inscription réussie :

```text
message de succès
→ redirection Login
→ invitation à se connecter
```

Aucun auto-login artificiel n’est ajouté côté frontend.

## 12. Logout courant

`POST /auth/logout` reste utilisable même lorsque l’access token a expiré.

Après logout :

```text
clear access token
reset cache RTK Query sensible
reset état Auth
redirect Login
```

Le nettoyage du cache évite l’affichage résiduel de données d’une identité précédente.

## 13. Logout-all

`POST /auth/logout-all` nécessite un access token valide et révoque toutes les sessions actives.

L’action est située dans :

```text
Account
→ Security
→ Sessions
```

Une confirmation explicite doit indiquer que toutes les sessions, y compris la session courante, seront déconnectées.

Après succès : clear Auth, reset cache RTK Query, retour Login.

## 14. Change password

Le backend révoque toutes les sessions après changement de mot de passe.

Après succès :

```text
clear Auth
reset cache RTK Query
message de confirmation
redirect Login
```

Le frontend ne tente pas de conserver la session.

## 15. Reset password

Le reset de mot de passe révoque les sessions et ne crée pas de nouvelle session.

Après succès :

```text
message de succès
→ Login
```

Si un état Auth local existait, il doit être nettoyé.

## 16. Forgot password

Le backend protège contre l’énumération de comptes avec une réponse générique.

Le frontend doit préserver cette propriété : aucun message ne doit révéler qu’un email existe ou non.

## 17. Expiration réelle de session

Lorsque le refresh échoue définitivement :

```text
session terminée
→ nettoyage Auth/cache
→ Login
```

Un message UX générique peut indiquer que la session a expiré.

Les codes de sécurité internes, détails JWT, AuthSession ou familles de refresh ne sont jamais exposés à l’utilisateur.

## 18. Destination demandée

Lorsqu’une authentification est requise pour une URL protégée, la destination initiale est préservée par le router lorsque possible.

Après login, l’utilisateur revient vers cette destination si elle reste autorisée.

La destination de navigation appartient au router, pas au store global sauf justification future spécifique.

## 19. Nettoyage du cache lors d’un changement d’identité

Les cas suivants entraînent un nettoyage des données serveur sensibles :

```text
logout
logout-all
change-password
reset-password si session locale existait
échec définitif refresh
connexion d’une autre identité
```

RTK Query utilise un reset centralisé du cache (`api.util.resetApiState()` ou abstraction équivalente).

## 20. Répartition des responsabilités

```text
Form state              → outil formulaire
Access token/lifecycle  → Redux Toolkit / mémoire
Server state            → RTK Query
Refresh credential      → cookie HttpOnly navigateur/backend
Navigation              → React Router
```

Cette politique est normative pour l’implémentation F0.3 et les futurs modules frontend.