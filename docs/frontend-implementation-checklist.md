# SAAS-CORE-API — Checklist d’implémentation Frontend Core

Dernière consolidation : 2026-09-02 — F8.6.3, F8.7 et F8.8.1 validés ; F8.8.2 Dashboard Core ouvert

## 1. Rôle du document

Cette checklist est la référence vivante d’avancement du frontend Core.

Elle complète les contrats frontend/backend et ne remplace pas les documents d’architecture ou de dette fonctionnelle.

Elle doit être mise à jour à la fin de chaque lot frontend validé.

### Statuts

- `[x] TERMINÉ` — implémenté et validé par les tests/build du lot ;
- `[ ] EN COURS` — lot actuellement développé ou en validation finale ;
- `[ ] À FAIRE` — lot explicitement planifié ;
- `[ ] AUDIT` — contrôle transversal obligatoire ;
- `[ ] DETTE` — évolution différée et documentée.

---

## 2. Règles de maintenance frontend

- [ ] AUDIT — appliquer systématiquement la règle « commenter le pourquoi, pas le quoi » sur l’ensemble du frontend existant.
- [ ] AUDIT — ajouter du JSDoc lorsque le contrat d’un helper, composant partagé, adaptateur ou effet de bord non trivial le justifie.
- [ ] AUDIT — documenter les invariants de permissions, de sécurité, de navigation, de cache RTK Query et de compatibilité backend lorsqu’ils ne sont pas évidents.
- [ ] AUDIT — supprimer les commentaires redondants, obsolètes ou contradictoires avec le backend.
- [ ] AUDIT — toutes les chaînes visibles par l’utilisateur doivent être en français ; les clés techniques restent internes ou passent par un formateur de présentation.
- [ ] AUDIT — les contrôles natifs dont le libellé dépend du navigateur doivent disposer d’un habillage localisé lorsqu’il est pertinent.
- [ ] AUDIT — éviter les mentions techniques répétitives sans valeur décisionnelle dans les tableaux ; masquer une action reste une décision UX et ne remplace jamais la sécurité backend.
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

### Correctifs UX transversaux appliqués après F8.5

- [x] TERMINÉ — sélecteur de fichier natif habillé par une UI entièrement française ; tests/régression validés le 2026-09-02.
- [x] TERMINÉ — suppression des mentions répétitives « Protégé » / « Niveau supérieur » dans les tableaux Rôles et Membres ; tests/régression validés le 2026-09-02.
- [x] TERMINÉ — statuts Membres/Invitations localisés en français par une couche de présentation ; tests/régression validés le 2026-09-02.

### Dette Files conservée

- [ ] DETTE — vue Corbeille utilisateur.
- [ ] DETTE — restauration d’un fichier supprimé avant purge.
- [ ] DETTE — réservation atomique de `storage_bytes` lors de la restauration.
- [ ] DETTE — permission/politique définitive de restauration.

Référence : `docs/functional-debt-file-trash-restore.md`.

## 4. Subscription / Plan / Trial frontend — F8.6

### F8.6.1 — Lecture consolidée

- [x] TERMINÉ — feature `frontend/src/features/subscription/` créée par fonctionnalité.
- [x] TERMINÉ — lecture consolidée via `GET /workspaces/:workspaceId/subscription` et RTK Query.
- [x] TERMINÉ — route `/workspaces/:workspaceId/subscription` protégée par `subscription:read`.
- [x] TERMINÉ — navigation Abonnement activée uniquement avec `subscription:read`.
- [x] TERMINÉ — affichage du plan effectif depuis `effectiveEntitlement`, sans reconstruction frontend du fallback commercial → baseline.
- [x] TERMINÉ — affichage du mode `normal` / `remediation` et des limites bloquantes réellement fournies par le backend.
- [x] TERMINÉ — barre de progression du trial uniquement lorsque l’entitlement serveur confirme que le trial commercial est encore effectif.
- [x] TERMINÉ — catalogue public des plans affiché en lecture seule avec les tarifs existants.
- [x] TERMINÉ — distinction UX owner/admin : lecture pour les deux, commandes commerciales réservées au propriétaire.
- [x] TERMINÉ — tests ciblés et régression frontend signalés verts le 2026-09-02.
- [x] TERMINÉ — build Vite signalé vert le 2026-09-02.

### F8.6.2 — Trial et changement de plan

- [x] TERMINÉ — catalogue public backend étendu avec `trialEnabled` et `trialDurationDays` afin que le frontend ne déduise jamais l’éligibilité d’un plan.
- [x] TERMINÉ — vue Subscription backend étendue avec `trialEligibility.consumed` sans exposer l’empreinte d’identité.
- [x] TERMINÉ — démarrage/changement de trial owner-only.
- [x] TERMINÉ — changement de plan pendant trial sans promesse de prolongation de `trialEndsAt`.
- [x] TERMINÉ — retour volontaire vers Free avec confirmation explicite de consommation définitive de l’éligibilité.
- [x] TERMINÉ — invalidation systématique de `WorkspaceSubscription` après mutation au lieu de reconstruire localement l’entitlement.
- [x] TERMINÉ — périodicité mensuelle/annuelle choisie explicitement, sans moyen de paiement requis pendant le trial.
- [x] TERMINÉ — outil CLI `dev:reset-trial` ajouté pour rejouer les scénarios en développement sans bypass de la règle métier ; `NODE_ENV=development`, `ALLOW_DEVELOPMENT_DATA_RESET=true`, cible explicite et confirmation obligatoires.
- [x] TERMINÉ — tests backend/frontend ciblés, régressions globales et builds signalés verts le 2026-09-02.

### F8.6.3 — Cycle de vie commercial

- [x] TERMINÉ — programmation/révocation de résiliation owner-only validées.
- [x] TERMINÉ — programmation/révocation de downgrade owner-only validées.
- [x] TERMINÉ — affichage et confirmation des dates effectives validés.
- [x] TERMINÉ — actions incompatibles filtrées côté UX sans remplacer les invariants backend.
- [x] TERMINÉ — invalidation/refetch de `WorkspaceSubscription` après chaque mutation validé.
- [x] TERMINÉ — Billing/Payment réel reste explicitement hors périmètre tant que le provider n’est pas intégré.
- [x] TERMINÉ — tests ciblés, régression frontend globale et build Vite signalés verts le 2026-09-02 après correction Drawer.

### Correctif UX transversal — Drawer partagé

- [x] TERMINÉ — `frontend/src/components/shared/entity-details-drawer.jsx` anime ouverture et fermeture depuis la droite avec transition de 300 ms.
- [x] TERMINÉ — voile de fond avec fondu synchronisé.
- [x] TERMINÉ — contenu métier conservé pendant la phase de sortie afin d’éviter le démontage instantané des wrappers.
- [x] TERMINÉ — interactions désactivées pendant la sortie et `aria-hidden` positionné sur le panneau fermé.
- [x] TERMINÉ — ombre partagée légère appliquée au composant générique.
- [x] TERMINÉ — tests partagés et tests réels Membres/Rôles validés ; vérification visuelle de fermeture smooth confirmée le 2026-09-02.

## 5. Workspace Settings / Ownership frontend — F8.7

- [x] TERMINÉ — contrat backend `PATCH /workspaces/:workspaceId` audité avant raccordement frontend.
- [x] TERMINÉ — modification limitée au champ `name` réellement accepté par la validation backend.
- [x] TERMINÉ — accès UI à la modification conditionné par `workspace:update`.
- [x] TERMINÉ — transfert de propriété raccordé à `PATCH /workspaces/:workspaceId/ownership`.
- [x] TERMINÉ — transfert exposé uniquement avec `workspace:ownership:transfer`.
- [x] TERMINÉ — sélection du nouveau propriétaire limitée aux membres actifs non-owner.
- [x] TERMINÉ — rôle de remplacement de l’ancien owner explicitement choisi.
- [x] TERMINÉ — confirmation forte par mot de passe courant conservée conformément au backend.
- [x] TERMINÉ — confirmation explicite des conséquences avant soumission.
- [x] TERMINÉ — invalidation RTK Query du workspace et des membres après transfert.
- [x] TERMINÉ — redirection vers le dashboard après transfert réussi afin de recharger le contexte de permissions.
- [x] TERMINÉ — limitation connue des comptes Google-only conservée en dette existante ; aucun contournement frontend introduit.
- [x] TERMINÉ — tests ciblés, régression frontend globale et build Vite signalés verts le 2026-09-02.

## 6. Audit / Dashboard Core frontend — F8.8

### F8.8.1 — Historique d’activité Workspace

- [x] TERMINÉ — feature `frontend/src/features/audit-log/` créée selon l’architecture par fonctionnalité.
- [x] TERMINÉ — consommation de `GET /workspaces/:workspaceId/audit-logs` via RTK Query.
- [x] TERMINÉ — accès UI et route protégés par `audit:read`.
- [x] TERMINÉ — entrée `Activité` ajoutée à la navigation Workspace uniquement selon permission effective.
- [x] TERMINÉ — affichage paginé de l’action, acteur, ressource, statut et dates.
- [x] TERMINÉ — libellés techniques traduits par une couche de présentation dédiée sans altérer les clés backend.
- [x] TERMINÉ — date relative complétée par une date absolue lisible.
- [x] TERMINÉ — filtres Action / Ressource / Statut / Période alignés sur le contrat backend.
- [x] TERMINÉ — état des filtres et pagination conservé dans l’URL.
- [x] TERMINÉ — paramètres URL invalides normalisés avant l’appel API sans remplacer la validation backend.
- [x] TERMINÉ — aucune IP, user-agent ou metadata sensible exposée côté frontend.
- [x] TERMINÉ — filtre `actorId` volontairement non exposé tant qu’aucun contrat de recherche d’acteurs autonome à `audit:read` n’existe.
- [x] TERMINÉ — tests ciblés, régression frontend globale et build Vite signalés verts le 2026-09-02.

### F8.8.2 — Dashboard Core

- [ ] EN COURS — auditer les données réellement exposées par le backend avant toute carte ou KPI.
- [ ] À FAIRE — afficher uniquement des indicateurs dérivables de contrats backend existants et autorisés.
- [ ] À FAIRE — respecter les permissions de lecture de chaque source ; aucune requête additionnelle ne doit contourner le RBAC.
- [ ] À FAIRE — privilégier la composition de composants de synthèse réutilisables plutôt qu’une logique lourde dans la page.
- [ ] À FAIRE — prévoir états loading / error / unavailable par section sans rendre le dashboard inutilisable si une permission manque.
- [ ] À FAIRE — tests ciblés + régression frontend + build Vite avant clôture.

## 7. Ordre de production frontend restant

```text
F8.5      Files frontend                              TERMINÉ
F8.6.1    Subscription / Plan / Trial — lecture       TERMINÉ
F8.6.2    Trial / changement de plan                  TERMINÉ
F8.6.3    Résiliation / downgrade                     TERMINÉ
F8.7      Workspace Settings / Ownership frontend     TERMINÉ
F8.8.1    Audit Workspace frontend                    TERMINÉ
F8.8.2    Dashboard Core frontend                     EN COURS
F8.9      Account / Security frontend                 À FAIRE
F8-AUDIT  Maintenabilité + commentaires + JSDoc       OBLIGATOIRE AVANT F9
F9.x      Platform Admin frontend réel
F10       EntitlementOverride Workspace-scoped + Platform
F11       Consolidation frontend + E2E
```

## 8. Règle de validation de fin de lot

Un lot frontend ne doit être marqué TERMINÉ qu’après :

1. tests ciblés verts ;
2. régression frontend globale verte lorsque le lot peut affecter des parcours partagés ;
3. build Vite vert ;
4. vérification des permissions et contrats backend concernés ;
5. mise à jour de la présente checklist ;
6. documentation des décisions ou dettes nouvelles ;
7. absence de modification hors périmètre.

## 9. Gate avant modules métier

Aucun module métier ne doit démarrer avant la finalisation du Core frontend, le checkpoint F8-AUDIT et les validations E2E prévues dans le Gate A du projet.
