# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état courant à la clôture de D-016, avant fusion définitive de la PR #15.
>
> Le code actuel, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-17**

---

## 1. Hiérarchie d’autorité

En cas de contradiction :

1. code actuel et contraintes DB ;
2. tests automatisés réellement exécutés et validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. présent fichier de reprise.

Les anciennes synthèses de reprise ne sont pas autoritatives lorsqu’elles sont dépassées.

Le dépôt reste en développement `0.1.0`. Aucun tag `v1.0.0`, aucune RC et aucune release stable ne sont encore créés.

---

## 2. D-016 — état de clôture

D-016 — E2E du Core avec Playwright — est considérée fonctionnellement validée sur la branche `feature/d-016-playwright-e2e-core`.

Le dernier HEAD applicatif validé avant le commit documentaire de clôture est :

```text
e0fac2aa8126bf49f7ffa8747d1d93e7e551040e
```

Validation CI réelle :

```text
workflow : Core Gate
run      : 35210282566
number   : 19
status   : completed
result   : success
```

La PR concernée est :

```text
PR #15 — D-016 — Playwright E2E Core
base : main
head : feature/d-016-playwright-e2e-core
```

Le commit documentaire qui porte la présente clôture doit lui-même obtenir une `Core Gate` verte avant fusion de la PR #15.

---

## 3. Infrastructure E2E validée

Le Core dispose maintenant d’un package Playwright autonome :

```text
e2e/
├── package.json
├── package-lock.json
├── playwright.config.js
├── support/
└── tests/
```

Principes validés :

- Playwright `1.63.0` ;
- Chromium pour la gate Core actuelle ;
- backend E2E sur `127.0.0.1:5100` ;
- frontend E2E sur `127.0.0.1:5174` ;
- MongoDB dédiée `saas_core_e2e_test` ;
- garde stricte : toute base utilisée pour le nettoyage Playwright doit se terminer par `_e2e_test` ;
- préparation déterministe avant exécution ;
- exécution séquentielle (`workers: 1`) ;
- traces, captures et vidéos conservées en cas d’échec ;
- `npm run test:e2e` intégré à `npm run release:check` ;
- installation des dépendances E2E, Chromium et exécution de la gate intégrées à `.github/workflows/core-gate.yml`.

Le nettoyage global E2E est un mécanisme technique de fixtures. Il ne constitue jamais une preuve de fonctionnalité utilisateur.

---

## 4. Parcours navigateur couverts

Les scénarios Playwright présents couvrent les parcours navigateur suivants :

```text
inscription → connexion → session restaurée via refresh HttpOnly
logout → reload → route protégée toujours inaccessible
création du premier workspace → dashboard
renommage workspace → persistance après reload
modification profil → persistance après reload
archivage workspace réel → retrait des espaces utilisables
fermeture compte réelle → session révoquée → route protégée inaccessible
```

Les ressources détruites par les deux derniers scénarios sont exclusivement jetables :

- compte généré pour le test ;
- workspace généré pour le test.

Playwright reste une couche de validation des parcours navigateur critiques. Les invariants de sécurité et de domaine déjà couverts par les suites backend/frontend spécialisées ne sont pas dupliqués mécaniquement en E2E lorsque cela n’apporte pas une vérification d’intégration distincte.

---

## 5. Audit final du lifecycle Account / Workspace

L’audit du code réel confirme que les opérations destructives existent comme contrats fonctionnels du Core.

### Workspace

Backend :

```text
GET  /api/workspaces/:workspaceId/closure-impact
POST /api/workspaces/:workspaceId/archive
```

Frontend :

```text
RTK Query archiveWorkspace
WorkspaceArchiveSection
confirmation par nom exact du workspace + mot de passe courant
```

L’archivage est donc une fonctionnalité utilisateur réelle. Il ne s’agit pas d’un helper de test.

### Account

Backend :

```text
GET  /api/users/me/closure-impact
POST /api/users/me/closure
```

Frontend :

```text
RTK Query getAccountClosureImpact / closeCurrentAccount
AccountClosureSection / AccountClosureDialog
confirmation email + mot de passe + confirmation explicite
```

Le service de fermeture traite transactionnellement le cycle :

```text
ACTIVE
→ DELETION_REQUESTED
→ CLOSED
→ révocation des AuthSession
```

### Contrats historiques à ne pas réintroduire

La notice initiale évoquait notamment :

```text
DELETE /api/workspaces/:workspaceId
DELETE /api/users/me
```

Ces routes ne doivent pas être recréées pour satisfaire Playwright. Le code actuel fait autorité et utilise les contrats d’archivage / fermeture explicites ci-dessus.

Aucune occurrence de helper `removeWorkspace` n’existe dans l’arbre actuel de la branche. Le nettoyage déterministe se fait au niveau de la base E2E dédiée, après validation de son nom, via la préparation de l’environnement de test.

---

## 6. État canonique des dettes

```text
D-002  VALIDÉ
D-011  VALIDÉ
D-015  VALIDÉ — 2026-09-17
D-016  VALIDÉ — 2026-09-17
D-021  VALIDÉ
D-022  VALIDÉ
D-025  VALIDÉ — 2026-09-16

D-020  DIFFÉRÉ — validation terrain, non bloquant Core 1.0

D-017  PLANIFIÉ — prochain blocker après clôture Git complète de D-016

D-023  DIFFÉRÉ — Core 1.1
D-024  DIFFÉRÉ — Core 1.1
```

D-017 ne doit pas être ouvert tant que :

```text
Core Gate du commit documentaire D-016 ≠ success
OU
PR #15 non fusionnée
OU
Core Gate du nouveau HEAD main non vérifiée success
```

---

## 7. Séquence de clôture D-016 restante

À partir du présent commit documentaire :

```text
1. exécuter / attendre la Core Gate finale de la PR #15 ;
2. fusionner la PR #15 uniquement si la gate est verte ;
3. récupérer le nouveau HEAD distant de main ;
4. vérifier la Core Gate déclenchée sur ce HEAD ;
5. seulement après ces quatre points, considérer la clôture Git de D-016 complète ;
6. ne pas démarrer D-017 avant cette vérification.
```

---

## 8. Roadmap restante vers Core stable

```text
D-016 clôture Git complète
→ audit final architecture / sécurité / qualité
→ D-017 dérivation + upgrade pilote
→ corrections éventuelles révélées par D-017
→ nouvelle gate globale
→ tag/release Core stable uniquement lorsque la stratégie de distribution est réellement validée
```

Ne pas créer `v1.0.0` avant D-017.

---

## 9. Rappel de méthode

À chaque reprise :

```text
Git réel
→ code réel
→ tests réellement exécutés
→ contrats canoniques
→ docs canoniques
→ synthèse de reprise
```

Ne jamais faire l’inverse.
