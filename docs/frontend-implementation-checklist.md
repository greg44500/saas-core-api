# SAAS-CORE-API — Checklist d’implémentation Frontend Core

Dernière consolidation : 2026-09-02 — F8.6.1 Subscription / Plan / Trial en validation

## 1. Rôle du document

Cette checklist est la référence vivante d’avancement du frontend Core.

Elle complète les contrats frontend/backend et ne remplace pas les documents d’architecture ou de dette fonctionnelle.

Elle doit être mise à jour à la fin de chaque lot frontend validé.

### Statuts

- `[x] TERMINÉ` — implémenté et validé par les tests/build du lot ;
- `[ ] EN COURS` — lot actuellement développé ;
- `[ ] À FAIRE` — lot explicitement planifié ;
- `[ ] AUDIT` — contrôle transversal obligatoire ;
- `[ ] DETTE` — évolution différée et documentée.

---

## 2. Règles de maintenance frontend

- [ ] AUDIT — appliquer systématiquement la règle « commenter le pourquoi, pas le quoi » sur l’ensemble du frontend existant.
- [ ] AUDIT — ajouter du JSDoc lorsque le contrat d’un helper, composant partagé, adaptateur ou effet de bord non trivial le justifie.
- [ ] AUDIT — documenter les invariants de permissions, de sécurité, de navigation, de cache RTK Query et de compatibilité backend lorsqu’ils ne sont pas évidents.
- [ ] AUDIT — supprimer les commentaires redondants, obsolètes ou contradictoires avec le backend.
- [ ] AUDIT — relire tous les fichiers frontend dans le checkpoint `F8-AUDIT` avant F9.

Référence : `docs/frontend-maintenance-audit.md`.

## 3. Files frontend — F8.5

### F8.5.1 — Lecture / téléchargement

- [x] TERMINÉ — feature `frontend/src/features/files/` créée selon l’architecture par fonctionnalité.
- [x] TERMINÉ — listing paginé via RTK Query.
- [x] TERMINÉ — route `/workspaces/:workspaceId/files`.
- [x] TERMINÉ — accès frontend protégé par `file:read`.
- [x] TERMINÉ — entrée Fichiers dans la navigation Workspace selon permission effective.
- [x] TERMINÉ — états loading / error / empty / data.
- [x] TERMINÉ — téléchargement binaire via le `baseQueryWithReauth` existant.
- [x] TERMINÉ — tests ciblés et régression frontend validés.
- [x] TERMINÉ — build Vite validé.

### F8.5.2 — Upload sécurisé

- [x] TERMINÉ — action d’upload affichée uniquement avec `file:upload`.
- [x] TERMINÉ — dialogue d’upload dédié.
- [x] TERMINÉ — payload `FormData` avec fichier et catégorie.
- [x] TERMINÉ — validation frontend Zod des métadonnées et types déclarés acceptés.
- [x] TERMINÉ — aucune duplication frontend de la limite de taille configurable backend.
- [x] TERMINÉ — backend conservé comme autorité pour permission, plan, remédiation, taille, type réel, antivirus et quotas.
- [x] TERMINÉ — invalidation du cache `WorkspaceFiles` après succès.
- [x] TERMINÉ — messages backend conservés pour les refus métier/sécurité.
- [x] TERMINÉ — tests ciblés et régression frontend validés.
- [x] TERMINÉ — build Vite validé.

### F8.5.3 — Soft delete

- [x] TERMINÉ — action de suppression visible uniquement avec `file:delete`.
- [x] TERMINÉ — confirmation explicite avant suppression.
- [x] TERMINÉ — mutation `DELETE` via RTK Query.
- [x] TERMINÉ — invalidation du listing actif après suppression.
- [x] TERMINÉ — UX cohérente avec le cycle backend `active -> deleted -> purged`.
- [x] TERMINÉ — l’interface ne prétend pas qu’une vraie Corbeille existe tant que le listing/restauration ne sont pas exposés.
- [x] TERMINÉ — tests frontend globaux verts signalés le 2026-09-02.
- [x] TERMINÉ — build Vite vert signalé le 2026-09-02.

### Dette Files conservée

- [ ] DETTE — vue Corbeille utilisateur.
- [ ] DETTE — restauration d’un fichier supprimé avant purge.
- [ ] DETTE — réservation atomique de `storage_bytes` lors de la restauration.
- [ ] DETTE — permission/politique définitive de restauration.

Référence : `docs/functional-debt-file-trash-restore.md`.

## 4. Subscription / Plan / Trial frontend — F8.6

### F8.6.1 — Lecture consolidée

- [ ] EN COURS — feature `frontend/src/features/subscription/` créée par fonctionnalité.
- [ ] EN COURS — lecture consolidée via `GET /workspaces/:workspaceId/subscription` et RTK Query.
- [ ] EN COURS — route `/workspaces/:workspaceId/subscription` protégée par `subscription:read`.
- [ ] EN COURS — navigation Abonnement activée uniquement avec `subscription:read`.
- [ ] EN COURS — affichage du plan effectif depuis `effectiveEntitlement`, sans reconstruction frontend du fallback commercial → baseline.
- [ ] EN COURS — affichage du mode `normal` / `remediation` et des limites bloquantes réellement fournies par le backend.
- [ ] EN COURS — barre de progression du trial uniquement lorsque l’entitlement serveur confirme que le trial commercial est encore effectif.
- [ ] EN COURS — catalogue public des plans affiché en lecture seule avec les tarifs existants.
- [ ] EN COURS — distinction UX owner/admin : lecture pour les deux, commandes commerciales réservées au propriétaire.
- [ ] EN COURS — tests ciblés à valider.
- [ ] EN COURS — régression frontend globale et build Vite à valider.

### F8.6.2 — Trial et changement de plan

- [ ] À FAIRE — démarrage/changement de trial owner-only.
- [ ] À FAIRE — retour volontaire vers Free pendant trial avec confirmation explicite de consommation définitive de l’éligibilité.
- [ ] À FAIRE — étendre le contrat backend du catalogue avant UX de trial : `/api/plans` n’expose actuellement ni `trialEnabled` ni `trialDurationDays`, donc le frontend ne doit pas deviner l’éligibilité d’un plan.
- [ ] À FAIRE — invalidation/refetch systématique de `WorkspaceSubscription` après mutation au lieu de reconstruire localement l’entitlement.

### F8.6.3 — Cycle de vie commercial

- [ ] À FAIRE — programmation/révocation de résiliation owner-only.
- [ ] À FAIRE — programmation/révocation de downgrade owner-only.
- [ ] À FAIRE — affichage et confirmation des dates effectives.
- [ ] À FAIRE — conserver Billing/Payment réel hors périmètre tant que le provider n’est pas intégré.

## 5. Ordre de production frontend restant

```text
F8.5      Files frontend                              TERMINÉ
F8.6.1    Subscription / Plan / Trial — lecture        EN VALIDATION
F8.6.2    Trial / changement de plan                  À FAIRE
F8.6.3    Résiliation / downgrade                     À FAIRE
F8.7      Workspace Settings / Ownership frontend
F8.8      Audit / Dashboard Core frontend
F8.9      Account / Security frontend
F8-AUDIT  Maintenabilité + commentaires + JSDoc        OBLIGATOIRE AVANT F9
F9.x      Platform Admin frontend réel
F10       EntitlementOverride Workspace-scoped + Platform
F11       Consolidation frontend + E2E
```

## 6. Règle de validation de fin de lot

Un lot frontend ne doit être marqué TERMINÉ qu’après :

1. tests ciblés verts ;
2. régression frontend globale verte lorsque le lot peut affecter des parcours partagés ;
3. build Vite vert ;
4. vérification des permissions et contrats backend concernés ;
5. mise à jour de la présente checklist ;
6. documentation des décisions ou dettes nouvelles ;
7. absence de modification hors périmètre.

## 7. Gate avant modules métier

Aucun module métier ne doit démarrer avant la finalisation du Core frontend, le checkpoint F8-AUDIT et les validations E2E prévues dans le Gate A du projet.
