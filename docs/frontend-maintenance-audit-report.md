# SAAS-CORE-API — Rapport F8-AUDIT frontend

**Date :** 2 septembre 2026  
**Statut :** EN COURS — checkpoint bloquant avant F9

## Objectif

Tracer les fichiers relus, les écarts détectés et les corrections appliquées pendant l'audit transversal de maintenabilité du frontend Core.

L'audit ne doit ajouter aucune fonctionnalité métier. Il vérifie la séparation des responsabilités, RTK Query, Redux, permissions, composants partagés, localisation, accessibilité, documentation du « pourquoi », code mort, tests et build.

## Phase 1 — socle transversal

### Périmètre relu

- `frontend/src/app/` — structure des providers et du router ;
- `frontend/src/services/api/base-api.js` ;
- `frontend/src/services/api/base-query.js` ;
- `frontend/src/store/store.js` ;
- `frontend/src/components/data-display/data-table.jsx` ;
- `frontend/src/components/data-display/data-table-styles.js` ;
- `frontend/src/components/shared/entity-details-drawer.jsx` ;
- inventaire de `frontend/src/components/shared/` ;
- inventaire de `frontend/src/features/`.

### Constats validés

1. Les données serveur sont centralisées dans une API slice RTK Query unique et ne sont pas recopiées dans des slices Redux métier.
2. La réauthentification est centralisée dans `base-query.js` avec mutex afin d'éviter les refresh concurrents.
3. La fin de session réinitialise le cache RTK Query, ce qui protège l'isolation des données lorsqu'un autre compte se connecte dans le même onglet.
4. Les routes importantes sont lazy-loadées au niveau des pages/modules, sans lazy loading artificiel des petits composants.
5. Le Drawer d'entité est une primitive partagée ; les features ne doivent pas recréer sa mécanique d'animation, focus et dialog.
6. Les tableaux Core utilisent désormais la primitive partagée `components/data-display/data-table.jsx`. Les espacements restent centralisés dans `data-table-styles.js`.
7. L'absence d'un dossier global `hooks/` n'est pas un défaut : aucun dossier vide ne doit être créé sans responsabilité transversale réelle.

### Corrections appliquées

- documentation de la raison de la purge RTK Query lors de `sessionTerminated` dans `store.js` ;
- documentation du choix d'une API slice RTK Query commune dans `base-api.js` ;
- ajout du contrat JSDoc et des invariants de maintenance au Drawer partagé ;
- le composant `DataTable` et son contrat restent la primitive obligatoire pour les tableaux futurs.

### Aucun changement fonctionnel

Cette phase ne modifie ni endpoint, ni permission, ni logique métier, ni espace/densité UI, ni navigation.

## Phase 2 — features Core

**À poursuivre avant clôture de F8-AUDIT.**

Périmètre à relire :

- `features/auth/` ;
- `features/account/` ;
- `features/workspace/` ;
- `features/workspace-members/` ;
- `features/workspace-roles/` ;
- `features/workspace-invitation/` ;
- `features/files/` ;
- `features/plan/` ;
- `features/subscription/` ;
- `features/audit-log/` ;
- `features/platform/` pour vérifier uniquement le socle/placeholder existant avant F9.

À rechercher explicitement : appels réseau hors RTK Query, duplication de primitives, logique d'autorisation non documentée, chaînes techniques visibles, calendriers locaux, code mort, commentaires inutiles/obsolètes et responsabilités trop lourdes dans les pages.

## Validation finale requise

F8-AUDIT ne pourra être déclaré terminé qu'après :

- revue de toutes les features du périmètre ;
- tests ciblés des fichiers modifiés ;
- suite frontend globale verte ;
- build Vite vert ;
- mise à jour de `docs/frontend-implementation-checklist.md`.
