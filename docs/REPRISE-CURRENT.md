# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il décrit l'état réel du travail au moment de la reprise. Il n'est pas normatif : le code, les contraintes DB, les tests réellement validés et les contrats canoniques priment.
>
> **Dernière mise à jour : 2026-09-07**

---

## 1. Hiérarchie d'autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés réellement exécutés et validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. présent fichier de reprise.

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement prêt pour la production.

À la reprise : toujours commencer par `git pull` et travailler depuis le HEAD courant plutôt que d'exiger un SHA documentaire précis.

---

## 2. Objectif du Core

`saas-core-api` est un **socle SaaS générique clonable, maintenable et évolutif**.

Le Core porte les responsabilités transversales :

```text
authentification / sessions
RBAC Workspace
RBAC Platform
Workspaces / membres
Plans / Subscriptions / trial
Entitlements / quotas / dérogations
Files sécurisés
Audit logs
administration Platform
lifecycle Account / Workspace
points d'extension métier
rétention / purge générique sécurisée
onboarding commercial générique
versionnement / migrations / upgrade
E2E Core
```

Les modules métier réels ne doivent pas être développés directement dans le dépôt Core.

---

## 3. Roadmap réelle jusqu'au clonage métier

Ordre figé après clôture D-018 :

```text
D-019 moteur sécurisé de rétention / purge Core
→ D-020 invitation commerciale client / offre privée Découverte
→ D-015 versionnement / provenance / migrations / release
→ D-016 Playwright / E2E Core
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
→ release v1.0.0
→ clone du véritable SaaS métier
→ cadrage puis développement des modules métier
```

Important :

```text
D-017
= clone pilote technique temporaire destiné à éprouver dérivation + upgrade

clone métier réel
= seulement après validation du Core et release v1.0.0
```

---

## 4. D-018 — VALIDÉ

D-018 « Équipe de la Plateforme / RBAC Platform / invitations internes » est **clôturé et VALIDÉ le 2026-09-07**.

Contrat canonique :

```text
docs/contracts/PLATFORM-TEAM.md
```

Dette canonique :

```text
docs/DEBT.md
```

### 4.1 Architecture validée

```text
User
→ identité / authentification globale

PlatformTeamMember
→ appartenance à l'équipe interne

PlatformRole
→ rôle système ou personnalisé

PlatformPermission
→ autorité administrative effective

PlatformInvitation
→ invitation interne sécurisée

Fondateur
→ qualité historique protégée, distincte du rôle RBAC
```

Invariants :

```text
exactement un Fondateur actif
Fondateur → toujours Super administrateur
Super administrateur → pas nécessairement Fondateur
plusieurs Super administrateurs possibles
Administrateur de la Plateforme ≠ Super administrateur
1 PlatformTeamMember → 1 PlatformRole
permissions → dérivées du rôle et de l'état DB courant
RBAC Platform ≠ RBAC Workspace
```

Le Fondateur ne peut pas être rétrogradé, suspendu, révoqué ou fermé via l'administration ordinaire.

Le dernier Super administrateur actif est protégé.

L'autorisation Platform sensible est recalculée depuis MongoDB via `resolvePlatformAuthorization()` ; une suspension ou révocation prend effet sans attendre l'expiration d'un JWT.

`User.platformRole` reste un fallback backend historique limité et ne constitue pas une autorité frontend.

### 4.2 Gouvernance des rôles validée

Rôles système :

```text
Super administrateur
Administrateur de la Plateforme
Support technique
Support commercial
Support client
```

Les rôles système sont immuables depuis l'administration courante.

Rôles personnalisés :

- clé technique opaque générée backend ;
- description / justification obligatoire ;
- permissions issues uniquement du registre Platform actif ;
- aucune permission `RESERVED` ;
- aucun clone exact d'un rôle actif ;
- archivage seulement lorsqu'aucun membre `ACTIVE` ou `SUSPENDED` ne l'utilise ;
- création / modification / archivage réservées au Fondateur ou Super administrateur.

Décision finale de cohérence RBAC :

```text
platform:roles:read
→ DÉLÉGABLE

platform:roles:create
platform:roles:update
platform:roles:archive
→ RÉSERVÉES
```

Conséquences :

```text
platform_admin
→ peut lire les rôles
→ ne possède pas create/update/archive

rôle personnalisé
→ ne peut jamais recevoir create/update/archive

Founder / SuperAdmin
→ gouvernance autorisée
→ policy métier conservée en défense en profondeur
```

Correctifs de clôture code :

```text
7fba739  fix: retire les mutations de rôles du preset platform_admin
a5db86e  test: verrouille le preset platform_admin
52eb156  fix: classe les mutations de rôles personnalisés en RESERVED
6f07303  test: verrouille les permissions RESERVED de gouvernance
```

### 4.3 Invitations Platform validées

`PlatformInvitation` reste strictement dédiée aux collaborateurs internes de la Plateforme.

Validé :

- token aléatoire ;
- SHA-256 persisté, jamais le secret brut ;
- expiration ;
- resend avec rotation du secret ;
- revoke ;
- accept-existing / accept-new ;
- contrôle de l'email ;
- aucune session implicite pour une acceptation new-user ;
- revalidation de l'autorité de l'invitant à l'acceptation ;
- audit ;
- rate limiting ;
- aucun token brut dans listing/réponse admin/audit.

`PlatformInvitation` ne doit jamais être réutilisée pour une invitation commerciale d'un prospect ou client.

### 4.4 Frontend D-018 validé

Routes :

```text
/platform/team/members
/platform/team/invitations
/platform/team/roles
```

Réutilisation obligatoire confirmée :

```text
DataTable
DataPagination
DataTableActions
EntityDetailsDrawer
ConfirmationDialog
ActionIconButton
SelectField
badges partagés
```

Tableau Membres : lecture uniquement avec action `Voir`.

Drawer membre : détails + actions d'administration conditionnelles selon permissions/état.

Le frontend resynchronise le contexte Platform après un `403` sur une route Platform via invalidation/refetch de `/api/platform/me` puis redirection vers une route encore autorisée ou `/workspaces`.

### 4.5 Gates manuels D-018 validés

Confirmés pendant la clôture :

```text
Founder /api/platform/me
→ isFounder=true
→ role.key=super_admin
→ permissions complètes

protection Founder
→ suspend 403
→ revoke 403
→ role update 403

platform_admin
→ gouvernance custom role refusée

rôle custom
→ permission RESERVED refusée
→ clone exact actif refusé
→ archivage assigné ACTIVE refusé
→ archivage assigné SUSPENDED refusé

invitation Platform
→ rotation / revoke / absence secret brut validées

utilisateur SaaS ordinaire
GET /api/platform/me
→ platformAccess=null
```

Le rôle custom de test a été désassigné puis archivé ; le compte `platform_admin` de test a été rétabli dans son état normal.

### 4.6 Validation automatisée finale

L'utilisateur a confirmé après les derniers correctifs :

```text
backend ciblé D-018       ✅
backend global             ✅
frontend ciblé             ✅
frontend global            ✅
build Vite production      ✅
```

Aucune nouvelle modification de code D-018 n'est à faire à la prochaine reprise.

---

## 5. D-019 — prochain bloc exact

D-019 est maintenant la prochaine dette Core à traiter.

```text
D-019 — Moteur sécurisé de rétention et purge des données Core
```

D-019 n'est pas D-006 :

```text
D-006
→ politique juridique / produit : quoi conserver, combien de temps et pourquoi

D-019
→ moteur générique sécurisé appliquant une policy déjà définie
```

### 5.1 Cible de cadrage avant tout code

À figer avant implémentation :

- modèle de policy de rétention ;
- versionnement / validation de la policy ;
- entités Core concernées ;
- éligibilité calculée backend ;
- aucune date cutoff arbitraire fournie par le client ;
- aucune route générique de suppression par filtre libre ;
- permissions Platform nécessaires ;
- preview avant purge ;
- confirmation explicite ;
- traitement par lots ;
- idempotence ;
- audit durable indépendant des données purgées ;
- lock distribué / concurrence ;
- scheduler multi-instance ;
- reprise après échec ;
- indexes nécessaires ;
- tests sécurité / concurrence / non-régression.

### 5.2 Règle de reprise

Ne pas écrire de code D-019 avant d'avoir :

```text
1. analysé les données Core actuellement soft-deleted / archived / closed
2. distingué conservation fonctionnelle et purge physique
3. défini le contrat de policy
4. défini les permissions et frontières Platform
5. défini le workflow preview → exécution → audit
6. défini les tests critiques
```

---

## 6. D-020 — bloc figé avant D-015

D-020 a été ajouté au registre canonique :

```text
D-020 — Invitation commerciale client et offres privées de découverte
```

Il sera traité **après D-019 et avant D-015**.

### 6.1 Séparation fonctionnelle obligatoire

```text
PlatformInvitation
→ collaborateur interne de l'éditeur

CommercialInvitation
→ prospect / futur client utilisateur
```

Deux domaines, deux modèles, deux permissions, deux finalités.

### 6.2 Décisions déjà figées

Une offre privée « Découverte commerciale » est pertinente lorsque la même offre doit être proposée à plusieurs prospects ciblés.

Cible :

```text
Plan privé
→ isPublic=false
→ prix éventuellement 0 €
→ fonctionnalités explicitement choisies
→ IA explicitement exclue si souhaité
→ limites configurables
```

Ne pas utiliser une règle dynamique « toutes les fonctionnalités sauf IA » : une future capability ne doit pas être accordée automatiquement.

Distinction :

```text
trial
→ temporaire
→ vraie trialEndsAt

accès commercial sans échéance
→ gratuité commerciale durable
→ pas « trial illimité »
```

Les `EntitlementOverride` restent destinés aux exceptions individuelles ; le Plan privé représente une offre réutilisable.

Le Super administrateur sera seul autorisé au départ, mais l'architecture devra utiliser des permissions Platform dédiées afin de permettre une future délégation à un service commercial.

Un commercial autorisé sélectionnera une offre préparée ; il ne fabriquera pas arbitrairement les features/limites lors de l'invitation.

L'onboarding devra être audité et sécurisé, sans création anticipée de workspaces orphelins.

Point technique à résoudre : le moteur actuel des Subscriptions commerciales actives attend une `currentPeriodEnd` future ; une offre gratuite commerciale sans échéance doit recevoir une sémantique explicite, jamais une date artificielle lointaine.

---

## 7. D-015, D-016, audit final et D-017

### D-015

Versionnement / provenance / migrations / release :

- SemVer ;
- tags ;
- release notes ;
- changelog si retenu ;
- migrations pre/post-deploy ;
- idempotence ;
- rollback ;
- variables d'environnement ;
- dépendances système ;
- provenance Core machine-readable ;
- procédure d'upgrade.

D-015 ne commence qu'après D-019 et D-020.

### D-016

Playwright / E2E Core sur les parcours transversaux critiques.

### Audit final

Revue architecture / sécurité / qualité avant dérivation pilote.

### D-017

Exercice pilote obligatoire de clonage + petite extension métier + upgrade depuis `upstream-core`.

Toute faiblesse générique découverte doit revenir dans le Core avant `v1.0.0`.

---

## 8. Stratégie canonique de clonage du vrai SaaS métier

Références :

```text
docs/derived-saas/DERIVED-SAAS.md
docs/derived-saas/EXTENSION-POINTS.md
```

Après release stable :

```bash
git clone <URL_SAAS_CORE_API> <nom-du-produit>
cd <nom-du-produit>

git remote rename origin upstream-core
git remote add origin <URL_NOUVEAU_DEPOT_PRODUIT>

git push -u origin main
```

```text
origin
→ dépôt du SaaS métier

upstream-core
→ dépôt maître saas-core-api
```

Secrets, base de données, environnement et configuration produit restent propres au produit dérivé.

---

## 9. Règles permanentes de développement

### Backend

```text
backend/modules/<domaine>/
├── routes
├── controller
├── service
├── model
├── validation
└── tests
```

- JavaScript uniquement ;
- Zod strict ;
- logique métier dans les services ;
- isolation Workspace ;
- RBAC ;
- entitlement / quotas si nécessaire ;
- audit ;
- transaction lorsque l'invariant l'exige ;
- aucune logique métier lourde dans routes/controllers.

### Frontend

```text
frontend/src/features/<domaine>/
├── api
├── components
├── hooks si nécessaire
├── pages
├── validation / helpers
└── tests
```

Gestion d'état :

```text
useState      → état UI local
Redux Toolkit → état client global
RTK Query     → état serveur
```

Réutilisation obligatoire des composants partagés. Aucun second DataTable, système de drawer générique, confirmation générique, toast ou stratégie RTK Query parallèle ne doit être créé sans justification architecturale.

---

## 10. Sécurité permanente

Invariant :

```text
ne jamais faire confiance au frontend
ne jamais faire dépendre la sécurité d'un bouton masqué
```

Backend = autorité sur identité, ownership, memberships, permissions, entitlements, quotas, lifecycle, transitions sensibles et purge/rétention.

Validation Zod stricte obligatoire.

`sanitizeFilter` reste activé. Utiliser `mongoose.trusted()` uniquement pour les opérateurs MongoDB construits intentionnellement par le serveur.

Les mutations sensibles doivent rester fail-closed, réautoriser depuis l'état courant lorsque nécessaire et conserver un audit approprié.

---

## 11. Prochaine reprise exacte

La prochaine conversation ne doit **plus reprendre D-018**.

D-018 est clôturé.

Ordre exact :

```text
1. git pull
2. vérifier le HEAD courant
3. lire docs/DEBT.md — D-019
4. lire le présent REPRISE-CURRENT.md
5. cadrer D-019 avant tout code
6. inventorier les états/données Core concernés par une purge
7. définir policy + permissions + workflow + audit + concurrence
8. proposer le découpage d'implémentation D-019
9. seulement après validation du cadrage : commencer le backend D-019
```

Ne pas commencer D-020 tant que D-019 n'est pas terminé.

Ne pas commencer D-015 tant que D-019 et D-020 ne sont pas terminés ou explicitement reclassifiés.

---

## 12. Fichiers prioritaires à la prochaine conversation

```text
docs/REPRISE-CURRENT.md
docs/DEBT.md

docs/contracts/PLATFORM-TEAM.md       # référence D-018 désormais VALIDÉE

backend/modules/users/*
backend/modules/workspace/*
backend/modules/workspaceMember/*
backend/modules/subscriptions/*
backend/modules/file/*
backend/modules/auditLog/*
backend/modules/platform/*
backend/jobs/*
```

Pour D-019, l'inventaire exact des modèles et états doit être fait depuis le code courant avant de définir une policy de purge.

---

## 13. Ce qu'il ne faut pas faire

Ne pas :

- rouvrir D-018 sans bug ou besoin nouveau démontré ;
- confondre `PlatformInvitation` et la future `CommercialInvitation` ;
- coder une durée juridique universelle de rétention dans le Core ;
- exposer un cutoff ou filtre de purge arbitraire fourni par le frontend ;
- créer une route générique de suppression ;
- simuler un accès commercial « illimité » avec une date artificielle lointaine ;
- considérer un accès gratuit permanent comme un « trial illimité » ;
- commencer D-015 avant D-019 et D-020 ;
- commencer les modules métier réels dans le dépôt Core ;
- déclarer `v1.0.0` avant D-015, D-016, audit final et D-017.

---

## 14. Résumé de reprise en une phrase

D-018 est désormais entièrement **VALIDÉ** — équipe interne, RBAC Platform, Founder/SuperAdmin, rôles personnalisés, invitations sécurisées, frontend et gates de sécurité sont clôturés — et la prochaine reprise doit commencer par le cadrage backend-first de **D-019 rétention/purge**, puis traiter **D-020 invitation commerciale / offre privée Découverte** avant d'ouvrir le versionnement D-015.
