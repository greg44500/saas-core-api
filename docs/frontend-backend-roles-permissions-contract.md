# SAAS-CORE-API — Contrat frontend/backend Rôles & Permissions

**Statut :** contrat normatif pour F8.4
**Date :** 1 septembre 2026
**Périmètre :** administration des rôles d’un workspace et exposition de leurs permissions

## 1. Principes

Le backend est l’autorité de sécurité. Le frontend adapte l’UX à partir des permissions effectives de l’acteur, mais ne remplace jamais les contrôles serveur.

Les données de rôles sont des données serveur et doivent être consommées via RTK Query. Elles ne doivent pas être dupliquées dans un slice Redux classique.

Avant tout composant ou dépendance frontend lié à ce domaine, l’implémentation doit vérifier les composants réutilisables déjà présents dans `components/ui`, `components/shared` et `features/`.

## 2. Endpoints stabilisés

Préfixe :

```text
/api/workspaces/:workspaceId/roles
```

| Action | Endpoint | Permission requise |
| --- | --- | --- |
| Lister les rôles | `GET /api/workspaces/:workspaceId/roles` | `role:read` |
| Créer un rôle personnalisé | `POST /api/workspaces/:workspaceId/roles` | `role:create` |
| Modifier un rôle personnalisé | `PATCH /api/workspaces/:workspaceId/roles/:roleId` | `role:update` |
| Supprimer logiquement un rôle personnalisé | `DELETE /api/workspaces/:workspaceId/roles/:roleId` | `role:delete` |

Les mutations ordinaires passent par le contrôle du mode d’accès du workspace et peuvent être refusées lorsqu’un état bloquant interdit les mutations.

## 3. DTO Role

Les lectures, créations et modifications exposent la même forme publique :

```json
{
  "id": "<roleId>",
  "key": "custom-...",
  "name": "Support",
  "description": "Accès support client",
  "permissions": [
    "workspace:read",
    "member:read"
  ],
  "isSystem": false,
  "isEditable": true
}
```

Le frontend doit utiliser `permissions[]` comme source de vérité de ce que le rôle accorde. Il peut maintenir uniquement une table de présentation `permission -> libellé/catégorie`.

## 4. Listing

```text
GET /api/workspaces/:workspaceId/roles
```

Réponse :

```json
{
  "status": "success",
  "data": {
    "roles": []
  }
}
```

Les rôles soft-deleted sont exclus de ce listing.

## 5. Création

Body strict :

```json
{
  "name": "Support",
  "description": "Accès support client",
  "permissions": [
    "workspace:read",
    "member:read"
  ]
}
```

Règles de validation :

- `name` : 2 à 80 caractères après trim ;
- `description` : `null` ou chaîne de 500 caractères maximum ;
- `permissions` : tableau de 100 entrées maximum ;
- toute propriété supplémentaire est refusée ;
- `key`, `isSystem`, `isEditable`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy` ne sont jamais pilotables par le client.

Réponse : `201 Created` avec `data.role`.

## 6. Modification

Body strict contenant au moins un champ :

```json
{
  "name": "Support avancé",
  "description": null,
  "permissions": [
    "workspace:read",
    "member:read",
    "file:read"
  ]
}
```

Seuls `name`, `description` et `permissions` sont modifiables.

Réponse : `200 OK` avec `data.role`.

## 7. Suppression

```text
DELETE /api/workspaces/:workspaceId/roles/:roleId
```

Réponse : `204 No Content`.

La suppression est logique. Le rôle reste conservé pour préserver les références historiques et l’audit.

La suppression est refusée si le rôle est encore :

- attribué à un membre `active` ou `suspended` ;
- utilisé par une invitation `pending`.

Le frontend doit donc présenter un refus `409` comme une contrainte de dépendance et non comme une erreur technique.

## 8. Rôles système

Les rôles système `owner`, `admin`, `manager`, `member`, `reader` sont protégés.

Un rôle dont `isSystem === true` ou `isEditable !== true` ne peut pas être modifié ou supprimé par les commandes génériques de rôles.

Le frontend doit :

- permettre leur consultation lorsque l’acteur possède `role:read` ;
- ne pas afficher d’action Modifier/Supprimer sur ces rôles ;
- expliquer qu’ils sont gérés par le socle.

Le frontend ne doit pas déduire les droits d’un utilisateur à partir de la clé du rôle. Les permissions effectives restent la source UX.

## 9. Registre et anti-escalade

Une permission affectée à un rôle personnalisé doit :

1. appartenir au registre actif du backend ;
2. être détenue par l’acteur qui crée ou modifie le rôle ;
3. ne pas appartenir au registre des permissions réservées à la gouvernance.

En Core V1, `workspace:ownership:transfer` est réservée au workflow d’ownership et ne peut pas être ajoutée à un rôle personnalisé, y compris par le owner.

Le frontend doit filtrer les permissions proposées selon les permissions effectives de l’acteur pour améliorer l’UX. Ce filtrage ne constitue pas une barrière de sécurité.

## 10. Erreurs métier principales

- `400` : permission inconnue ou inactive, ou body invalide ;
- `403` : permission de gouvernance réservée, tentative d’anti-escalade, permission d’action absente ;
- `404` : rôle absent du workspace ou déjà soft-deleted ;
- `409` : rôle système/non éditable, rôle encore utilisé par un membre ou une invitation.

Le frontend s’appuie d’abord sur le statut HTTP et le contexte de l’action. Il ne doit pas construire sa logique métier en parsant le texte des messages.

## 11. Audit

Les mutations sont auditées dans la même transaction MongoDB :

```text
ROLE_CREATED
ROLE_UPDATED
ROLE_DELETED
```

Le frontend n’a pas à produire lui-même ces AuditLogs.

## 12. Composants frontend à réutiliser en F8.4b

Les composants déjà validés constituent la base du bloc :

```text
components/shared/entity-details-drawer.jsx
features/workspace-roles/components/permission-list.jsx
features/workspace-roles/components/role-permissions-drawer.jsx
```

F8.4b doit composer ou étendre ces composants au lieu de recréer une seconde représentation des permissions ou un nouveau drawer métier équivalent.

## 13. État frontend cible

- `useState` : rôle sélectionné, ouverture/fermeture des panneaux, état du formulaire local ;
- RTK Query : listing, création, modification, suppression des rôles ;
- Redux Toolkit classique : aucun rôle ni permission serveur dupliqué.

## 14. Tests attendus F8.4b

- lecture des rôles et permissions ;
- distinction rôle système / personnalisé ;
- actions conditionnées par `can(role:create/update/delete)` ;
- absence d’édition/suppression des rôles système ;
- formulaire strict côté UX ;
- permissions proposées limitées à celles détenues par l’acteur et hors permission réservée ;
- invalidation RTK Query après mutations ;
- affichage exploitable des erreurs `400/403/404/409` ;
- réutilisation des composants F8.3a.
