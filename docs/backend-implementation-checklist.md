# SAAS-CORE-API — Checklist d’implémentation Backend Core V1

Dernière consolidation : 2026-09-02 — checkpoint RBAC-EXT, avant régression globale post-extension

## 1. Rôle du document

Ce document est la référence vivante d’avancement du Backend Core V1.

Il conserve simultanément :

1. l’architecture prévue par la checklist et l’ordre d’implémentation initiaux ;
2. l’état réellement observé dans le dépôt ;
3. les évolutions architecturales décidées pendant le développement ;
4. les dettes explicitement différées avant production commerciale.

Il ne remplace ni les contrats frontend/backend ni les documents de dette fonctionnelle.

### Statuts

- `[x] TERMINÉ` — implémenté et validé par les tests du lot ;
- `[ ] À FAIRE` — travail restant explicitement planifié ;
- `[ ] DETTE` — volontairement différé mais nécessaire avant une production réelle ou une phase ultérieure identifiée ;
- `[ ] DIFFÉRÉ` — non nécessaire au Core V1 actuel ;
- `[ ] HORS V1` — explicitement exclu du périmètre Core V1.

### Marqueurs d’évolution

- `AJOUTÉ EN COURS DE DÉVELOPPEMENT` — besoin apparu après la checklist initiale ;
- `REMPLACÉ PAR` — intention initiale conservée via une autre architecture ;
- `FUSIONNÉ AVEC` — responsabilité absorbée par un autre module ;
- `SUPPLANTÉ` — ancienne décision explicitement remplacée et ne devant plus guider l’implémentation ;
- `DIFFÉRÉ` — intention valide mais non bloquante pour le Core V1.

---

## 2. Configuration et socle technique

- [x] TERMINÉ — `package.json`, projet ESM, Node `>=24.7 <25`.
- [x] TERMINÉ — `backend/app.js`.
- [x] TERMINÉ — `backend/server.js` avec arrêt propre.
- [x] TERMINÉ — configuration environnement validée par Zod.
- [x] TERMINÉ — variables sensibles de production protégées contre les placeholders connus.
- [x] TERMINÉ — `CLIENT_URL` impose HTTPS en production et accepte HTTP/HTTPS selon l’environnement.
- [x] TERMINÉ — connexion MongoDB/Mongoose.
- [x] TERMINÉ — `autoIndex` désactivé en production ; index de production gérés par migrations.
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
- [x] TERMINÉ — politique proxy intégrée selon configuration réelle.

## 4. Gestion centralisée des erreurs

- [x] TERMINÉ — `AppError`.
- [x] TERMINÉ — `catchAsync`.
- [x] TERMINÉ — `errorHandler`.
- [x] TERMINÉ — `notFound`.
- [x] TERMINÉ — contrat d’erreur opérationnelle centralisé.
- [x] TERMINÉ — erreurs techniques inattendues masquées côté HTTP en production.
- [x] TERMINÉ — journalisation serveur limitée à des champs sûrs ; aucun objet `Error` brut issu d’une dépendance n’est journalisé.

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
- [x] TERMINÉ — Argon2id utilisé pour les mots de passe. `REMPLACÉ PAR` rapport au bcrypt initialement prévu.
- [x] TERMINÉ — primitive réutilisable de confirmation du mot de passe actuel.

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
- [x] TERMINÉ — seed Plans ne réécrit pas silencieusement un plan existant.
- [x] TERMINÉ — seed Super Admin idempotent.
- [x] TERMINÉ — seed Super Admin transactionnel et refusant toute promotion implicite d’un utilisateur existant.
- [x] TERMINÉ — rôles système créés par Workspace lors de sa création. `REMPLACÉ PAR` rapport à un seed global de rôles.
- [x] TERMINÉ — chaque seed exécutable est exposé par un script npm et contrôlé par test d’exploitation.

## 8. Workspaces

- [x] TERMINÉ — modèle Workspace.
- [x] TERMINÉ — modèle WorkspaceMember.
- [x] TERMINÉ — création Workspace transactionnelle.
- [x] TERMINÉ — créateur ajouté comme owner.
- [x] TERMINÉ — rôles système créés avec le Workspace.
- [x] TERMINÉ — baseline Subscription Free créée avec le Workspace.
- [x] TERMINÉ — listing des Workspaces accessibles à l’utilisateur.
- [x] TERMINÉ — lecture du Workspace courant via contexte tenant.
- [x] TERMINÉ — mise à jour du Workspace.
- [x] TERMINÉ — gouvernance des statuts Workspace.
- [x] TERMINÉ — capacité structurelle multi-workspace conservée via les memberships ; le frontend ne suppose pas un seul Workspace par User.
- [ ] À FAIRE AVANT EXPOSITION PUBLIQUE — figer une politique serveur explicite avant d’autoriser librement la création de Workspaces supplémentaires par une même identité.
- [ ] DETTE — fermeture/suppression fonctionnelle complète d’un Workspace avant production réelle. Voir `docs/functional-debt-account-workspace-closure.md`.

## 9. Roles / Permissions

- [x] TERMINÉ — constantes centralisées de permissions Core.
- [x] TERMINÉ — modèle Role.
- [x] TERMINÉ — rôles système `owner`, `admin`, `manager`, `member`, `reader`.
- [x] TERMINÉ — `loadWorkspaceContext`.
- [x] TERMINÉ — `authorizePermission`.
- [x] TERMINÉ — routes Workspace protégées par permissions explicites.
- [x] TERMINÉ — CRUD sécurisé des rôles personnalisés.
- [x] TERMINÉ — rôles système protégés contre modification/suppression ordinaire.
- [x] TERMINÉ — owner non assignable par les workflows ordinaires de membership.
- [x] TERMINÉ — permission `workspace:ownership:transfer` réservée au workflow owner et non délégable à un rôle personnalisé.
- [x] TERMINÉ — anti-escalade : un acteur ne peut créer, modifier, attribuer ou administrer un rôle contenant une permission qu’il ne possède pas.
- [x] TERMINÉ — validation des permissions inconnues/inactives dans le service.
- [x] TERMINÉ — `createRolePermissionRegistry()` fournit un registre RBAC extensible et immuable. `RBAC-EXT`.
- [x] TERMINÉ — `DEFAULT_ROLE_PERMISSION_REGISTRY` conserve le comportement Core par défaut. `RBAC-EXT`.
- [x] TERMINÉ — injection possible du registre de permissions dans les validations et services de rôles personnalisés. `RBAC-EXT`.
- [x] TERMINÉ — politique explicite d’extension des permissions des rôles système via `createSystemRoleDefinitions()`. `RBAC-EXT`.
- [x] TERMINÉ — le Core ne déduit pas la sémantique des permissions applicatives et ne choisit pas automatiquement les rôles qui doivent les recevoir. `RBAC-EXT`.
- [x] TERMINÉ — tests ciblés RBAC-EXT verts le 2026-09-02 : registre, extension, CRUD, permissions inconnues/réservées, anti-escalade, rôles système et backfill.
- [ ] VALIDATION FINALE DU LOT — suite globale backend post-RBAC-EXT à exécuter avant clôture définitive du checkpoint.

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
- [x] TERMINÉ — vérification du rôle owner et du rôle de remplacement dans le Workspace.
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
- [x] TERMINÉ — `Plan.limits` extensible via Map.
- [x] TERMINÉ — prix catalogue mensuel/annuel HT en minor units.
- [x] TERMINÉ — configuration de trial par Plan.
- [x] TERMINÉ — routes publiques de lecture des Plans nécessaires au Core.
- [x] TERMINÉ — administration Platform des Plans nécessaire au Core, dont archivage.
- [x] TERMINÉ — registre de capabilities Plan extensible par une future application sans ajouter ses features/métriques au Core.
- [ ] DIFFÉRÉ — mutation commerciale avancée des Plans au-delà du périmètre actuel.
- [ ] À CONFIRMER AVANT BILLING RÉEL — valeurs commerciales définitives Free/Premium/IA et confirmation du prix Premium par Workspace.

## 13. Subscriptions / Entitlements / Trial

- [x] TERMINÉ — modèle Subscription.
- [x] TERMINÉ — Subscription reste Workspace-scoped dans l’architecture V1 active.
- [x] TERMINÉ — baseline Free et Subscription commerciale séparées par `kind`.
- [x] TERMINÉ — modèle UsageMetric Workspace-scoped.
- [x] TERMINÉ — `enforcePlanLimit` et réservation atomique de quota.
- [x] TERMINÉ — résolution d’entitlement effective.
- [x] TERMINÉ — lecture Subscription côté Workspace avec permission dédiée.
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
- [x] SUPPLANTÉ — architecture `CommercialAccount`, abonnement Premium couvrant 5 Workspaces, métrique `workspaces` et scope `commercial_account` abandonnés pour la V1.
- [ ] À FAIRE PLUS TARD — `EntitlementOverride` Workspace-scoped pour les exceptions commerciales Platform, après reprise de la finalisation frontend Core.
- [ ] DETTE — Billing/Payment réel : provider de paiement, moyens de paiement, TVA/taxes, factures, webhooks et gestion définitive de `past_due`.

## 14. Files / Storage

- [x] TERMINÉ — Multer et middleware d’upload.
- [x] TERMINÉ — limite de taille.
- [x] TERMINÉ — filtrage MIME + inspection du type réel.
- [x] TERMINÉ — abstraction antivirus.
- [x] TERMINÉ — renommage sécurisé des fichiers.
- [x] TERMINÉ — rattachement strict au Workspace.
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
- [x] TERMINÉ — audits Auth sensibles disponibles dans le Core.
- [x] TERMINÉ — audits Workspace/Members/Roles.
- [x] TERMINÉ — audits Subscription/Plan/Platform.
- [x] TERMINÉ — audits Files.
- [x] TERMINÉ — permission `audit:read`.
- [x] TERMINÉ — migration idempotente `audit:read` pour owner/admin existants.
- [x] TERMINÉ — `GET /api/workspaces/:workspaceId/audit-logs` read-only.
- [x] TERMINÉ — filtres/pagination/tri déterministe.
- [x] TERMINÉ — DTO frontend sans IP, user-agent ni metadata.
- [x] TERMINÉ — accès Workspace owner/admin uniquement dans le Core actuel.
- [x] TERMINÉ — endpoint Platform global AuditLog réservé SUPER_ADMIN.

## 16. Platform Admin

La checklist initiale prévoyait `platform.controller.js` et `platform.service.js` génériques. L’architecture réelle les a remplacés par des sous-modules dédiés conformément à l’architecture modulaire cible.

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
- [ ] À FAIRE PLUS TARD — administration Platform des `EntitlementOverride` Workspace-scoped.

## 17. Jobs / maintenance déjà présents

- [x] TERMINÉ — expiration des trials.
- [x] TERMINÉ — finalisation des annulations programmées.
- [x] TERMINÉ — application des downgrades programmés.
- [x] TERMINÉ — purge différée des fichiers supprimés.
- [x] TERMINÉ — runners CLI dédiés et scripts npm.
- [x] TERMINÉ — audit d’idempotence, rejouabilité et concurrence des jobs lifecycle.
- [x] TERMINÉ — traitements Subscription bornés par batch (`100` par défaut, `500` maximum), sans `skip()`, avec tri déterministe et indicateur `hasMore`.
- [x] TERMINÉ — purge Files bornée, tri déterministe, idempotence et `hasMore`.
- [x] TERMINÉ — les runners journalisent un résultat exploitable et propagent l’échec au scheduler via code de sortie/rejet approprié.
- [x] TERMINÉ — aucun job de réconciliation générique ajouté sans invariant métier concret ; une réconciliation ciblée UsageMetric `members` est fournie sous forme de migration rejouable.

## 18. Migrations

- [x] TERMINÉ — migration `Subscription.kind` et index d’unicité `workspace + kind`.
- [x] TERMINÉ — preflight du runner `Subscription.kind` avant suppression de l’index legacy.
- [x] TERMINÉ — indexes lifecycle Subscription.
- [x] TERMINÉ — indexes opérationnels alignés sur les requêtes/jobs Core V1 via migration additive forward-only.
- [x] TERMINÉ — migrations d’indexes fail-fast en cas de définition incompatible ; aucune suppression destructive implicite.
- [x] TERMINÉ — permission `subscription:read`.
- [x] TERMINÉ — permission `audit:read`.
- [x] TERMINÉ — backfill UsageMetric `members`.
- [x] TERMINÉ — réconciliation forward-only UsageMetric `members`, y compris remise à zéro d’une métrique obsolète.
- [x] TERMINÉ — permission `member:invite`.
- [x] TERMINÉ — permission `file:read`.
- [x] TERMINÉ — permission `file:delete`.
- [x] TERMINÉ — permission `workspace:ownership:transfer`.
- [x] TERMINÉ — migrations historiques conservées immuables ; corrections tardives ajoutées sous forme de migrations forward-only.
- [x] TERMINÉ — `backfillRegisteredSystemRolePermissions()` fournit un backfill générique idempotent des permissions enregistrées vers les rôles système existants. `RBAC-EXT`.
- [x] TERMINÉ — le backfill RBAC-EXT ne modifie jamais les rôles personnalisés.
- [x] TERMINÉ — tests ciblés du backfill RBAC-EXT verts.

## 19. Notifications / API Keys / modèles optionnels

- [ ] DIFFÉRÉ — Notifications : aucun besoin Core concret ne justifie encore un centre de notifications générique.
- [ ] DIFFÉRÉ — API Keys : à introduire lorsqu’une API machine-to-machine / Make / Zapier / scripts / intégrations tierces devient réellement nécessaire.
- [ ] HORS V1 — Webhooks génériques sans provider ou événement concret.
- [ ] HORS V1 — fonctionnalités métier propres aux futurs SaaS construits sur le Core.

## 20. Dettes fonctionnelles explicitement conservées

- [ ] DETTE — fermeture/suppression compte utilisateur et Workspace avant production réelle. Voir `docs/functional-debt-account-workspace-closure.md`.
- [ ] DETTE — trash/restore Files. Voir `docs/functional-debt-file-trash-restore.md`.
- [ ] DETTE — Billing/Payment réel et fiscalité.
- [ ] DETTE — stockage cloud/antivirus de production selon environnement de déploiement.
- [ ] DETTE — RGPD, politique de conservation/confidentialité et gestion des cookies selon les traceurs réellement utilisés. Voir `docs/functional-debt-privacy-cookies-rgpd.md`.

## 21. Documentation / contrat frontend

- [x] TERMINÉ — `docs/frontend-backend-integration-contract.md` existe et décrit les responsabilités d’intégration stabilisées.
- [x] TERMINÉ — `docs/frontend-backend-subscription-contract.md` documente le contrat Subscription/Trial.
- [x] TERMINÉ — `docs/frontend-backend-roles-permissions-contract.md` documente le contrat observable des rôles et permissions.
- [x] TERMINÉ — dettes Account/Workspace Closure, File Trash/Restore et Privacy/Cookies/RGPD documentées.
- [x] TERMINÉ — présente checklist backend vivante.
- [x] TERMINÉ — checkpoint `docs/backend-core-v1-ready-for-frontend.md` conservé comme checkpoint historique R1.
- [x] TERMINÉ — OpenAPI différé pendant la phase actuelle ; les contrats Markdown restent les références d’intégration.
- [x] TERMINÉ — `docs/commercial-plans-entitlements-platform-admin.md` corrigé le 2026-09-02 : ancienne architecture `CommercialAccount` / `Premium = 5 workspaces` explicitement supplantée.
- [x] TERMINÉ — RBAC-EXT n’introduit aucun changement HTTP observable ; aucune modification du contrat frontend/backend Roles n’est requise pour ce lot interne.

## 22. Qualité / sécurité / readiness

Le Backend Core V1 est considéré prêt à soutenir la finalisation du frontend lorsque le périmètre stabilisé est implémenté, les entrées strictement validées, les contrats uniformes, l’auth/sessions testées, les permissions centralisées et extensibles, l’isolation tenant démontrée, les opérations critiques atomiques, les index adaptés, les secrets absents des sorties/logs, les quotas protégés, les actions sensibles auditées, l’environnement documenté, les migrations maîtrisées et la suite globale verte.

État :

- [x] TERMINÉ — validation Zod stricte sur les endpoints développés.
- [x] TERMINÉ — authentification/sessions largement couvertes par tests.
- [x] TERMINÉ — permissions centralisées.
- [x] TERMINÉ — registre RBAC extensible sans ajout de permission métier au Core. `RBAC-EXT`.
- [x] TERMINÉ — tests d’isolation tenant sur les domaines sensibles développés.
- [x] TERMINÉ — transactions sur les opérations multi-documents critiques.
- [x] TERMINÉ — quotas protégés côté backend.
- [x] TERMINÉ — actions sensibles auditées.
- [x] TERMINÉ — audit global des index MongoDB par rapport aux requêtes réellement utilisées. `H2.1`.
- [x] TERMINÉ — audit final de non-exposition des secrets/PII dans réponses, erreurs et logs. `H2.2`.
- [x] TERMINÉ — audit final des variables d’environnement et `.env.example`. `H2.3`.
- [x] TERMINÉ — audit des seeds/migrations : idempotence, rejouabilité, scripts d’exploitation, preflight des index et réconciliation ciblée. `H2.4`.
- [x] TERMINÉ — audit warnings runtime/dette technique et validation associée. `H2.5`.
- [x] TERMINÉ — audit final des jobs, idempotence, batchs bornés, tris déterministes et `hasMore`. `H1`.
- [x] TERMINÉ — contrats frontend/backend consolidés. `D1`.
- [x] HISTORIQUE — suite globale R1 : `181` fichiers de tests, `845` tests passés, aucun échec.
- [x] TERMINÉ — checkpoint historique `Backend Core V1 Ready for Frontend`. `R1`.
- [x] TERMINÉ — décision R2 : OpenAPI différé.
- [ ] À VALIDER — nouvelle suite globale backend après RBAC-EXT.

## 23. Ordre restant recommandé

```text
RBAC-EXT  Registre extensible + rôles système + backfill     IMPLÉMENTÉ — tests ciblés verts
R-EXT     Suite globale backend post-RBAC-EXT                PROCHAINE VALIDATION
F8.5      Files frontend                                     APRÈS R-EXT
F8.6      Subscription / Plan / Trial frontend
F8.7      Workspace Settings / Ownership frontend
F8.8      Audit / Dashboard Core frontend
F8.9      Account / Security frontend
F9.x      Platform Admin frontend réel
F10       EntitlementOverride Workspace-scoped + Platform
F11       Consolidation frontend + E2E
```

Ne démarrer aucun module métier avant d’atteindre le Gate A défini dans la synthèse de reprise du 2 septembre 2026.

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