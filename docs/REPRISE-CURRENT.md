# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état courant après fusion de D-016 et après l’audit final architecture / sécurité / qualité du Core.
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

## 2. État Git de référence

D-015 — gouvernance de release / provenance / migrations — est validée et fusionnée.

D-016 — E2E du Core avec Playwright — est validée et fusionnée.

État `main` vérifié après fusion de la PR #15 :

```text
HEAD main : 43f318d81c261c4c788f726b4ed4f83647a3c4d9
PR #15    : fusionnée
merge     : 43f318d81c261c4c788f726b4ed4f83647a3c4d9
```

Validation CI post-merge réellement observée :

```text
workflow : Core Gate
run      : 35212998693
number   : 22
status   : completed
result   : success
```

Le ruleset distant `Main protection` est actif sur la branche par défaut et impose notamment une Pull Request ainsi que le status check `Core Gate`.

---

## 3. Infrastructure E2E validée

Le Core dispose d’un package Playwright autonome :

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

## 5. Lifecycle Account / Workspace validé

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

L’archivage est une fonctionnalité utilisateur réelle. Il ne s’agit pas d’un helper de test.

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

Les anciennes propositions de routes `DELETE /api/workspaces/:workspaceId` ou `DELETE /api/users/me` ne décrivent pas le contrat courant et ne doivent pas être réintroduites.

---

## 6. Audit final architecture / sécurité / qualité

L’audit final effectué sur le `main` fusionné n’a démontré aucun nouveau blocker applicatif Core 1.0.

Constats principaux :

- architecture backend modulaire cohérente ;
- architecture frontend conforme à la séparation `features` / composants partagés / RTK Query / Redux Toolkit ;
- authentification, rotation de session, multi-tenant, RBAC et fermeture de compte cohérents avec les contrats ;
- quotas `UsageMetric` réservés atomiquement ;
- pipeline File fail-closed sur l’inspection et l’antivirus ;
- isolation Playwright destructive limitée à la base `_e2e_test` ;
- gouvernance release et manifest de migrations cohérents ;
- aucun défaut code/sécurité démontré nécessitant de rouvrir le Core avant D-017.

Les écarts trouvés par l’audit sont documentaires : plusieurs documents décrivaient encore D-015, D-016 ou Playwright comme futurs alors que le code, Git et la CI avaient déjà avancé.

La correction documentaire post-audit doit rester strictement limitée à cette synchronisation et obtenir une nouvelle `Core Gate` verte avant fusion.

---

## 7. État canonique des dettes

```text
D-002  VALIDÉ
D-011  VALIDÉ
D-015  VALIDÉ — 2026-09-17
D-016  VALIDÉ — 2026-09-17
D-021  VALIDÉ
D-022  VALIDÉ
D-025  VALIDÉ — 2026-09-16

D-020  DIFFÉRÉ — validation terrain, non bloquant Core 1.0

D-017  PLANIFIÉ — prochain blocker Core 1.0 après synchronisation documentaire post-audit

D-023  DIFFÉRÉ — Core 1.1
D-024  DIFFÉRÉ — Core 1.1
```

Les dettes de production dépendantes d’un produit réel — conformité finale, billing/payment, observabilité, stockage production, déploiement — restent distinctes de la validation du Core générique.

---

## 8. Séquence restante vers Core stable

```text
synchronisation documentaire post-D-016 / post-audit
→ nouvelle Core Gate verte
→ fusion de la PR documentaire
→ vérifier le nouveau HEAD main
→ D-017 dérivation + upgrade pilote
→ corrections éventuelles révélées par D-017
→ nouvelle gate globale
→ release candidate / tag stable uniquement lorsque la stratégie de distribution est réellement validée
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
