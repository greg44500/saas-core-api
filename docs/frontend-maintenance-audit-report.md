# SAAS-CORE-API — Rapport F8-AUDIT frontend

**Date :** 2 septembre 2026  
**Statut :** EN COURS — checkpoint avant F9

## Objectif

Tracer la revue transversale du frontend Core sans ajouter de fonctionnalité métier : responsabilités, RTK Query, permissions, composants partagés, accessibilité, code mort, tests et build.

## Phase 1 — socle transversal

Relus : `app/`, `services/api/`, `store/`, `components/data-display/`, `components/shared/` et inventaire de `features/`.

Constats validés :

- une seule API slice RTK Query ;
- refresh centralisé avec mutex ;
- purge du cache à `sessionTerminated` centralisée dans le store ;
- lazy loading au niveau pages/modules ;
- `EntityDetailsDrawer` partagé ;
- `DataTable` obligatoire pour les tableaux compatibles ;
- aucun dossier global vide créé sans responsabilité réelle.

## Phase 2 — features Core

Relus à ce stade : `auth`, `account`, `workspace`, `workspace-members`, `workspace-roles`, `workspace-invitation`, `files`, `plan`, `subscription`, `audit-log` et socle `platform`.

### Corrections appliquées

1. **Fin de session** — suppression des purges RTK Query répétées dans `auth-api.js`. Les mutations déclarent `sessionTerminated`; le store reste propriétaire de la purge.
2. **Pagination** — création de `components/data-display/data-pagination.jsx`. Membres, Files et Audit utilisent désormais cette primitive ; les anciennes paginations spécifiques ont été supprimées.
3. **Confirmations** — création de `components/shared/confirmation-dialog.jsx`. La mécanique de modale, focus, Escape, navigation Tab et verrouillage du scroll est centralisée ; les règles métier restent dans les features.
4. **Membres** — la révocation d'une invitation participe désormais à l'état pending de la confirmation.
5. **Roles** — `workspace-roles/api` possède désormais le listing et les mutations `/roles`. Le cache reste unique via `baseApi`; la dépendance inversée vers `workspace-members/api` est supprimée.
6. **Code mort Auth** — suppression des anciens placeholders Login/Register de F5.
7. **Socle Platform** — suppression des wrappers de placeholders non utilisés ; le composant générique reste en place jusqu'à F9.

### Décisions conservées

- le Dashboard reste orchestré par `useWorkspaceDashboardData`, avec requêtes RTK Query conditionnées par permissions ;
- les paramètres Workspace restent composés de composants métier dédiés ;
- Audit utilise le `DatePicker` partagé ; la validation des dates issues de l'URL reste une sanitation de routing ;
- `PlanCard` conserve les actions injectées par le consommateur afin de ne pas mélanger onboarding, catalogue et abonnement ;
- les placeholders Platform encore routés restent intentionnels jusqu'à F9.

## Reste à clôturer

- derniers contrôles ciblés de code mort et de messages techniques ;
- tests ciblés des refactors F8-AUDIT ;
- suite frontend globale ;
- build Vite ;
- mise à jour de `docs/frontend-implementation-checklist.md` après validation.

F9 ne démarre pas avant clôture de ces validations.
