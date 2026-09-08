# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il décrit l'état réel du travail au moment de la reprise. Il n'est pas normatif : le code, les contraintes DB, les tests réellement validés et les contrats canoniques priment.
>
> **Dernière mise à jour : 2026-09-08**

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

À chaque reprise : commencer par `git pull`, vérifier le HEAD courant et relire le code réellement présent avant toute modification.

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

État actuel :

```text
D-019 moteur sécurisé de rétention / purge Core ✅ VALIDÉ
→ D-020 invitation commerciale client / offre privée Découverte ⏭️ PROCHAIN BLOC
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

D-018 « Équipe de la Plateforme / RBAC Platform / invitations internes » reste clôturé et VALIDÉ depuis le 2026-09-07.

Contrat canonique :

```text
docs/contracts/PLATFORM-TEAM.md
```

Invariants à ne pas rouvrir sans besoin démontré :

- RBAC Platform distinct du RBAC Workspace ;
- Fondateur protégé et toujours Super administrateur ;
- plusieurs Super administrateurs possibles avec protection du dernier actif ;
- autorité sensible recalculée depuis MongoDB ;
- rôles système immuables depuis l'administration courante ;
- rôles personnalisés sans permission `RESERVED` ;
- invitations Platform réservées aux collaborateurs internes ;
- page unique « Gestion des membres » avec onglets Membres / Invitations / Rôles & permissions ;
- composants partagés obligatoires.

---

## 5. D-019 — VALIDÉ le 2026-09-08

```text
D-019 — Moteur sécurisé de rétention et purge des données Core
```

Contrat canonique :

```text
docs/contracts/RETENTION.md
```

D-019 fournit le moteur technique générique. Il reste distinct de D-006 :

```text
D-019
→ mécanismes sécurisés, configurables, bornés et traçables

D-006
→ règles juridiques / produit réelles de conservation, anonymisation ou suppression
```

Le Core ne code aucune durée juridique universelle pour les données personnelles.

### 5.1 Fondations et registre

Architecture validée :

```text
registre code-owned
→ targets autorisées
→ capabilities
→ action
→ bornes
→ adapters

configuration persistée strictement validée
→ uniquement les paramètres autorisés
```

Le frontend ne peut jamais fournir :

- collection MongoDB arbitraire ;
- filtre MongoDB libre ;
- cutoff arbitraire ;
- requête générique de suppression.

Première target administrable : `AuditLog`.

### 5.2 Permissions Platform

Permissions validées :

```text
platform:retention:read     → SENSITIVE
platform:retention:preview  → SENSITIVE
platform:retention:update   → RESERVED
platform:retention:execute  → RESERVED
```

Attribution système :

```text
Fondateur / Super administrateur
→ read + preview + update + execute

Administrateur de la Plateforme
→ read + preview

Support technique / commercial / client
→ aucun droit par défaut
```

Les rôles personnalisés ne peuvent recevoir aucune permission `RESERVED`.

### 5.3 RetentionPolicy / RetentionExecution

Validé :

- policies versionnées et append-only ;
- version courante = version la plus élevée ;
- contrôle optimiste `expectedVersion` ;
- configuration strictement validée ;
- aucune durée inventée si aucune policy n'existe ;
- `RetentionExecution` durable et indépendant des AuditLogs purgés ;
- contexte d'exécution immuable ;
- initiateur manuel tracé ;
- scheduler avec initiateur système ;
- compteurs, batches, cutoff, statut et erreurs techniques sûres conservés ;
- aucun contenu d'AuditLog supprimé recopié dans la trace.

### 5.4 Files : soft-delete, purge et quota

Invariant validé :

```text
ACTIVE
→ DELETED
→ purge physique différée
→ PURGED
```

Le delete utilisateur reste un soft-delete.

D-002 conserve exclusivement la future corbeille fonctionnelle : listing, restauration, permissions et UX associée.

Quota :

```text
storage_bytes
= fichiers actifs + fichiers DELETED encore physiquement stockés
```

L'espace n'est libéré qu'après purge physique réussie.

La purge File utilise un claim/lease atomique afin d'éviter double traitement et conflit avec une future restauration D-002.

### 5.5 AuditLog, scheduler et concurrence

Validé :

- adapter AuditLog étroit et code-owned ;
- éligibilité calculée côté serveur ;
- preview serveur ;
- batches bornés ;
- exécution idempotente ;
- lock/lease distribué MongoDB ;
- compatibilité multi-instance ;
- renouvellement de lock ;
- reprise après erreur ;
- exécutions `RUNNING` obsolètes traitées de manière explicite ;
- scheduler avec identité technique et sans usurpation d'un User SuperAdmin ;
- comportement fail-closed.

La commande planifiée de rétention est potentiellement destructive lorsqu'une policy active existe : elle ne doit jamais être lancée comme simple test manuel.

### 5.6 API Platform

Routes validées sous `/api/platform/retention` :

```text
GET  /
GET  /:targetKey
GET  /:targetKey/executions
POST /:targetKey/preview
POST /:targetKey/policy-versions
POST /:targetKey/executions
```

Aucune route générique `DELETE` n'existe.

La preview et le cutoff sont calculés côté backend.

La purge manuelle exige une confirmation liée à la preview et le backend revérifie version, impact et état courant avant exécution.

Un conflit ou une preview obsolète produit un refus fail-closed.

### 5.7 Frontend Platform

Page validée :

```text
Sécurité & données
└── Journaux d'audit
└── Rétention & purge
```

Règles validées :

- RTK Query pour l'état serveur ;
- `useState` uniquement pour l'état UI transitoire ;
- aucune nouvelle slice Redux dédiée ;
- actions masquées lorsqu'elles ne sont pas autorisées ;
- formulaires et confirmations partagés réutilisés ;
- historique basé sur le `DataTable` partagé ;
- aucune collection/filter/cutoff libre exposé ;
- `409` sur état obsolète → preview invalidée et nouvelle prévisualisation nécessaire ;
- navigation Platform groupée et cohérente avec la sidebar Workspace.

### 5.8 Validation finale D-019

Le 2026-09-08, l'utilisateur a confirmé :

```text
backend ciblé / sécurité      ✅
backend global                 ✅
frontend ciblé                 ✅
frontend global                ✅
build Vite production          ✅
```

Repère frontend final confirmé :

```text
164 fichiers de tests
532 tests
→ verts
```

Les principaux commits de la phase finale incluent notamment :

```text
d9eaa7d  fondations registre / validation
75a0752  RetentionPolicy / RetentionExecution
2fb4d71  purge File sécurisée
07e3a24  moteur AuditLog / scheduler / lock
64cd562  stabilisation API/read registry tests
d087558  frontend Platform rétention
f58c6dd  non-régression colonne Actions Équipe Platform
b9899c9  wording UI rétention
```

D-019 ne doit plus être rouvert sauf bug démontré ou nouvelle exigence générique.

### 5.9 Point documentaire à garder en tête

`docs/DEBT.md` a été rédigé avant la clôture finale D-019 et peut encore contenir une mention historique `D-019 = PLANIFIÉ` tant qu'elle n'a pas été nettoyée dans le registre. Cette mention ne doit pas faire rouvrir D-019 : code + tests validés + `docs/contracts/RETENTION.md` + présente reprise décrivent l'état réel.

Lors du prochain nettoyage documentaire du registre, D-019 doit passer à `VALIDÉ` et sortir de la liste des blockers actifs, l'historique Git conservant sa trace.

---

## 6. PROCHAIN BLOC — D-020

```text
D-020 — Invitation commerciale client et offres privées de découverte
```

D-020 est maintenant le prochain blocker fonctionnel Core avant D-015.

### 6.1 Frontière obligatoire

```text
PlatformInvitation
→ collaborateur interne de l'éditeur

CommercialInvitation
→ prospect / futur client utilisateur du SaaS
```

Il est interdit de réutiliser `PlatformInvitation` comme modèle métier d'invitation commerciale.

Les primitives de sécurité peuvent être réutilisées conceptuellement : token aléatoire, hash, expiration, rotation, revoke, audit, absence de secret brut persistant.

### 6.2 Cas commerciaux déjà identifiés

Le Core doit pouvoir représenter notamment :

```text
Free standard
Free personnalisé via EntitlementOverride
Découverte commerciale temporaire
Découverte commerciale sans échéance
Plan privé négocié
beta / partenaire / early adopter
```

### 6.3 Décisions déjà figées

- une offre « Découverte commerciale » peut utiliser un Plan privé `isPublic=false` ;
- un Plan privé peut avoir un prix `0` sans devenir la baseline Free ;
- les fonctionnalités sont explicitement listées ;
- aucune règle dynamique « toutes les fonctionnalités sauf IA » ;
- une future capability ne doit jamais être accordée automatiquement ;
- un accès commercial gratuit durable n'est pas un « trial illimité » ;
- un vrai trial reste temporaire avec `trialEndsAt` ;
- `EntitlementOverride` reste l'outil d'exception individuelle ;
- un Plan privé représente une offre réutilisable ;
- l'acteur commercial choisit une offre existante et ne fabrique pas arbitrairement des capabilities au moment de l'invitation ;
- l'invitation doit être auditée : acteur, bénéficiaire, offre, raison, dates, acceptation, révocation ;
- le Workspace doit être créé ou rattaché dans le flow d'acceptation afin d'éviter les workspaces orphelins ;
- l'utilisateur accepté devient owner du Workspace cible selon le workflow retenu ;
- le Super administrateur est l'autorité initiale ;
- l'architecture doit utiliser des permissions Platform dédiées pour permettre une délégation future sans réécrire la logique métier.

### 6.4 Points de cadrage encore à résoudre AVANT code

Ces points ne doivent pas être improvisés pendant l'implémentation :

1. sémantique exacte d'une offre gratuite sans échéance ;
2. relation entre CommercialInvitation, Plan privé, Subscription et Workspace ;
3. comportement de `TrialEligibility` pour une invitation commerciale manuelle ;
4. flow existing-user vs new-user ;
5. création ou rattachement exact du Workspace à l'acceptation ;
6. état et cycle de vie de `CommercialInvitation` ;
7. permissions Platform dédiées (`read/create/revoke/resend` ou autre découpage à valider) ;
8. conditions de resend/rotation/revoke ;
9. atomicité de l'acceptation ;
10. audit et absence de secrets ;
11. impact sur le résolveur de Subscription qui attend aujourd'hui une `currentPeriodEnd` future pour les subscriptions commerciales actives.

Une date artificielle lointaine telle que `2099-12-31` ne doit pas simuler un accès illimité.

---

## 7. D-020 — méthode de travail recommandée

La prochaine conversation doit commencer par **D-020.1 : cadrage et audit du code actuel**, pas par la création immédiate d'un modèle.

Ordre recommandé :

```text
D-020.1 — audit + contrat fonctionnel/sécurité
→ figer le flow et les invariants

D-020.2 — fondations backend non destructives
→ permissions / constantes / validation / modèle si confirmé

D-020.3 — services métier / acceptation atomique
→ existing/new user, workspace, subscription, audit

D-020.4 — API Platform + sécurité invitation
→ create/list/get/resend/revoke/accept selon contrat figé

D-020.5 — frontend Platform
→ réutilisation composants partagés / RTK Query

D-020.6 — tests globaux / build / clôture documentaire
```

Le découpage exact peut être ajusté après inspection du HEAD, mais la séparation des responsabilités doit rester stricte.

---

## 8. Fichiers / domaines prioritaires à inspecter au démarrage D-020

Les chemins exacts doivent être revérifiés sur le HEAD courant.

Documentation :

```text
docs/REPRISE-CURRENT.md
docs/DEBT.md — section D-020
docs/contracts/COMMERCIAL.md
docs/contracts/PLATFORM-TEAM.md
docs/contracts/CORE-CONTRACT.md
```

Backend :

```text
Plan
Subscription
EntitlementOverride
Workspace
WorkspaceMember / ownership
User
TrialEligibility
PlatformPermission / PlatformRole
PlatformInvitation et ses primitives de sécurité
AuditLog
mail / templates d'invitation
transactions MongoDB existantes
```

Frontend Platform :

```text
navigation Platform
pages Plans
pages Subscriptions
Dérogations
Équipe Platform / invitations
composants partagés : DataTable, Drawer, ConfirmationDialog, FormField, SelectField, Toast
RTK Query base API et conventions d'erreurs
```

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
- controllers minces ;
- routes sans logique métier ;
- isolation Workspace ;
- RBAC ;
- entitlement / quotas si nécessaire ;
- audit ;
- transactions lorsque les invariants l'exigent ;
- sécurité fail-closed.

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

Réutilisation obligatoire des composants partagés. Aucun second `DataTable`, système de drawer générique, confirmation générique, `InfoTooltip`, toast ou stratégie RTK Query parallèle ne doit être créé sans justification architecturale.

Les pages assemblent ; elles ne portent pas de logique métier lourde.

---

## 10. Sécurité permanente

Invariant :

```text
ne jamais faire confiance au frontend
ne jamais faire dépendre la sécurité d'un bouton masqué
```

Backend = autorité sur identité, ownership, memberships, permissions, entitlements, quotas, lifecycle, invitations, subscription et transitions sensibles.

Validation Zod stricte obligatoire.

`sanitizeFilter` reste activé. Utiliser `mongoose.trusted()` uniquement pour les opérateurs MongoDB construits intentionnellement par le serveur.

Les mutations sensibles doivent réautoriser depuis l'état courant lorsque nécessaire et conserver un audit approprié.

Les tokens/secrets d'invitation ne doivent jamais être persistés ou exposés en clair.

---

## 11. Ce qu'il ne faut pas faire dans D-020

Ne pas :

- réutiliser `PlatformInvitation` comme `CommercialInvitation` ;
- commencer par coder avant de figer le flow commercial ;
- créer un Workspace orphelin au moment de l'envoi ;
- inventer une date lointaine pour simuler l'illimité ;
- transformer un accès commercial permanent en trial sans fin ;
- accorder dynamiquement toutes les capabilities actuelles ou futures ;
- laisser un commercial fabriquer un Plan arbitraire lors de l'invitation ;
- stocker le token d'invitation en clair ;
- autoriser une acceptation non atomique laissant Subscription/Workspace/User incohérents ;
- modifier D-002 pendant D-020 ;
- ouvrir D-015 avant clôture D-020 ;
- ajouter un provider de paiement réel dans D-020 ;
- développer des modules métier du futur SaaS dans le Core.

---

## 12. Prochaine reprise exacte

La prochaine conversation doit suivre cet ordre :

```text
1. git pull
2. vérifier le HEAD courant
3. lire docs/REPRISE-CURRENT.md
4. lire docs/DEBT.md — D-020
5. lire docs/contracts/COMMERCIAL.md
6. inspecter le code actuel Plan / Subscription / TrialEligibility / Workspace / PlatformInvitation / Platform permissions
7. identifier les invariants déjà garantis et les éventuelles contraintes de schéma/index
8. proposer le Gate D-020.1 complet avant toute modification
9. résoudre explicitement les points de cadrage encore ouverts
10. seulement après accord, découper puis implémenter le premier mini-lot backend non destructif
```

Ne pas recommencer D-019 et ne pas ouvrir D-015 pendant D-020.1.

---

## 13. Résumé de reprise en une phrase

D-018 et D-019 sont **VALIDÉS** ; le Core possède désormais son RBAC Platform interne et un moteur générique de rétention/purge sécurisé, versionné, borné, traçable et administrable — la prochaine conversation doit démarrer **D-020.1**, en auditant le code commercial existant puis en figeant le contrat de `CommercialInvitation` et des offres privées de découverte avant toute implémentation.
