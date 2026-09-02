# SAAS-CORE-API — Contrat frontend/backend Account & Security

**Statut :** contrat Core V1 — F8.9 implémenté, validation finale requise  
**Date :** 2 septembre 2026

## 1. Objet

Ce document cadre les surfaces personnelles de l'utilisateur indépendamment de tout Workspace et de la console Platform.

Le compte utilisateur est global : ses informations de profil et de sécurité ne doivent pas être rattachées au workspace courant.

## 2. Profil courant

### Lecture

```text
GET /api/auth/me
```

Route authentifiée.

Réponse publique :

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "...",
      "firstName": "...",
      "lastName": "...",
      "email": "...",
      "emailVerifiedAt": null
    }
  }
}
```

`platformRole` est ajouté uniquement lorsque le compte possède le rôle `super_admin`.

### Modification

```text
PATCH /api/users/me
```

Route authentifiée.

Body strict et partiel :

```json
{
  "firstName": "Greg",
  "lastName": "Martin"
}
```

Au moins un des deux champs doit être fourni. Les valeurs sont trimées et limitées à 100 caractères.

Les champs suivants ne sont notamment pas modifiables par cette route :

- `email` ;
- `platformRole` ;
- `status` ;
- toute propriété interne du User.

La modification de l'adresse email est volontairement exclue tant qu'un workflow dédié de vérification de la nouvelle adresse n'est pas implémenté.

La réponse reprend le DTO public du User mis à jour.

## 3. Audit du profil

Une modification réussie produit :

```text
USER_PROFILE_UPDATED
```

avec :

```text
entityType = User
entityId   = utilisateur courant
workspace  = null
```

La trace est globale au compte et pourra être consultée par la future console Platform selon sa politique d'accès.

L'audit ne duplique pas les anciennes ou nouvelles valeurs personnelles. Sa metadata contient uniquement la liste des champs modifiés, par exemple :

```json
{
  "changedFields": ["firstName"]
}
```

## 4. Changement de mot de passe

```text
POST /api/auth/change-password
```

Route authentifiée.

Body :

```json
{
  "currentPassword": "...",
  "newPassword": "..."
}
```

Le frontend peut demander une confirmation du nouveau mot de passe, mais ce champ de confirmation reste purement UI et n'est jamais envoyé au backend.

Après succès :

- toutes les AuthSession existantes sont révoquées ;
- le refresh cookie courant est supprimé ;
- le frontend termine sa session locale ;
- une nouvelle authentification est obligatoire.

## 5. Révocation de toutes les sessions

```text
POST /api/auth/logout-all
```

Route authentifiée, réponse `204 No Content`.

Le frontend demande une confirmation explicite avant l'action. Après succès, l'utilisateur revient à la connexion.

Le Core V1 n'expose pas de listing des appareils/sessions actives. Une future gestion session-par-session nécessitera un contrat backend dédié ; le frontend ne doit pas inventer cette liste.

## 6. Mot de passe oublié

```text
POST /api/auth/forgot-password
```

Body :

```json
{
  "email": "user@example.com"
}
```

Le frontend doit conserver la réponse générique fournie par le backend afin de ne pas révéler si le compte existe.

## 7. Réinitialisation du mot de passe

Le lien envoyé par le backend pointe vers :

```text
/reset-password?token=<token-opaque>
```

Le frontend transmet :

```text
POST /api/auth/reset-password
```

avec :

```json
{
  "token": "...",
  "newPassword": "..."
}
```

Le token est opaque. Le frontend ne tente jamais d'en déduire l'identité, la validité ou l'expiration.

Après succès, les sessions existantes sont invalidées et l'utilisateur est redirigé vers la connexion.

## 8. Routes frontend

```text
/account/profile
/account/security
/forgot-password
/reset-password
```

`/account/*` est protégé par l'authentification.

Les deux parcours de récupération restent publics afin qu'un utilisateur puisse récupérer son compte indépendamment de l'état local de session du navigateur.

## 9. Gestion d'état frontend

- profil courant : RTK Query ;
- mutation du profil : RTK Query avec invalidation `CurrentUser` ;
- formulaires : React Hook Form + Zod ;
- confirmation locale de `logout-all` : `useState` ;
- aucun duplicat du User dans Redux Toolkit.

## 10. Hors périmètre F8.9

Restent explicitement hors de ce lot :

- changement d'email et vérification de la nouvelle adresse ;
- listing des sessions/appareils ;
- révocation d'une session individuelle ;
- MFA / passkeys ;
- suppression/clôture complète du compte, déjà suivie dans la dette fonctionnelle dédiée.
