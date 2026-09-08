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

État actuel :

```text
D-020 implémenté backend + frontend
→ prêt pour gate locale réelle
→ pas encore VALIDÉ
```

Roadmap :

```text
D-018 Équipe Platform / RBAC / invitations internes            ✅ VALIDÉ
D-019 moteur sécurisé de rétention / purge Core                ✅ VALIDÉ
DOC-CODE-1 normalisation documentation source                  ✅ VALIDÉ
HOME-CORE accès public login/register                          🔄 gate locale finale à reconfirmer
D-020 invitation commerciale / offre privée découverte         🔄 PRÊT POUR GATE LOCALE
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

## 3. D-020 — contrat effectivement implémenté

Contrat canonique :

```text
docs/contracts/COMMERCIAL-INVITATIONS.md
```

### 3.1 Frontières métier

```text
PlatformInvitation
→ collaborateur interne de l'éditeur

CommercialInvitation
→ acquisition initiale / futur client / bêta-testeur

WorkspaceInvitation
→ membre d'un workspace existant
```

D-020 ne possède aucun mode de rattachement à un workspace existant.

Un compte Auth existant peut accepter une invitation uniquement s'il ne possède aucun `WorkspaceMember` `active` ou `suspended`.

### 3.2 Offre privée

Une invitation cible exclusivement :

```text
Plan.status = active
Plan.isPublic = false
Plan.systemRole = null
```

Le catalogue public utilisateur reste séparé et continue d'exiger `isPublic=true`.

Un endpoint administratif dédié fournit les seules offres réellement compatibles avec D-020 :

```text
GET /api/platform/commercial-invitations/offers
```

Cela évite de détourner la pagination générale des Plans pour alimenter un sélecteur métier.

### 3.3 Trial et accès gratuit durable

Vrai trial :

```text
termType = fixed
status = trialing
billingInterval = monthly | yearly avec prix correspondant > 0
currentPeriodEnd = trialEndsAt
TrialEligibility consommé à l'acceptation
```

Accès Découverte gratuit durable :

```text
termType = open_ended
status = active
billingInterval = none
priceExclTaxMinor = 0
provider = manual
currentPeriodEnd = null
trialEndsAt = null
cancelAtPeriodEnd = false
TrialEligibility non consommé
```

Le resolver reste fail-closed : une commerciale `open_ended` incohérente ne doit pas accorder de droits et retombe sur la baseline.

### 3.4 Migration `termType`

Commande ajoutée :

```bash
npm run migration:subscription-term-type
```

Backfill idempotent :

```text
baseline   → open_ended
commercial → fixed
```

Précondition : `subscription-kind` déjà appliquée. La procédure est documentée dans `docs/operations/OPERATIONS.md`.

Après déploiement D-020 :

```bash
npm run seed:platform-roles
```

pour resynchroniser les permissions des rôles Platform système.

### 3.5 CommercialInvitation

Le domaine couvre :

- email canonical ;
- Plan privé ;
- premier workspace ;
- motif administratif obligatoire ;
- token hashé ;
- lifecycle `pending / accepted / expired / revoked` ;
- état de livraison ;
- expiration ;
- auteur de l'invitation ;
- références Workspace / Subscription après acceptation ;
- snapshot de l'offre.

Une modification significative du Plan après l'envoi invalide l'invitation. Un simple renommage ne modifie pas le contrat accepté.

### 3.6 Sécurité du token

```text
crypto.randomBytes(32)
→ token brut envoyé uniquement au bénéficiaire
→ SHA-256 persisté
```

Le lien utilise :

```text
/commercial-invitations/accept#token=<secret>
```

Frontend :

```text
fragment capturé
→ vault JavaScript runtime
→ fragment immédiatement supprimé
→ aucun Redux / localStorage / sessionStorage / history.state / query string
```

Le vault permet de traverser Login/Register et de changer de compte sans exposer le secret. Un rechargement complet détruit volontairement le token et impose de rouvrir le lien email. Le secret est effacé après acceptation réussie.

### 3.7 Acceptation atomique

Une transaction MongoDB unique couvre :

```text
User rechargé + active
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

`createWorkspaceInSession()` permet cette composition sans dupliquer le provisioning Workspace existant.

### 3.8 Permissions Platform

```text
platform:commercial_invitations:read
platform:commercial_invitations:create
platform:commercial_invitations:resend
platform:commercial_invitations:revoke
```

Les presets système sont alignés et ces permissions ne réutilisent jamais les permissions `TEAM_*`.

### 3.9 Frontend

Implémenté avec les patterns Core existants :

- RTK Query pour les données serveur ;
- `DataTable` partagé ;
- `EntityDetailsDrawer` partagé ;
- confirmations partagées ;
- formulaires React Hook Form + Zod ;
- actions masquées si permission absente ;
- aucune duplication d'un système de tableau ou de drawer ;
- route Platform `/platform/commercial-invitations` ;
- route bénéficiaire `/commercial-invitations/accept` ;
- Login/Register compatibles avec le vault runtime ;
- possibilité de changer de compte avant acceptation.

---

## 4. Tests ajoutés / adaptés pour D-020

Les suites présentes couvrent notamment :

- validation Zod stricte ;
- plan public / privé / baseline ;
- catalogue administratif d'offres éligibles ;
- trial réellement payant ;
- offre privée gratuite durable ;
- snapshot et dérive du Plan ;
- bénéficiaire existant sans workspace ;
- bénéficiaire déjà rattaché à un workspace ;
- motif administratif ;
- token hashé / rotation / URL fragment ;
- duplicate-key d'une invitation pending ;
- preview publique rate-limitée ;
- accept authentifié ;
- mismatch email ;
- User désactivé ;
- TrialEligibility ;
- acceptation atomique et concurrence ;
- resolver `open_ended` ;
- lifecycle d'annulation `open_ended` ;
- migration `termType` ;
- permissions/presets Platform ;
- catalogue RTK Query ;
- formulaire invitation ;
- navigation Platform ;
- vault runtime ;
- changement de compte ;
- acceptation frontend puis navigation vers le workspace.

Ces tests sont présents dans le code mais **ne sont pas déclarés verts tant qu'ils ne sont pas réellement exécutés localement**.

---

## 5. D-002 — gate avant première dérivation

Décision figée :

```text
aucune première dérivation métier du Core
avant validation de D-002
```

D-002 reste séparé de D-020. Voir `docs/DEBT.md`.

Invariant D-019 à préserver : un fichier soft-deleted continue à consommer `storage_bytes` tant que le contenu physique existe ; une restauration avant purge ne réserve donc pas ce stockage une seconde fois.

---

## 6. Gate locale D-020 à exécuter maintenant

La branche D-020 est prête à être récupérée localement.

Depuis la racine :

```bash
npm run lint
npm test
```

Puis :

```bash
cd frontend
npm run lint
npm test
npm run build
```

### 6.1 Note sur Prettier

Le script racine `format:check` exécute actuellement `prettier --check .`, mais le dépôt ne possède pas encore de configuration Prettier canonique permettant de représenter correctement ses conventions historiques, notamment l'indentation backend à 4 espaces et frontend à 2 espaces.

Conséquence : le contrôle global signale massivement des fichiers historiques hors D-020. Il ne constitue donc pas un gate fiable pour D-020 et **`prettier --write .` ne doit pas être exécuté**, car cela provoquerait une refonte cosmétique globale hors périmètre.

La normalisation Prettier globale devra être traitée comme un chantier outillage dédié avant d'en faire une exigence de release bloquante.

Ne pas exécuter la migration `subscription-term-type` sur la base de développement pendant cette première gate de code sauf si l'objectif est explicitement de tester la migration sur une copie/état contrôlé de données.

Après validation automatisée, la vérification manuelle D-020 doit au minimum contrôler :

```text
Platform → Invitations commerciales
→ offre publique absente du sélecteur
→ création invitation privée
→ email / lien #token
→ preview
→ register ou login
→ retour à l'invitation
→ changement de compte possible
→ acceptation
→ premier workspace créé
→ droits issus du Plan privé
→ invitation passée à accepted
```

Pour un vrai trial, vérifier en plus que la date de trial démarre à l'acceptation et qu'aucun moyen de paiement n'est demandé dans ce parcours.

---

## 7. Critère de sortie

Si backend lint + tests, frontend lint + tests + build et la vérification manuelle ciblée sont verts :

```text
D-020 peut être déclaré VALIDÉ
→ documentation de reprise mise à jour
→ intégration dans main
→ bloc suivant
```

En cas d'échec, corriger uniquement D-020 ou la régression directement causée par D-020 ; ne pas rouvrir D-018/D-019/DOC-CODE-1 sans preuve d'un défaut réel.
