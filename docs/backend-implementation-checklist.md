# SAAS-CORE-API — Checklist d’implémentation Backend Core V1

Dernière consolidation : 2026-08-30

## 1. Rôle du document

Ce document est la référence vivante d’avancement du Backend Core V1.

Il conserve simultanément :

1. l’architecture prévue par la checklist et l’ordre d’implémentation initiaux ;
2. l’état réellement observé dans le dépôt ;
3. les évolutions architecturales décidées pendant le développement.

Il ne remplace ni les contrats frontend/backend ni les documents de dette fonctionnelle.

### Statuts

- `[x] TERMINÉ` — implémenté et validé par les tests du lot ;
- `[ ] À FAIRE` — nécessaire avant le checkpoint Backend Core V1 Ready for Frontend ;
- `[ ] DETTE` — volontairement différé mais nécessaire avant une production réelle ou une phase ultérieure identifiée ;
- `[ ] DIFFÉRÉ` — non nécessaire au Core V1 actuel ;
- `[ ] HORS V1` — explicitement exclu du périmètre Core V1.

### Marqueurs d’évolution

- `AJOUTÉ EN COURS DE DÉVELOPPEMENT` — besoin apparu après la checklist initiale ;
- `REMPLACÉ PAR` — intention initiale conservée via une autre architecture ;
- `FUSIONNÉ AVEC` — responsabilité absorbée par un autre module ;
- `DIFFÉRÉ` — intention valide mais non bloquante pour le Core V1.

---

## 2. Configuration et socle technique

- [x] TERMINÉ — `package.json`, projet ESM, Node `>=24.7 <25`.
- [x] TERMINÉ — `backend/app.js`.
- [x] TERMINÉ — `backend/server.js` avec arrêt propre.
- [x] TERMINÉ — configuration environnement validée par Zod.
- [x] TERMINÉ — connexion MongoDB/Mongoose.
- [x] TERMINÉ — `.env.test` pour les tests.
- [x] TERMINÉ — Vitest + Supertest.
- [x] TERMINÉ — MongoDB replica set disponible pour les transactions.

## 3. Sécurité Express et contexte requête

- [x] TERMINÉ — Helmet.
- [x] TERMINÉ — CORS avec credentials.
- [x] TERMINÉ — `cookie-parser`.
- [x] TERMINÉ — rate limiting.
- [x] TERMINÉ — protection Mongoose `sanitizeFilter` et usage ciblé de `mongoose.trusted()` pour les opérateurs internes.
- [x] TERMINÉ — compression.
- [x] TERMINÉ — Morgan en développement.
- [x] TERMINÉ — request context avec `requestId`, IP et user-agent.
- [x] TERMINÉ — politique proxy intégrée selon configuration de l’application.

## 4. Gestion centralisée des erreurs

- [x] TERMINÉ — `AppError`.
- [x] TERMINÉ — `catchAsync`.
- [x] TERMINÉ — `errorHandler`.
- [x] TERMINÉ — `notFound`.
- [x] TERMINÉ — contrat d’erreur opérationnelle centralisé.

## 5. User / Auth

- [x] TERMINÉ — modèle User.
- [x] TERMINÉ — identité d’authentification locale séparée lorsque nécessaire.
- [x] TERMINÉ — validation Zod stricte Auth.
- [x] TERMINÉ — register.
- [x] TERMINÉ — login.
- [x] TERMINÉ — `/api/auth/me`.
- [x] TERMINÉ — mise à jour du profil utilisateur.
- [x] TERMINÉ — change-password.
- [x] TERMINÉ — forgot-password.
- [x] TERMINÉ — reset-password.
- [x] TERMINÉ — confirmation email après reset.
- [x] TERMINÉ — Argon2id utilisé pour les mots de passe. `REMPLACÉ PAR` rapport au bcrypt prévu initialement.
- [x] TERMINÉ — primitive réutilisable de confirmation du mot de passe actuel. `AJOUTÉ EN COURS DE DÉVELOPPEMENT`.

## 6. AuthSession / Refresh tokens

- [x] TERMINÉ — modèle AuthSession.
- [x] TERMINÉ — refresh token hashé.
- [x] TERMINÉ — cookie refresh HttpOnly.
- [x] TERMINÉ — rotation refresh.
- [x] TERMINÉ — logout.
- [x] TERMINÉ — logout-all.
- [x] TERMINÉ — révocation de session.
- [x] TERMINÉ — révocation de famille lors d’une réutilisation de token.
- [x] TERMINÉ — user-agent et IP de session.
- [x] TERMINÉ — expiration/TTL des sessions.

## 7. Seeds

- [x] TERMINÉ — seed Plans idempotent.
- [x] TERMINÉ — seed Super Admin idempotent.
- [x] TERMINÉ — rôles système créés par workspace lors de sa création. `REMPLACÉ PAR` rapport à un seed global de rôles.

## 8. Workspaces

- [x] TERMINÉ — modèle Workspace.
- [x] TERMINÉ — modèle WorkspaceMember.
- [x] TERMINÉ — création workspace transactionnelle.
- [x] TERMINÉ — créateur ajouté comme owner.
- [x] TERMINÉ — rôles système créés avec le workspace.
- [x] TERMINÉ — baseline Subscription Free créée avec le workspace.
- [x] TERMINÉ — listing des workspaces accessibles à l’utilisateur.
- [x] TERMINÉ — lecture du workspace courant via contexte tenant.
- [x] TERMINÉ — mise à jour du workspace.
- [x] TERMINÉ — gouvernance des statuts workspace.
- [ ] DETTE — fermeture/suppression fonctionnelle complète d’un workspace avant production réelle. Voir `docs/functional-debt-account-workspace-closure.md`.

## 9. Roles / Permissions

- [x] TERMINÉ — constantes centralisées de permissions.
- [x] TERMINÉ — modèle Role.
- [x] TERMINÉ — rôles système `owner`, `admin`, `manager`, `member`, `reader`.
- [x] TERMINÉ — `loadWorkspaceContext`.
- [x] TERMINÉ — `authorizePermission`.
- [x] TERMINÉ — routes workspace protégées par permissions explicites.
- [x] TERMINÉ — CRUD des rôles dans les limites du Core.
- [x] TERMINÉ — owner non assignable par les workflows ordinaires de membership.
- [x] TERMINÉ — migrations idempotentes lors de l’ajout de permissions aux rôles persistés.

## 10. Workspace Members / Invitations

- [x] TERMINÉ — listing paginé des membres.
- [x] TERMINÉ — invitation de membre.
- [x] TERMINÉ — acceptation d’invitation.
- [x] TERMINÉ — renvoi/révocation d’invitation.
- [x] TERMINÉ — changement de rôle membre.
- [x] TERMINÉ — suspension membre.
- [x] TERMINÉ — retrait membre.
- [x] TERMINÉ — quota `members` cohérent avec les règles de membership.
- [x] TERMINÉ — AuditLog des actions sensibles de membership/invitation.

## 11. Transfert de propriété Workspace

Bloc prévu par la checklist initiale, finalisé en lots O1 → O4.

- [x] TERMINÉ — transfert uniquement vers un membre actif.
- [x] TERMINÉ — permission dédiée `workspace:ownership:transfer`.
- [x] TERMINÉ — permission attribuée à owner uniquement, pas à admin.
- [x] TERMINÉ — migration idempotente des rôles owner existants.
- [x] TERMINÉ — vérification du rôle owner et du rôle de remplacement dans le workspace.
- [x] TERMINÉ — rôle de remplacement de l’ancien owner explicitement fourni, sans politique implicite `owner -> admin`.
- [x] TERMINÉ — invariant exactement un owner actif avant/après.
- [x] TERMINÉ — transaction MongoDB.
- [x] TERMINÉ — AuditLog `WORKSPACE_OWNERSHIP_TRANSFERRED` dans la transaction.
- [x] TERMINÉ — route `PATCH /api/workspaces/:workspaceId/ownership`.
- [x] TERMINÉ — validation Zod stricte.
- [x] TERMINÉ — confirmation renforcée par mot de passe actuel.
- [x] TERMINÉ — protection contre les transferts concurrents via sérialisation sur `Workspace.ownershipVersion`.
- [x] TERMINÉ — le transfert ne recrée ni ne prolonge un trial.

## 12. Plans

- [x] TERMINÉ — modèle Plan.
- [x] TERMINÉ — registre/seed Plans.
- [x] TERMINÉ — plan Free réel et limité.
- [x] TERMINÉ — `features` séparées des `limits`.
- [x] TERMINÉ — prix catalogue mensuel/annuel HT en minor units.
- [x] TERMINÉ — configuration de trial par Plan.
- [x] TERMINÉ — routes publiques de lecture des Plans nécessaires au Core.
- [x] TERMINÉ — administration Platform des Plans nécessaire au Core, dont archivage.
- [ ] DIFFÉRÉ — mutation commerciale avancée des Plans au-delà du périmètre actuel.

## 13. Subscriptions / Entitlements / Trial

- [x] TERMINÉ — modèle Subscription.
- [x] TERMINÉ — baseline Free et Subscription commerciale séparées par `kind`.
- [x] TERMINÉ — modèle UsageMetric.
- [x] TERMINÉ — `enforcePlanLimit` et réservation atomique de quota.
- [x] TERMINÉ — résolution d’entitlement effective.
- [x] TERMINÉ — lecture Subscription côté workspace avec permission dédiée.
- [x] TERMINÉ — administration Platform des Subscriptions nécessaire au Core.
- [x] TERMINÉ — suspend/resume/cancel/scheduled cancellation.
- [x] TERMINÉ — downgrade programmé et révocation du downgrade.
- [x] TERMINÉ — snapshots `currency` / `priceExclTaxMinor`.
- [x] TERMINÉ — remises/manual overrides du provider manuel dans le périmètre actuel.
- [x] TERMINÉ — TrialEligibility par fingerprint HMAC.
- [x] TERMINÉ — trial unique par identité commerciale.
- [x] TERMINÉ — changement de Plan pendant trial sans réinitialiser `trialEndsAt`.
- [x] TERMINÉ — retour volontaire Free pendant trial consomme définitivement l’éligibilité.
- [x] TERMINÉ — expiration automatique des trials via job.
- [x] TERMINÉ — activation payante manuelle avec ancrage de période.
- [ ] DETTE — Billing/Payment réel : provider de paiement, moyens de paiement, TVA/taxes, factures, webhooks et gestion définitive de `past_due`.

## 14. Files / Storage

- [x] TERMINÉ — Multer et middleware d’upload.
- [x] TERMINÉ — limite de taille.
- [x] TERMINÉ — filtrage MIME + inspection du type réel.
- [x] TERMINÉ — abstraction antivirus.
- [x] TERMINÉ — renommage sécurisé des fichiers.
- [x] TERMINÉ — rattachement strict au workspace.
- [x] TERMINÉ — modèle File et métadonnées/checksum.
- [x] TERMINÉ — stockage local de développement via abstraction de provider.
- [x] TERMINÉ — quotas `storage_bytes` et `file_uploads_monthly`.
- [x] TERMINÉ — lecture/listing/download sécurisé avec `file:read`.
- [x] TERMINÉ — soft delete avec `file:delete`.
- [x] TERMINÉ — libération du quota stockage au soft delete une seule fois.
- [x] TERMINÉ — purge physique différée après 30 jours.
- [x] TERMINÉ — job/runner `job:purge-files`.
- [x] TERMINÉ — AuditLog upload/rejet/delete/purge.
- [ ] DETTE — corbeille/restauration utilisateur. Voir `docs/functional-debt-file-trash-restore.md`.
- [ ] DIFFÉRÉ — provider cloud de stockage pour production.

## 15. AuditLog

- [x] TERMINÉ — modèle AuditLog immuable.
- [x] TERMINÉ — actor/workspace/organization/action/entityType/entityId/status/ipAddress/userAgent/metadata.
- [x] TERMINÉ — protection contre les clés sensibles dans metadata.
- [x] TERMINÉ — index de consultation principaux.
- [x] TERMINÉ — service `createAuditLog()` compatible transaction.
- [x] TERMINÉ — audits des actions Auth sensibles disponibles dans le Core.
- [x] TERMINÉ — audits Workspace/Members/Roles.
- [x] TERMINÉ — audits Subscription/Plan/Platform.
- [x] TERMINÉ — audits Files.
- [x] TERMINÉ — permission `audit:read`. `AJOUTÉ EN COURS DE DÉVELOPPEMENT`.
- [x] TERMINÉ — migration idempotente `audit:read` pour owner/admin existants.
- [x] TERMINÉ — `GET /api/workspaces/:workspaceId/audit-logs` read-only.
- [x] TERMINÉ — filtres/pagination/tri déterministe.
- [x] TERMINÉ — DTO frontend sans IP, user-agent ni metadata.
- [x] TERMINÉ — accès workspace owner/admin uniquement dans le Core actuel.
- [x] TERMINÉ — endpoint Platform global AuditLog réservé SUPER_ADMIN. `AJOUTÉ EN COURS DE DÉVELOPPEMENT`.

## 16. Platform Admin

La checklist initiale prévoyait `platform.controller.js` et `platform.service.js` génériques. L’architecture réelle les a remplacés par des sous-modules métier dédiés, conformément à l’architecture modulaire cible.

- [x] TERMINÉ — `platform.routes.js`.
- [x] TERMINÉ — contrôle de rôle Platform `SUPER_ADMIN`.
- [x] TERMINÉ — seed Super Admin.
- [x] TERMINÉ — sous-module Platform Users.
- [x] TERMINÉ — sous-module Platform Workspaces.
- [x] TERMINÉ — sous-module Platform Plans.
- [x] TERMINÉ — sous-module Platform Subscriptions.
- [x] TERMINÉ — sous-module Platform AuditLogs.
- [x] TERMINÉ — révocation des sessions lors des opérations Platform concernées.
- [x] TERMINÉ — `platform.controller.js` générique : `REMPLACÉ PAR` controllers par sous-domaine.
- [x] TERMINÉ — `platform.service.js` générique : `REMPLACÉ PAR` services par sous-domaine.

## 17. Jobs / maintenance déjà présents

- [x] TERMINÉ — expiration des trials.
- [x] TERMINÉ — finalisation des annulations programmées.
- [x] TERMINÉ — application des downgrades programmés.
- [x] TERMINÉ — purge différée des fichiers supprimés.
- [x] TERMINÉ — runners CLI dédiés et scripts npm.
- [ ] À FAIRE — audit final d’idempotence, rejouabilité, observabilité et procédures d’exploitation de tous les jobs.
- [ ] À FAIRE — vérifier s’il manque une réconciliation métier nécessaire au Core V1 ; ne pas créer de job générique sans invariant concret à protéger.

## 18. Migrations

- [x] TERMINÉ — indexes lifecycle Subscription.
- [x] TERMINÉ — permission `subscription:read`.
- [x] TERMINÉ — permission `audit:read`.
- [x] TERMINÉ — backfill UsageMetric members.
- [x] TERMINÉ — permission `member:invite`.
- [x] TERMINÉ — permission `file:read`.
- [x] TERMINÉ — permission `file:delete`.
- [x] TERMINÉ — permission `workspace:ownership:transfer`.
- [x] TERMINÉ — runners et scripts npm correspondants.

## 19. Notifications / API Keys / modèles optionnels

- [ ] DIFFÉRÉ — Notifications : aucun besoin Core concret ne justifie encore un centre de notifications générique.
- [ ] DIFFÉRÉ — API Keys : à introduire lorsqu’une API machine-to-machine / Make / Zapier / scripts / intégrations tierces devient réellement nécessaire.
- [ ] HORS V1 — Webhooks génériques sans provider ou événement concret.
- [ ] HORS V1 — fonctionnalités métier propres aux futurs SaaS construits sur le Core.

## 20. Dettes fonctionnelles explicitement conservées

- [ ] DETTE — fermeture/suppression compte utilisateur et workspace avant production réelle.
- [ ] DETTE — trash/restore Files.
- [ ] DETTE — Billing/Payment réel et fiscalité.
- [ ] DETTE — stockage cloud/antivirus de production selon environnement de déploiement.

## 21. Documentation / contrat frontend

- [x] TERMINÉ — `docs/frontend-backend-integration-contract.md` existe.
- [x] TERMINÉ — `docs/frontend-backend-subscription-contract.md` existe.
- [x] TERMINÉ — dettes fonctionnelles Account/Workspace Closure et File Trash/Restore documentées.
- [x] TERMINÉ — présente checklist backend vivante.
- [ ] À FAIRE — mettre à jour le contrat frontend/backend global avec les endpoints stabilisés depuis sa dernière révision : AuditLog workspace/Platform et transfert d’ownership notamment.
- [ ] À FAIRE — vérifier que Members/Invitations et Files F1/F2/F3 sont décrits conformément au HEAD réel.
- [ ] À FAIRE — préparer le checkpoint documentaire `Backend Core V1 Ready for Frontend`.
- [ ] DIFFÉRÉ — contrat UI/UX spécifique jusqu’au démarrage du frontend.

## 22. Qualité / sécurité / readiness

La synthèse de cadrage initiale définit le backend V1 comme prêt lorsque le périmètre est implémenté, les entrées strictement validées, les contrats uniformes, l’auth/sessions testées, les permissions centralisées, l’isolation tenant démontrée, les opérations critiques atomiques, les index adaptés, les secrets absents des sorties/logs, les quotas protégés, les actions sensibles auditées, l’environnement documenté, les seeds idempotents, OpenAPI aligné et la checklist vérifiée.

État actuel :

- [x] TERMINÉ — validation Zod stricte sur les endpoints développés.
- [x] TERMINÉ — authentification/sessions largement couvertes par tests.
- [x] TERMINÉ — permissions centralisées.
- [x] TERMINÉ — tests d’isolation tenant sur les domaines sensibles développés.
- [x] TERMINÉ — transactions sur les opérations multi-documents critiques.
- [x] TERMINÉ — quotas protégés côté backend.
- [x] TERMINÉ — actions sensibles auditées.
- [x] TERMINÉ — seeds/migrations conçus idempotents.
- [ ] À FAIRE — audit global des index MongoDB par rapport aux requêtes réellement utilisées.
- [ ] À FAIRE — audit final de non-exposition des secrets/PII dans réponses, erreurs et logs.
- [ ] À FAIRE — audit final des variables d’environnement et `.env.example`.
- [ ] À FAIRE — audit final des jobs et procédures d’exploitation.
- [ ] À FAIRE — exécuter et consigner une suite globale finale après les derniers hardenings.
- [ ] À FAIRE — OpenAPI décrivant le contrat réellement implémenté, si cette exigence de cadrage est maintenue pour le checkpoint Core V1.

## 23. Ordre restant recommandé avant le frontend

```text
C1  Checklist backend officielle                         TERMINÉ
H1  Audit jobs / maintenance / reconciliation            À FAIRE
H2  Audit index / secrets / env / operational hardening  À FAIRE
D1  Contrat frontend/backend Core global                 À FAIRE
R1  Suite globale finale + checkpoint readiness          À FAIRE
R2  OpenAPI : confirmer l’exigence puis produire/aligner À FAIRE
F0  Fondation frontend                                   APRÈS CHECKPOINT
```

## 24. Règle de maintenance

À la fin de chaque lot :

```text
cadrage
→ implémentation
→ tests ciblés
→ tests de régression
→ documentation/contrats si impact observable
→ mise à jour de cette checklist
→ commit
```

Ne jamais marquer un item `TERMINÉ` uniquement parce qu’un fichier existe : le comportement doit être implémenté et validé. Inversement, ne pas recréer artificiellement un fichier prévu historiquement lorsqu’une architecture plus modulaire remplit déjà la responsabilité.
