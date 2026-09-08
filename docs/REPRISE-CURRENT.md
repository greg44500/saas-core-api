# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse reflète l’état réel de `main`. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment.
>
> **Dernière mise à jour : 2026-09-08**

---

## 1. Hiérarchie d’autorité

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

D-020 a été développé sur :

```text
feature/d020-commercial-invitations
```

La branche a été intégrée dans `main` par fast-forward après validation automatisée complète.

État actuel :

```text
D-020 backend + frontend implémentés
→ backend lint/tests verts
→ frontend lint/tests/build verts
→ intégré dans main
→ validation fonctionnelle manuelle complète différée
```

Roadmap :

```text
D-018 Équipe Platform / RBAC / invitations internes            ✅ VALIDÉ
D-019 moteur sécurisé de rétention / purge Core                ✅ VALIDÉ
DOC-CODE-1 normalisation documentation source                  ✅ VALIDÉ
HOME-CORE accès public login/register                          🟡 vérification manuelle à reconfirmer
D-020 invitation commerciale / offre privée découverte         🟡 INTÉGRÉ MAIN — MANUEL DIFFÉRÉ
→ D-015 versionnement / provenance / migrations / release
→ D-016 Playwright / E2E Core
→ D-002 corbeille / restauration Files                         OBLIGATOIRE AVANT PREMIÈRE DÉRIVATION
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
→ release v1.0.0
→ première dérivation métier
```

D-002 reste indépendant de D-020 et n’est pas implémenté.

---

## 3. D-020 — contrat intégré

Contrat canonique :

```text
docs/contracts/COMMERCIAL-INVITATIONS.md
```

### 3.1 Frontières métier

```text
PlatformInvitation
→ collaborateur interne de l’éditeur

CommercialInvitation
→ acquisition initiale / futur client / bêta-testeur

WorkspaceInvitation
→ membre d’un workspace existant
```

D-020 ne rattache jamais une invitation commerciale à un workspace existant.

Un compte Auth existant reste éligible uniquement s’il ne possède aucun `WorkspaceMember` `active` ou `suspended`.

### 3.2 Offre privée

Une invitation cible exclusivement :

```text
Plan.status = active
Plan.isPublic = false
Plan.systemRole = null
```

Le catalogue public utilisateur reste séparé et continue d’exiger `isPublic=true`.

Endpoint administratif dédié :

```text
GET /api/platform/commercial-invitations/offers
```

### 3.3 Trial et accès gratuit durable

Vrai trial :

```text
termType = fixed
status = trialing
billingInterval = monthly | yearly avec prix correspondant > 0
currentPeriodEnd = trialEndsAt
TrialEligibility consommé à l’acceptation
```

Accès privé gratuit durable :

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

Le resolver reste fail-closed : une commerciale `open_ended` incohérente retombe sur la baseline.

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

Précondition : `subscription-kind` déjà appliquée.

Après déploiement D-020 :

```bash
npm run seed:platform-roles
```

pour resynchroniser les permissions des rôles Platform système.

### 3.5 Sécurité du token

```text
crypto.randomBytes(32)
→ token brut envoyé uniquement au bénéficiaire
→ SHA-256 persisté
```

Lien :

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

Le vault permet de traverser Login/Register et de changer de compte sans exposer le secret. Un rechargement complet détruit volontairement le token et impose de rouvrir le lien email.

### 3.6 Acceptation atomique

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

### 3.7 Permissions Platform

```text
platform:commercial_invitations:read
platform:commercial_invitations:create
platform:commercial_invitations:resend
platform:commercial_invitations:revoke
```

### 3.8 Frontend

Implémenté avec les patterns Core existants :

- RTK Query pour les données serveur ;
- `DataTable` partagé ;
- `EntityDetailsDrawer` partagé ;
- confirmations partagées ;
- React Hook Form + Zod ;
- actions masquées si permission absente ;
- route Platform `/platform/commercial-invitations` ;
- route bénéficiaire `/commercial-invitations/accept` ;
- Login/Register compatibles avec le vault runtime ;
- changement de compte avant acceptation.

---

## 4. Gate automatisée D-020 — VALIDÉE

Le 2026-09-08, la gate locale a été exécutée et confirmée verte :

```text
backend npm run lint      ✅
backend npm test          ✅
frontend npm run lint     ✅
frontend npm test         ✅
frontend npm run build    ✅
```

Les suites couvrent notamment :

- validation Zod stricte ;
- plans public / privé / baseline ;
- catalogue administratif d’offres éligibles ;
- trial réellement payant ;
- offre privée gratuite durable ;
- snapshot et dérive du Plan ;
- bénéficiaire existant sans workspace ;
- bénéficiaire déjà rattaché ;
- motif administratif ;
- token hashé / rotation / URL fragment ;
- preview publique rate-limitée ;
- accept authentifié ;
- mismatch email ;
- User désactivé ;
- TrialEligibility ;
- acceptation atomique et concurrence ;
- resolver/lifecycle `open_ended` ;
- migration `termType` ;
- permissions/presets Platform ;
- RTK Query ;
- formulaire invitation ;
- navigation Platform ;
- vault runtime ;
- changement de compte ;
- acceptation frontend puis navigation vers le workspace.

### 4.1 Prettier

Le script racine `format:check` exécute `prettier --check .`, mais le dépôt ne possède pas encore de configuration Prettier canonique représentant ses conventions historiques.

Décision :

```text
prettier --write .  INTERDIT dans D-020
format:check global NON BLOQUANT pour D-020
normalisation Prettier = chantier outillage séparé
```

---

## 5. Validation fonctionnelle manuelle — DIFFÉRÉE

D-020 est intégré dans `main`, mais la validation manuelle complète du parcours est volontairement différée.

Checklist à conserver pour la prochaine vérification :

```text
Platform → Invitations commerciales
→ seules les offres privées compatibles sont proposées
→ création invitation
→ email / lien #token
→ preview
→ register ou login
→ retour automatique au parcours
→ changement de compte possible
→ acceptation
→ premier workspace créé
→ droits issus du Plan privé
→ invitation passée à accepted
```

Pour un trial :

```text
trial démarre à l’acceptation
aucun moyen de paiement demandé dans ce parcours
TrialEligibility consommé une seule fois
```

Pour une offre gratuite durable :

```text
Subscription commercial = active/open_ended
aucune TrialEligibility consommée
```

Cette validation manuelle devra être réalisée avant de considérer D-020 comme fonctionnellement clôturé pour une release finale du Core.

---

## 6. D-002 — gate avant première dérivation

Décision figée :

```text
aucune première dérivation métier du Core
avant validation de D-002
```

D-002 reste séparé de D-020. Voir `docs/DEBT.md`.

Invariant D-019 à préserver : un fichier soft-deleted continue à consommer `storage_bytes` tant que le contenu physique existe ; une restauration avant purge ne réserve donc pas ce stockage une seconde fois.

---

## 7. Dettes et contrôles différés à conserver

### 7.1 Dette UI — icônes de navigation

**À traiter ultérieurement — non bloquant pour la reprise immédiate.**

> Modifier les icônes de la navigation pour ne pas avoir deux ou trois fois les mêmes.

Constat actuel : certaines entrées de navigation utilisent visuellement la même icône ou des icônes trop proches, notamment dans le groupe **Offre commerciale** (`Plans`, `Abonnements`, `Invitations commerciales`).

Objectif UX :

```text
une entrée fonctionnelle importante
→ une icône identifiable et sémantiquement cohérente
→ éviter les répétitions qui réduisent la lisibilité de la navigation
```

Cette dette est purement frontend/UX : elle ne doit entraîner aucune modification des permissions, routes, contrats API ou règles métier.

### 7.2 Dette outillage — Prettier global

Le contrôle Prettier global reste à cadrer dans un chantier d’outillage séparé. Ne pas lancer `prettier --write .` tant qu’une configuration canonique du dépôt n’a pas été décidée.

### 7.3 Contrôles manuels différés

Restent à reconfirmer avant release finale du Core :

- parcours fonctionnel D-020 complet ;
- HOME-CORE login/register public ;
- cohérence visuelle globale de la navigation après traitement de la dette d’icônes.

---

## 8. Prochaine reprise de travail

Le prochain bloc à ouvrir dans une nouvelle discussion est :

```text
D-015 — Versionnement, provenance, releases et discipline de migration du Core
```

Objectif de la prochaine discussion : **cadrer D-015 avant de modifier le code**, puis seulement implémenter un lot cohérent.

Ordre attendu :

1. relire `docs/REPRISE-CURRENT.md` ;
2. relire la section D-015 de `docs/DEBT.md` ;
3. inspecter le dépôt réel (`package.json`, migrations, documentation d’exploitation, éventuels scripts de version/release) ;
4. définir le contrat de versionnement du Core : SemVer, provenance, changelog/release notes, migrations, ordre pre/post-deploy, rollback et identification du commit/version Core dans un SaaS dérivé ;
5. proposer un plan d’implémentation D-015 avant tout changement ;
6. conserver D-020 manuel comme contrôle différé ;
7. ne pas ouvrir D-002 dans D-015 — D-002 reste un bloc séparé mais obligatoire avant D-017 et avant toute première dérivation métier.

Aucune nouvelle fonctionnalité métier ne doit être ajoutée pendant D-015.
