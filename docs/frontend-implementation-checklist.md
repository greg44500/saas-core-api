# SAAS-CORE-API — Checklist d’implémentation Frontend Core

Dernière consolidation : 2026-09-03 — F9 complet ; checkpoint de généricité Capability Registry validé avant F10.2

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

- [x] TERMINÉ — appliquer systématiquement la règle « commenter le pourquoi, pas le quoi » sur l’ensemble du frontend existant.
- [x] TERMINÉ — ajouter du JSDoc lorsque le contrat d’un helper, composant partagé, adaptateur ou effet de bord non trivial le justifie.
- [x] TERMINÉ — documenter les invariants de permissions, de sécurité, de navigation, de cache RTK Query et de compatibilité backend lorsqu’ils ne sont pas évidents.
- [x] TERMINÉ — supprimer les commentaires redondants, obsolètes ou contradictoires avec le backend.
- [x] TERMINÉ — toutes les chaînes visibles par l’utilisateur doivent être en français ; les clés techniques restent internes ou passent par un formateur de présentation.
- [x] TERMINÉ — les contrôles natifs dont le libellé dépend du navigateur doivent disposer d’un habillage localisé lorsqu’il est pertinent.
- [x] TERMINÉ — les saisies de date utilisent la primitive partagée `components/forms/date-picker.jsx` : présentation `jj/mm/aaaa`, calendrier français, valeur technique `YYYY-MM-DD` ; aucune feature ne recrée son propre calendrier sans besoin nouveau explicite.
- [x] TERMINÉ — la densité des tableaux Core utilise `components/data-display/data-table-styles.js` et les tableaux compatibles utilisent `components/data-display/data-table.jsx` afin d’éviter les structures et espacements dupliqués.
- [x] TERMINÉ — les listes paginées compatibles utilisent `components/data-display/data-pagination.jsx` afin de centraliser les bornes et contrôles de navigation.
- [x] TERMINÉ — les confirmations bloquantes compatibles utilisent `components/shared/confirmation-dialog.jsx` afin de centraliser structure accessible, focus, Escape, navigation Tab et verrouillage du scroll.
- [x] TERMINÉ — éviter les mentions techniques répétitives sans valeur décisionnelle dans les tableaux ; masquer une action reste une décision UX et ne remplace jamais la sécurité backend.
- [x] TERMINÉ — checkpoint `F8-AUDIT` effectué avant F9.

Références : `docs/frontend-maintenance-audit.md`, `docs/frontend-maintenance-audit-report.md` et `docs/frontend-data-table-contract.md`.

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
- [x] TERMINÉ — changement de Plan pendant trial sans promesse de prolongation de `trialEndsAt`.
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
- [x] TERMINÉ — import de `useListWorkspaceRolesQuery` aligné sur l’ownership du module `workspace-roles/api` ; régression détectée puis corrigée par le build F8-AUDIT.
- [x] TERMINÉ — pagination de sélection des membres raccordée à `DataPagination` sans duplication locale.
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

- [x] TERMINÉ — audit des contrats backend disponibles effectué avant implémentation ; aucune nouvelle route backend requise.
- [x] TERMINÉ — synthèse implémentée à partir du workspace courant, membres, invitations, fichiers, abonnement et activité selon permissions.
- [x] TERMINÉ — requêtes Membres/Fichiers/Invitations limitées à `limit=1` pour exploiter uniquement `meta.total` sans charger les listes complètes.
- [x] TERMINÉ — chaque requête RTK Query est `skip` lorsque la permission correspondante manque ; aucun contournement RBAC.
- [x] TERMINÉ — composants de synthèse séparés de la page et hook de composition `useWorkspaceDashboardData` dédié.
- [x] TERMINÉ — états loading / error / unavailable isolés afin qu’une source indisponible ne bloque pas tout le dashboard.
- [x] TERMINÉ — activité récente limitée aux cinq derniers événements et lien vers l’historique complet.
- [x] TERMINÉ — plan et mode d’accès lus exclusivement depuis `effectiveEntitlement` et formatters Subscription existants.
- [x] TERMINÉ — `storage_bytes` et `file_uploads_monthly` ne sont pas affichés : les métriques existent en interne mais aucun contrat de lecture dédié n’expose leur valeur courante au frontend.
- [x] TERMINÉ — tests ciblés, régression frontend globale et build Vite validés le 2026-09-02.
- [x] DÉCISION FIGÉE — ce Dashboard Core est provisoire ; aucun enrichissement supplémentaire avant cadrage des modules métier. Le futur Dashboard Workspace sera prioritairement orienté données métier.

## 7. Account / Security frontend — F8.9

- [x] TERMINÉ — routes protégées `/account/profile` et `/account/security` avec layout Account global indépendant du workspace.
- [x] TERMINÉ — `PATCH /api/users/me` raccordé au frontend pour `firstName` / `lastName` uniquement ; email en lecture seule.
- [x] TERMINÉ — cache `CurrentUser` RTK Query invalidé après modification du profil.
- [x] TERMINÉ — changement de mot de passe raccordé au contrat backend et reconnexion obligatoire après succès.
- [x] TERMINÉ — `logout-all` avec confirmation explicite ; aucune annonce de succès lorsque le backend refuse la révocation.
- [x] TERMINÉ — pages publiques `/forgot-password` et `/reset-password` raccordées au workflow backend sécurisé.
- [x] TERMINÉ — lien « Mot de passe actuel oublié ? » depuis Sécurité ; réutilisation du workflow de reset existant sans contournement de la réauthentification.
- [x] TERMINÉ — email courant prérempli dans le parcours forgot-password lorsqu’il vient de la page Sécurité.
- [x] TERMINÉ — bouton explicite « Retour à l’application » depuis Account ; retour exact au Workspace/Platform d’origine lorsque connu, fallback `/workspaces` ou `/platform/overview` selon le contexte.
- [x] TERMINÉ — destination de retour conservée entre Profil/Sécurité et à travers le détour forgot-password.
- [x] TERMINÉ — tests ciblés Account/Auth, régression frontend globale et build Vite validés avant clôture F8.

### Correctifs UX transversaux de finalisation F8

- [x] TERMINÉ — `components/forms/date-picker.jsx` devient la primitive date partagée : interface française, placeholder `jj/mm/aaaa`, navigation calendrier française, valeur technique ISO locale `YYYY-MM-DD`.
- [x] TERMINÉ — filtres Audit migrés du `type="date"` natif vers le DatePicker partagé.
- [x] TERMINÉ — `components/data-display/data-table-styles.js` centralise les espacements des tableaux Core (`headerCell`, `bodyCell`, `actionGroup`).
- [x] TERMINÉ — `components/data-display/data-table.jsx` centralise la structure des tableaux compatibles ; Rôles, Membres, Fichiers et Audit l’utilisent.
- [x] TERMINÉ — `components/data-display/data-pagination.jsx` centralise la pagination compatible ; Membres, Fichiers, Audit et Workspace Ownership l’utilisent.
- [x] TERMINÉ — `components/shared/confirmation-dialog.jsx` centralise les confirmations bloquantes compatibles sans absorber les règles métier des features.
- [x] TERMINÉ — `components/shared/tooltip.jsx` ne dépend plus de `group-focus-within`; un tooltip d’action est masqué après activation même si le bouton conserve le focus pendant l’ouverture d’un Drawer.
- [x] TERMINÉ — le Tooltip conserve néanmoins son accessibilité au focus clavier.
- [x] TERMINÉ — tests ciblés DatePicker / Tooltip / tableaux / pagination / confirmations / Account et validation globale signalés verts le 2026-09-02.

## 8. F8-AUDIT — Maintenabilité frontend

- [x] TERMINÉ — revue transversale du socle `app`, `services/api`, `store`, composants partagés et data-display.
- [x] TERMINÉ — revue des features `auth`, `account`, `workspace`, `workspace-members`, `workspace-roles`, `workspace-invitation`, `files`, `plan`, `subscription`, `audit-log` et du socle `platform`.
- [x] TERMINÉ — purge RTK Query de fin de session centralisée uniquement dans le store.
- [x] TERMINÉ — ownership de la ressource `/roles` déplacé dans `workspace-roles/api` tout en conservant une seule instance `baseApi`.
- [x] TERMINÉ — code mort Auth et wrappers Platform inutilisés supprimés.
- [x] TERMINÉ — primitives `DataPagination` et `ConfirmationDialog` introduites uniquement après duplication concrètement constatée.
- [x] TERMINÉ — aucune modification des règles métier, endpoints, permissions backend ou densité des tableaux pendant l’audit.
- [x] TERMINÉ — tests ciblés verts signalés le 2026-09-02.
- [x] TERMINÉ — suite frontend globale verte signalée le 2026-09-02.
- [x] TERMINÉ — build Vite production vert signalé le 2026-09-02 après correction de l’import Roles résiduel dans Workspace Ownership.

Référence : `docs/frontend-maintenance-audit-report.md`.

## 9. Platform Admin frontend — F9

### F9.0 — Audit backend Platform

- [x] TERMINÉ — authentification racine `/api/platform` et gardes Platform vérifiées sur chaque domaine.
- [x] TERMINÉ — contrats Users, Workspaces, Plans, Subscriptions et Audit Logs audités avant raccordement frontend.
- [x] TERMINÉ — backend conservé comme unique autorité d’autorisation ; `PlatformGuard` reste une garde UX.
- [x] TERMINÉ — contrat consolidé dans `docs/frontend-platform-admin-contract.md`.

### F9.1 — RTK Query Platform

- [x] TERMINÉ — un seul `baseApi` conservé ; aucun second `createApi`.
- [x] TERMINÉ — tags Platform ajoutés au fur et à mesure des domaines sans duplication de state serveur.

### F9.2 — Users Platform

- [x] TERMINÉ — liste paginée réelle via `DataTable` / `DataPagination`.
- [x] TERMINÉ — détail via `EntityDetailsDrawer`.
- [x] TERMINÉ — désactivation/réactivation, révocation des sessions et changement de rôle raccordés aux routes sécurisées.
- [x] TERMINÉ — contraintes self/dernier super-admin laissées au backend avec gardes UX complémentaires.
- [x] TERMINÉ — tests du lot validés avant passage à Workspaces.

### F9.3 — Workspaces Platform

- [x] TERMINÉ — liste et détail réels raccordés aux routes Platform.
- [x] TERMINÉ — suspension/réactivation via `ConfirmationDialog`, motifs structurés et règle `other` respectés.
- [x] TERMINÉ — acteurs du détail enrichis côté backend par DTO minimal `{ id, firstName, lastName, email }` avec projection minimale.
- [x] TERMINÉ — `sanitizeFilter` conservé globalement ; `$in` interne marqué `mongoose.trusted()` au lieu de désactiver la protection.
- [x] TERMINÉ — identifiants historiques conservés côté DTO si un User n’est plus résoluble, sans provoquer de 500.
- [x] TERMINÉ — IDs techniques des personnes masqués dans le Drawer ; nom/email privilégiés pour l’administration.
- [x] TERMINÉ — tests ciblés, régression globale et build validés.

### F9.4 — Plans Platform

- [x] TERMINÉ — `GET /api/platform/plans/capabilities` ajouté pour exposer le registre backend de features/métriques.
- [x] TERMINÉ — formulaire de création/modification alimenté dynamiquement par le registre backend ; aucune seconde source métier frontend.
- [x] TERMINÉ — `trialEnabled` / `trialDurationDays` intégrés au contrat Platform avec validation atomique.
- [x] TERMINÉ — création de plan imposant toutes les métriques du registre ; absence d’une métrique considérée comme configuration invalide.
- [x] TERMINÉ — sémantique des limites figée : `null = illimité`, `0 = aucune consommation`, entier positif = plafond.
- [x] TERMINÉ — création, modification, détail et archivage raccordés au backend ; aucun faux restore de plan archivé.
- [x] TERMINÉ — `DataTable`, `DataPagination`, `EntityDetailsDrawer`, `ConfirmationDialog` et Toast partagés réutilisés ; aucun tableau spécifique dupliqué.
- [x] TERMINÉ — correctif accessibilité Drawer : IDs `aria-labelledby` / `aria-describedby` uniques par instance via `useId()`.
- [x] TERMINÉ — tests backend globaux verts signalés le 2026-09-03.
- [x] TERMINÉ — tests frontend globaux verts signalés le 2026-09-03.
- [x] TERMINÉ — build Vite vert signalé le 2026-09-03.

### F9.5 — Subscriptions Platform

- [x] TERMINÉ — backend réaudité avant toute UI ; routes, validation et invariants de mutation conservés comme source d’autorité.
- [x] TERMINÉ — DTO de liste normalisé explicitement ; aucune forme Mongoose `lean()`/`populate()` brute exposée au frontend.
- [x] TERMINÉ — DTO de détail durci par projection explicite avec `kind`, `scheduledChange`, plan cible et acteurs minimaux.
- [x] TERMINÉ — `PlatformSubscriptions` intégré au `baseApi` RTK Query existant ; aucun second cache serveur.
- [x] TERMINÉ — liste paginée raccordée avec `DataTable` / `DataPagination` et route réelle `/platform/subscriptions`.
- [x] TERMINÉ — détail via `EntityDetailsDrawer` avec données de cycle, remise, changement programmé et dérogation administrative.
- [x] TERMINÉ — grant trial administratif raccordé à `POST /api/platform/subscriptions/grant-trial` sans contourner l’éligibilité backend.
- [x] TERMINÉ — modification administrative raccordée avec plan, périodicité, remise %/montant fixe, motif, date de fin et dérogation manuelle.
- [x] TERMINÉ — suppression d’une remise nettoie côté payload valeur, motif et échéance ; backend reste autorité finale.
- [x] TERMINÉ — annulation immédiate/fin de période et reprise d’annulation programmée raccordées avec `ConfirmationDialog`.
- [x] TERMINÉ — les DTO partiels de mutation ne deviennent jamais une source d’état frontend ; invalidation/refetch RTK Query systématique après succès.
- [x] TERMINÉ — `DatePicker` partagé réutilisé pour `discountEndsAt` ; aucune primitive date spécifique dupliquée.
- [x] TERMINÉ — tests backend ciblés, tests frontend ciblés, régression frontend globale et build Vite signalés verts le 2026-09-03.

### F9.6 — Audit Logs Platform

- [x] TERMINÉ — contrat backend Platform Audit Logs réaudité avant UI ; route read-only protégée et validation stricte confirmées.
- [x] TERMINÉ — liste paginée et filtres Action / Ressource / Statut / Période raccordés au contrat réel.
- [x] TERMINÉ — `DataTable`, `DataPagination` et `DatePicker` partagés réutilisés ; aucun tableau ou calendrier spécifique.
- [x] TERMINÉ — aucune IP, user-agent ou metadata sensible exposée dans le DTO frontend.
- [x] TERMINÉ — filtres `actorId` et `workspaceId` volontairement non exposés dans l’UI tant qu’un lookup scalable dédié n’est pas disponible.
- [x] TERMINÉ — état des filtres/pagination centralisé dans l’URL avec helper partagé Audit Logs.
- [x] TERMINÉ — tests ciblés, régression frontend globale et build Vite signalés verts le 2026-09-03.

### Checkpoint de généricité avant F10.2

- [x] TERMINÉ — registre actif applicatif unique introduit côté backend ; le frontend ne dépend plus d’un catalogue limité aux seules capabilities Core.
- [x] TERMINÉ — `GET /api/platform/plans/capabilities` expose `featureDefinitions` et les présentations des métriques tout en conservant les clés techniques existantes.
- [x] TERMINÉ — formulaire Plans groupé dynamiquement par catégories à partir des métadonnées backend ; aucune checkbox métier codée en dur.
- [x] TERMINÉ — fallback de présentation conservé pour les capabilities déclarées sans métadonnées riches.
- [x] TERMINÉ — une capability métier déclarée par l’application dérivée peut apparaître dans Platform sans modifier `PlatformPlanForm`.
- [x] TERMINÉ — correction finale limitée au test d’accessibilité de la checkbox métier ; aucun comportement fonctionnel modifié.
- [x] TERMINÉ — tests frontend ciblés, régression frontend globale et build Vite signalés verts le 2026-09-03.
- [x] TERMINÉ — contrat canonique documenté dans `docs/application-capability-registry-contract.md`.

## 10. Ordre de production frontend restant

```text
F8.5      Files frontend                              TERMINÉ
F8.6.1    Subscription / Plan / Trial — lecture       TERMINÉ
F8.6.2    Trial / changement de plan                  TERMINÉ
F8.6.3    Résiliation / downgrade                     TERMINÉ
F8.7      Workspace Settings / Ownership frontend     TERMINÉ
F8.8.1    Audit Workspace frontend                    TERMINÉ
F8.8.2    Dashboard Core frontend                     TERMINÉ
F8.9      Account / Security frontend                 TERMINÉ
F8-AUDIT  Maintenabilité + composants partagés        TERMINÉ
F9.0      Audit backend Platform                      TERMINÉ
F9.1      RTK Query Platform                          TERMINÉ
F9.2      Users Platform                              TERMINÉ
F9.3      Workspaces Platform                         TERMINÉ
F9.4      Plans Platform                              TERMINÉ
F9.5      Subscriptions Platform                      TERMINÉ
F9.6      Audit Logs Platform                         TERMINÉ
GEN-CAP   Registry applicatif + permissions Platform  TERMINÉ
F10.2     Composition entitlement effectif            PROCHAIN BLOC
F10.3     Intégration features/quotas/remédiation     À FAIRE
F10.4     API Platform EntitlementOverride            À FAIRE
F10.5     Exposition Workspace entitlement effectif   À FAIRE
F10.6     Frontend Platform dérogations                À FAIRE
F11       Consolidation frontend + E2E                À FAIRE
```

## 11. Règle de validation de fin de lot

Un lot frontend ne doit être marqué TERMINÉ qu’après :

1. tests ciblés verts ;
2. régression frontend globale verte lorsque le lot peut affecter des parcours partagés ;
3. build Vite vert ;
4. vérification des permissions et contrats backend concernés ;
5. mise à jour de la présente checklist ;
6. documentation des décisions ou dettes nouvelles ;
7. absence de modification hors périmètre.

## 12. Gate avant modules métier

Aucun module métier ne doit démarrer avant la finalisation du Core frontend et les validations E2E prévues dans le Gate A du projet.

F8, F8-AUDIT, F9 et le checkpoint de généricité du Capability Registry sont validés. La production poursuit avec F10.2 puis F10.3 à F10.6, avant F11 et l’ouverture des modules métier.

Le Dashboard Workspace actuel reste un prototype Core technique. Sa refonte orientée données métier est explicitement reportée au cadrage du premier domaine métier.
