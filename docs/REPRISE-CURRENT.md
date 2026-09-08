# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse reflète l'état réel de la branche de travail. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment.
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

---

## 2. État Git et roadmap

Branche stable au démarrage de D-020 :

```text
main
abc2777a587aa7ec8711b5569de9e0d98d0de602
```

Branche de travail :

```text
feature/d020-commercial-invitations
```

Roadmap :

```text
D-018 Équipe Platform / RBAC / invitations internes            ✅ VALIDÉ
D-019 moteur sécurisé de rétention / purge Core                ✅ VALIDÉ
DOC-CODE-1 normalisation documentation source                  ✅ VALIDÉ
HOME-CORE accès public login/register                          🔄 gate locale finale à reconfirmer
D-020 invitation commerciale / offre privée découverte         🔄 EN COURS
→ D-015 versionnement / provenance / migrations / release
→ D-016 Playwright / E2E Core
→ D-002 corbeille / restauration Files                         OBLIGATOIRE AVANT PREMIÈRE DÉRIVATION
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
→ release v1.0.0
→ première dérivation métier
```

D-002 reste indépendant de D-020 et n'est pas implémenté dans cette branche.

---

## 3. D-020 — contrat courant

Contrat canonique :

```text
docs/contracts/COMMERCIAL-INVITATIONS.md
```

### 3.1 Frontières

```text
PlatformInvitation
→ collaborateur interne de l'éditeur

CommercialInvitation
→ acquisition initiale / futur client / bêta-testeur

WorkspaceInvitation
→ membre d'un workspace existant
```

Aucun mode `attach` à un workspace existant n'est introduit dans D-020.

Un compte Auth existant peut recevoir/accepter une invitation commerciale uniquement s'il ne possède aucun `WorkspaceMember` `active` ou `suspended`. L'existence du User seule n'est pas un motif de refus.

### 3.2 Plan privé

Une invitation D-020 cible exclusivement un Plan :

```text
status = active
isPublic = false
systemRole = null
```

Le catalogue public reste filtré côté backend sur `status=active` + `isPublic=true`. Le Plan privé n'est donc jamais une option utilisateur publique.

### 3.3 Contrat temporel Subscription

```text
termType = fixed | open_ended
```

Vrai trial :

```text
fixed
trialing
trialEndsAt future
currentPeriodEnd = trialEndsAt
TrialEligibility consommé
```

Accès Découverte gratuit durable :

```text
open_ended
active
billingInterval = none
priceExclTaxMinor = 0
provider = manual
currentPeriodEnd = null
trialEndsAt = null
cancelAtPeriodEnd = false
```

Le resolver valide tous ces invariants et retombe sur la baseline si une commerciale `open_ended` est incohérente.

### 3.4 Migration `termType`

D-020 ajoute une migration idempotente :

```bash
npm run migration:subscription-term-type
```

Backfill :

```text
baseline   → open_ended
commercial → fixed
```

La migration refuse les anciennes Subscriptions sans `kind` exploitable.

Ordre opérationnel documenté dans `docs/operations/OPERATIONS.md` :

```text
subscription-kind déjà appliquée
→ subscription-term-type
→ code D-020
→ seed:platform-roles
```

### 3.5 CommercialInvitation

Le domaine contient désormais :

- email canonical ;
- Plan privé ;
- nom du premier workspace ;
- motif administratif obligatoire ;
- token hashé ;
- états pending/accepted/expired/revoked ;
- état de livraison ;
- expiration ;
- acteur d'invitation ;
- références Workspace/Subscription après acceptation ;
- snapshot immuable de l'offre.

Le snapshot protège prix, périodicité, trial, fonctionnalités et limites. Un simple renommage du Plan reste toléré ; une dérive contractuelle impose une nouvelle invitation.

### 3.6 Sécurité du secret

- `crypto.randomBytes(32)` ;
- SHA-256 seulement en base ;
- resend = rotation du secret ;
- token jamais dans AuditLog ;
- preview/accept rate-limités ;
- API reçoit le token dans le body ;
- lien email : `/commercial-invitations/accept#token=<secret>`.

Le frontend devra lire le fragment, nettoyer immédiatement l'URL avec `history.replaceState` et ne jamais placer le secret dans une query string, localStorage ou un état Redux persistant.

### 3.7 Acceptation atomique

Une unique transaction MongoDB couvre :

```text
User rechargé + status active
→ invitation pending/non expirée
→ email exact
→ aucun membership active/suspended
→ Plan + snapshot revalidés
→ TrialEligibility précontrôlé si trial
→ Workspace
→ rôles système
→ owner
→ baseline
→ quota members
→ commerciale
→ TrialEligibility enregistré si trial
→ invitation accepted
→ audits
```

`createWorkspaceInSession()` réutilise l'orchestration Workspace existante sans dupliquer les règles métier.

### 3.8 Permissions Platform

```text
platform:commercial_invitations:read
platform:commercial_invitations:create
platform:commercial_invitations:resend
platform:commercial_invitations:revoke
```

Les presets `super_admin`, `platform_admin` et `commercial_support` sont alignés. `seed:platform-roles` devra être rejoué après déploiement afin de synchroniser les rôles système persistés sans toucher aux rôles personnalisés.

### 3.9 Routes backend

Administration Platform :

```text
POST /api/platform/commercial-invitations
GET  /api/platform/commercial-invitations
POST /api/platform/commercial-invitations/:invitationId/resend
POST /api/platform/commercial-invitations/:invitationId/revoke
```

Destinataire :

```text
POST /api/commercial-invitations/preview
POST /api/commercial-invitations/accept
```

`accept` exige Auth.

### 3.10 Tests présents mais non encore exécutés globalement

Des tests ont été ajoutés/adaptés pour :

- Zod strict ;
- offre privée / baseline / plan public ;
- accès gratuit durable ;
- vrai trial ;
- snapshot et dérive ;
- éligibilité bénéficiaire ;
- motif administratif ;
- duplicate-key concurrent sur invitation pending ;
- token URL hors query string ;
- acceptation atomique ;
- revalidation User ;
- mismatch email ;
- workspace existant ;
- TrialEligibility ;
- concurrence sur acceptation ;
- resolver `open_ended` ;
- lifecycle d'annulation `open_ended` ;
- migration `termType` ;
- permissions/presets Platform ;
- wiring routes / Auth / rate limit.

**Gate non déclarée verte :** aucun workflow GitHub Actions n'est configuré et les tests/lint n'ont pas pu être exécutés dans l'environnement distant courant.

---

## 4. D-002 — gate avant première dérivation

Décision figée :

```text
aucune première dérivation métier du Core
avant validation de D-002
```

D-002 reste séparé de D-020. Voir `docs/DEBT.md`.

Invariant D-019 à préserver : un fichier soft-deleted continue à consommer `storage_bytes` tant que le contenu physique existe ; une restauration avant purge ne réserve donc pas ce stockage une seconde fois.

---

## 5. Prochaine étape D-020

Le backend doit encore recevoir une gate d'exécution locale réelle avant d'être déclaré validé.

Pendant cette validation, le frontend D-020 peut être construit sur la branche dédiée en respectant :

```text
RTK Query pour les données serveur
DataTable partagé pour la liste admin
formulaires/confirmations partagés
aucun Plan privé dans le catalogue public
aucun secret persistant
backend = autorité finale
```

Le parcours destinataire devra conserver le token uniquement pendant le flow login/register/accept, puis l'effacer dès qu'il n'est plus nécessaire.

---

## 6. Gate locale à exécuter avant intégration dans main

Backend depuis la racine :

```bash
npm run lint
npm test
npm run format:check
```

Puis, après intégration frontend D-020 :

```bash
cd frontend
npm run lint
npm test
npm run build
```

La migration `subscription-term-type` ne doit pas être exécutée sur une base sans avoir vérifié que `subscription-kind` a déjà été appliquée.

---

## 7. Résumé

D-020 est **EN COURS** sur `feature/d020-commercial-invitations`. Le backend est largement implémenté et documenté, mais reste soumis à une gate réelle lint/tests avant validation. Le prochain grand lot est le frontend Platform + parcours bénéficiaire. D-002 reste indépendant et obligatoire avant toute première dérivation du Core.
