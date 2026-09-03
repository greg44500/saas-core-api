# SAAS-CORE-API — Checklist d’implémentation Backend Core V1

Dernière consolidation : 2026-09-03 — F10.1 résolution des EntitlementOverride actifs validée

## 1. Rôle du document

Ce document est la référence vivante d’avancement du Backend Core V1.

Il conserve simultanément :

1. l’architecture prévue par la checklist et l’ordre d’implémentation initiaux ;
2. l’état réellement observé dans le dépôt ;
3. les évolutions architecturales décidées pendant le développement ;
4. les dettes explicitement différées avant production commerciale.

Il ne remplace ni les contrats frontend/backend ni les documents de dette fonctionnelle.

Référence commerciale générique :

```text
docs/commercial-configuration-contract.md
```

Cette référence impose que `saas-core-api` reste un socle clonable : le Core fournit les mécanismes commerciaux, tandis que chaque application dérivée définit son catalogue réel, ses prix, ses capabilities métier et ses métriques après clonage.

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
- [x] TERMINÉ — séparation contractuelle `.env` / catalogue commercial documentée : secrets et paramètres techniques dans `.env`, offres/prix/trial/features/limits en données persistées/seeds/administration.

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
- [x] TERMINÉ — les valeurs de seed commercial sont considérées comme configuration initiale et non comme invariants immuables du Core.

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
- [x] TERMINÉ — suite globale backend post-RBAC-EXT verte le 2026-09-02 ; arbre Git local confirmé propre après exécution.

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
- [x] TERMINÉ — plan Free réel et limité servant de baseline V1.
- [x] TERMINÉ — contenu du plan Free piloté par les données ; aucune liste fixe de features/limits ne doit être considérée comme invariant du Core.
- [x] TERMINÉ — `features` séparées des `limits`.
- [x] TERMINÉ — `Plan.limits` extensible via Map.
- [x] TERMINÉ — prix catalogue mensuel/annuel HT en minor units.
- [x] TERMINÉ — prix, devise, trial, features et limits considérés comme données de catalogue paramétrables, pas comme constantes de logique métier.
- [x] TERMINÉ — configuration de trial par Plan.
- [x] TERMINÉ — routes publiques de lecture des Plans nécessaires au Core.
- [x] TERMINÉ — administration Platform des Plans nécessaire au Core, dont archivage.
- [x] TERMINÉ — registre de capabilities Plan extensible par une future application sans ajouter ses features/métriques au Core.
- [x] TERMINÉ — `Free/Premium/IA` et `79 € HT/mois` ne sont pas des invariants universels du Core ; ce sont des valeurs de catalogue de travail modifiables après clonage.
- [ ] DIFFÉRÉ — mutation commerciale avancée des Plans au-delà du périmètre actuel.
- [ ] À CONFIRMER AVANT BILLING RÉEL — catalogue et valeurs commerciales définitifs de chaque application dérivée.

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
- [x] TERMINÉ — trial paramétrable par Plan via `trialEnabled` / `trialDurationDays` ; aucune durée globale universelle imposée par le Core.
- [x] TERMINÉ — changement de Plan pendant trial sans réinitialiser `trialEndsAt`.
- [x] TERMINÉ — retour volontaire Free pendant trial consomme définitivement l’éligibilité.
- [x] TERMINÉ — expiration automatique des trials via job.
- [x] TERMINÉ — activation payante manuelle avec ancrage de période.
- [x] SUPPLANTÉ — architecture `CommercialAccount`, abonnement Premium couvrant 5 Workspaces, métrique `workspaces` et scope `commercial_account` abandonnés pour la V1.
- [x] TERMINÉ — F10.0 : constantes, modèle Mongoose et validation stricte `EntitlementOverride` Workspace-scoped ; feature/limit discriminés, période, source, auteur/motif et révocation traçable ; tests ciblés verts le 2026-09-03.
- [x] TERMINÉ — F10.1 : résolution backend des `EntitlementOverride` actifs ; exclusion des futurs/expirés/révoqués, priorité déterministe des overrides chevauchants, `null = illimité`, registre de capabilities extensible et support de session MongoDB ; tests ciblés verts le 2026-09-03.
- [ ] À FAIRE — F10.2 : composer l’entitlement effectif `Plan + EntitlementOverride actifs` sans modifier le Plan catalogue ni la Subscription.
- [ ] À FAIRE — F10.3 : intégrer les features/limites effectives aux contrôles d’accès, quotas et remédiation.
- [ ] À FAIRE — F10.4 : API Platform `SUPER_ADMIN` pour créer, modifier, révoquer et consulter les overrides avec AuditLog.
- [ ] À FAIRE — F10.5 : exposition Workspace sûre de l’entitlement effectif.
- [ ] À FAIRE — F10.6 : administration frontend Platform des dérogations.
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
- [x] TERMINÉ — audits Files.
- [x] TERMINÉ — audits Subscription/Trial nécessaires aux workflows implémentés.

## 16. Réutilisabilité du Core

- [x] TERMINÉ — le dépôt est explicitement défini comme un socle SaaS générique clonable.
- [x] TERMINÉ — les modules métier sont ajoutés uniquement après clonage dans l’application dérivée.
- [x] TERMINÉ — le Core ne doit jamais importer un module métier de l’application dérivée.
- [x] TERMINÉ — les registres RBAC, capabilities et métriques sont les points d’extension prévus pour les domaines métier.
- [x] TERMINÉ — le moteur commercial est générique ; le catalogue réel appartient à l’application dérivée.
- [x] TERMINÉ — workflow de dérivation documenté dans `docs/commercial-configuration-contract.md` : clone → `.env` technique → seeds Core → catalogue → extensions métier → modules métier.

## 17. Références documentaires à maintenir ensemble

```text
docs/commercial-configuration-contract.md
docs/commercial-plans-entitlements-platform-admin.md
docs/frontend-backend-subscription-contract.md
docs/frontend-backend-integration-contract.md
docs/backend-implementation-checklist.md
```

En cas de contradiction historique concernant `Premium = 5 workspaces`, `CommercialAccount` obligatoire ou un prix particulier considéré comme invariant, ces décisions sont **supplantées** par les contrats commerciaux actifs du 3 septembre 2026.
