# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active. Il doit rester court et refléter l'état réel de la branche de travail. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment.
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

À chaque reprise : vérifier le HEAD de `main`, la branche de travail active et le diff réel avant toute modification.

---

## 2. Objectif du Core

`saas-core-api` est un **socle SaaS générique clonable, maintenable et évolutif**.

Le Core porte les responsabilités transversales : authentification/sessions, RBAC Workspace et Platform, Workspaces/membres, Plans/Subscriptions/trial, entitlements/quotas/dérogations, fichiers sécurisés, audit logs, lifecycle Account/Workspace, rétention/purge générique, onboarding commercial générique, points d'extension métier, versionnement/migrations/upgrade et E2E Core.

Les modules métier réels ne doivent pas être développés directement dans le dépôt Core.

---

## 3. État Git et roadmap réelle

Branche stable au démarrage de D-020 :

```text
main
abc2777a587aa7ec8711b5569de9e0d98d0de602
```

Branche de travail courante :

```text
feature/d020-commercial-invitations
```

État des blocs :

```text
D-018 Équipe Platform / RBAC / invitations internes            ✅ VALIDÉ
D-019 moteur sécurisé de rétention / purge Core                ✅ VALIDÉ
DOC-CODE-1 normalisation documentation source                  ✅ VALIDÉ
HOME-CORE accès public login/register                          🔄 INTÉGRÉ — gate locale finale à reconfirmer
D-020 invitation commerciale / offre privée découverte         🔄 EN COURS
→ D-015 versionnement / provenance / migrations / release
→ D-016 Playwright / E2E Core
→ D-002 corbeille / restauration Files                         OBLIGATOIRE AVANT PREMIÈRE DÉRIVATION
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
→ release v1.0.0
→ première dérivation métier
```

D-018, D-019 et DOC-CODE-1 ne doivent pas être rouverts sans bug démontré ou nouvelle exigence générique.

D-002 reste un bloc indépendant de D-020. Il n'est pas implémenté dans la branche D-020, mais il est désormais un **gate obligatoire avant la première dérivation du Core**.

---

## 4. HOME-CORE — correctif intégré, gate locale à reconfirmer

La landing publique générique fournit désormais :

- `Se connecter` vers `/login` ;
- `Créer un compte` vers `/register` ;
- `ThemeToggle` ;
- aucun contenu métier spécifique.

Commits repères :

```text
2236b8f7e859f9f623129080f47f66a86f6caad6
32f22956234b057377b2ce247701775b85f7b759
9717f177e470a391183b3c9ffae33cfacbac6ba7
```

La gate locale suivante reste à reconfirmer explicitement avant de considérer HOME-CORE clôturé :

```text
frontend lint global
frontend tests globaux
build Vite
navigation / → /login
navigation / → /register
```

Cette absence de confirmation ne doit pas être transformée artificiellement en résultat vert dans la documentation.

---

## 5. D-020 — Invitation commerciale client / offre privée

Contrat canonique :

```text
docs/contracts/COMMERCIAL-INVITATIONS.md
```

### 5.1 Frontière fonctionnelle figée

```text
PlatformInvitation
→ collaborateur interne de l'éditeur

CommercialInvitation
→ nouveau prospect / futur client / bêta-testeur
```

`CommercialInvitation` n'est pas un mécanisme de gestion d'un workspace existant.

Règle D-020 :

```text
invitation commerciale initiale
→ adresse non encore inscrite lors de la création de l'invitation
→ inscription via Auth normal
→ authentification
→ acceptation
→ création du premier Workspace
```

Un utilisateur déjà géré dans un workspace utilise les mécanismes `Subscription` / `EntitlementOverride` prévus ; aucun mode `attach` n'est introduit dans D-020.

### 5.2 Plan privé

Une invitation D-020 ne peut cibler qu'un Plan :

```text
status = active
isPublic = false
systemRole = null
```

Le Plan privé n'appartient pas au catalogue public. Le catalogue utilisateur reste limité aux Plans publics.

Les capabilities et limites viennent exclusivement du Plan sélectionné. Elles ne sont jamais envoyées comme autorité par le frontend.

### 5.3 Gratuit durable et trial

Le contrat temporel des Subscriptions est désormais explicité par :

```text
termType = fixed | open_ended
```

Un vrai trial :

```text
termType = fixed
status = trialing
trialEndsAt requis
currentPeriodEnd = trialEndsAt
TrialEligibility consommé atomiquement
```

Une offre Découverte gratuite durable :

```text
termType = open_ended
status = active
billingInterval = none
priceExclTaxMinor = 0
provider = manual
currentPeriodEnd = null
trialEndsAt = null
```

Le resolver reconnaît une commerciale `open_ended` uniquement si l'ensemble de ces invariants est cohérent. Une configuration incohérente échoue fermée et ne masque pas la baseline.

Aucune date artificielle lointaine ne simule l'illimité.

### 5.4 Sécurité de l'invitation

- token aléatoire de 32 octets ;
- seul son hash SHA-256 est persisté ;
- token brut jamais loggé ni renvoyé par l'API d'administration ;
- expiration ;
- resend = rotation du secret + invalidation de l'ancien ;
- revoke explicite et audité ;
- endpoints destinataire rate-limités ;
- `preview` ne révèle pas l'adresse email ;
- `accept` exige `authenticate()` et vérifie l'email du compte ;
- acceptation conditionnelle pour résister aux courses concurrentes.

### 5.5 Snapshot d'offre

L'invitation conserve un snapshot serveur des termes proposés : prix, devise, périodicité, trial, capabilities et limites.

Un simple renommage du Plan ne modifie pas le contrat et reste toléré.

Toute dérive significative des termes entre envoi et acceptation/resend provoque un refus `409` et impose la création d'une nouvelle invitation. Une offre envoyée ne doit jamais changer silencieusement.

### 5.6 Acceptation atomique

L'acceptation exécute dans une seule transaction MongoDB :

```text
revalidation User + email
revalidation invitation + Plan + snapshot
vérification absence de membership existant
pré-contrôle TrialEligibility si vrai trial
création Workspace
création rôles système
création owner WorkspaceMember
création baseline Subscription
initialisation quota members
création Subscription commerciale
record TrialEligibility si trial
CommercialInvitation → accepted
AuditLog Workspace / Subscription / invitation
```

`createWorkspaceInSession()` centralise le provisioning tenant et évite toute duplication de logique métier.

### 5.7 Permissions Platform dédiées

```text
platform:commercial_invitations:read
platform:commercial_invitations:create
platform:commercial_invitations:resend
platform:commercial_invitations:revoke
```

Ces permissions sont distinctes de `platform:team:*`.

### 5.8 Routes backend D-020

Administration Platform :

```text
POST /api/platform/commercial-invitations
GET  /api/platform/commercial-invitations
POST /api/platform/commercial-invitations/:invitationId/resend
POST /api/platform/commercial-invitations/:invitationId/revoke
```

Parcours destinataire :

```text
POST /api/commercial-invitations/preview
POST /api/commercial-invitations/accept
```

`accept` exige Auth. Les tokens sont envoyés dans le body API, pas dans le path.

### 5.9 Tests créés mais non encore déclarés verts

Couverture ajoutée ou adaptée :

- validation Zod CommercialInvitation ;
- invariants Plan privé / gratuit / trial ;
- dérive du snapshot ;
- acceptation atomique ;
- mismatch email ;
- refus workspace existant ;
- TrialEligibility ;
- concurrence sur acceptation ;
- resolver `open_ended` ;
- cycle de résiliation `open_ended` ;
- wiring routes / permissions / rate limit.

**Important :** aucun workflow GitHub Actions n'est configuré dans le dépôt et les tests D-020 n'ont pas encore été exécutés globalement dans cet environnement. Ils ne doivent donc pas être présentés comme verts avant validation locale réelle.

---

## 6. D-002 — gate avant première dérivation

D-002 ne fait pas partie de l'implémentation D-020.

Décision désormais figée :

```text
aucune première dérivation métier du Core
avant validation de D-002
```

D-002 devra fournir au minimum :

- listing sécurisé de la corbeille par Workspace ;
- restauration sécurisée d'un ou plusieurs fichiers ;
- permissions dédiées ;
- isolation tenant ;
- coordination avec le moteur D-019 pour empêcher une restauration après claim de purge ;
- audit ;
- UI `Ressources > Corbeille` réutilisant le `DataTable` partagé ;
- tests de sécurité et de concurrence.

Invariant issu de D-019 : un fichier soft-deleted continue à consommer `storage_bytes` tant que son contenu physique existe. Une restauration avant purge ne doit donc pas réserver une seconde fois le même stockage.

La durée effective de rétention reste gouvernée par la policy de rétention ; aucune durée universelle ne doit être inventée par l'UI.

---

## 7. Règles permanentes de développement

### Backend

- JavaScript uniquement ;
- Zod strict ;
- logique métier dans les services ;
- controllers minces ;
- routes sans logique métier ;
- isolation Workspace ;
- RBAC ;
- entitlements/quotas lorsque nécessaires ;
- audit ;
- transactions lorsque les invariants l'exigent ;
- sécurité fail-closed ;
- documentation source selon `docs/architecture/CODE-DOCUMENTATION.md`.

### Frontend

```text
useState      → état UI local
Redux Toolkit → état client global
RTK Query     → état serveur
```

- pages = assemblage ;
- appels API via RTK Query ;
- composants partagés obligatoires lorsqu'ils sont pertinents ;
- `DataTable` partagé obligatoire pour les listings tabulaires pertinents ;
- aucune duplication de drawer, confirmation, toast ou infrastructure transverse ;
- backend = autorité finale sur permissions, entitlements et transitions sensibles ;
- documentation source obligatoire selon le niveau de complexité.

---

## 8. Prochaine reprise exacte

```text
1. vérifier main et feature/d020-commercial-invitations
2. relire docs/contracts/COMMERCIAL-INVITATIONS.md
3. considérer D-018, D-019 et DOC-CODE-1 comme VALIDÉS
4. ne pas ouvrir D-015
5. ne pas implémenter D-002 dans le lot D-020
6. terminer les tests backend impactés par termType et le refactor Workspace
7. exécuter localement lint + tests backend globaux
8. corriger toute régression avant frontend
9. implémenter ensuite le frontend D-020 avec RTK Query et composants partagés
10. revalider frontend lint + tests + build
11. seulement après validation globale envisager l'intégration de D-020 dans main
```

---

## 9. Résumé en une phrase

D-018, D-019 et DOC-CODE-1 sont validés ; D-020 est **en cours sur `feature/d020-commercial-invitations`** avec un backend commercial distinct, privé, fail-closed et atomique en cours de validation ; D-002 reste séparé mais devient **obligatoire avant toute première dérivation métier du Core**.