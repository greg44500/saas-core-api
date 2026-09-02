# SAAS-CORE-API — Rapport F8-AUDIT frontend

**Date :** 2 septembre 2026  
**Statut :** TERMINÉ — checkpoint validé avant F9

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

Relus : `auth`, `account`, `workspace`, `workspace-members`, `workspace-roles`, `workspace-invitation`, `files`, `plan`, `subscription`, `audit-log` et socle `platform`.

### Corrections appliquées

1. **Fin de session** — suppression des purges RTK Query répétées dans `auth-api.js`. Les mutations déclarent `sessionTerminated`; le store reste propriétaire de la purge.
2. **Pagination** — création de `components/data-display/data-pagination.jsx`. Membres, Files, Audit et la sélection paginée du transfert d’ownership utilisent désormais cette primitive ; les anciennes paginations spécifiques ont été supprimées.
3. **Confirmations** — création de `components/shared/confirmation-dialog.jsx`. La mécanique de modale, focus, Escape, navigation Tab et verrouillage du scroll est centralisée ; les règles métier restent dans les features.
4. **Membres** — la révocation d'une invitation participe désormais à l'état pending de la confirmation.
5. **Roles** — `workspace-roles/api` possède désormais le listing et les mutations `/roles`. Le cache reste unique via `baseApi`; la dépendance inversée vers `workspace-members/api` est supprimée.
6. **Workspace ownership** — la dépendance résiduelle vers `useListWorkspaceRolesQuery` dans `workspace-members/api` a été détectée par le build puis corrigée ; le composant consomme désormais le hook depuis `workspace-roles/api`.
7. **Code mort Auth** — suppression des anciens placeholders Login/Register de F5.
8. **Socle Platform** — suppression des wrappers de placeholders non utilisés ; le composant générique reste en place jusqu'à F9.

### Décisions conservées

- le Dashboard reste orchestré par `useWorkspaceDashboardData`, avec requêtes RTK Query conditionnées par permissions ;
- les paramètres Workspace restent composés de composants métier dédiés ;
- Audit utilise le `DatePicker` partagé ; la validation des dates issues de l'URL reste une sanitation de routing ;
- `PlanCard` conserve les actions injectées par le consommateur afin de ne pas mélanger onboarding, catalogue et abonnement ;
- les placeholders Platform encore routés restent intentionnels jusqu'à F9 ;
- les contrôles frontend de permissions restent une décision UX et ne remplacent jamais l'autorisation backend.

## Validation finale

Validation locale signalée verte le 2 septembre 2026 :

- tests ciblés F8-AUDIT : verts ;
- suite frontend globale : verte ;
- build Vite production : vert après correction de la dépendance Roles résiduelle.

## Conclusion

Le checkpoint **F8-AUDIT est clôturé**. Le Core frontend dispose désormais de primitives partagées pour les tableaux, paginations, confirmations, Drawer, Tooltip et dates, avec un ownership RTK Query clarifié par feature.

Le prochain bloc autorisé est **F9 — Platform Admin frontend réel**. Aucun module métier ne doit néanmoins démarrer avant les validations E2E prévues par le gate global du projet.
