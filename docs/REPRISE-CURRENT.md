# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état courant à la clôture de D-015 et avant ouverture de D-016.
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

## 2. État validé de D-015

D-015 — versionnement, provenance, releases et discipline de migration du Core — est clôturée dans le présent lot documentaire, sous réserve de la `Core Gate` du commit de clôture avant fusion.

Éléments mis en place :

```text
core-release.json
CHANGELOG.md
docs/releases/RELEASE-POLICY.md
docs/releases/MIGRATION-POLICY.md
docs/releases/migration-manifest.json
scripts/release/releaseMetadata.js
scripts/release/verifyReleaseMetadata.js
backend/tests/release/releaseMetadata.test.js
.github/workflows/core-gate.yml
```

La commande canonique est :

```bash
npm run release:check
```

Elle enchaîne :

```text
release:verify
→ lint backend / tooling
→ tests backend
→ lint frontend
→ tests frontend
→ build frontend
```

D-016 doit ensuite intégrer la couverture E2E Playwright à la gate de release avant Core stable.

---

## 3. Validation CI D-015

Une première exécution de `Core Gate` avait révélé un test frontend trop synchrone vis-à-vis de l’ouverture asynchrone d’un drawer Base UI.

Le comportement applicatif n’a pas été modifié. Le test a été corrigé pour attendre l’ouverture réelle du `dialog`.

Validation locale ciblée communiquée par l’utilisateur :

```text
Test Files  2 passed (2)
Tests       8 passed (8)
```

Le dernier HEAD D-015 précédant le commit documentaire de clôture est :

```text
759cb9589d31ad083d78fbf5a892d432718ad526
```

La `Core Gate` correspondante est réellement terminée avec :

```text
workflow : Core Gate
run      : 35192502978
status   : completed
result   : success
```

Le commit documentaire de clôture qui porte `DEBT.md` et le présent fichier doit lui-même obtenir une `Core Gate` verte avant fusion de la PR #14.

---

## 4. Gouvernance GitHub désormais active

Ruleset vérifié le 2026-09-17 :

```text
nom : Main protection
enforcement : active
target : branche par défaut (main)
bypass list : vide
```

Règles effectives :

```text
Pull Request obligatoire avant fusion
Core Gate obligatoire avant fusion
suppression de main bloquée
force-push bloqué
Required approvals = 0
branche à jour avec main non imposée
```

Cette configuration est adaptée au dépôt solo actuel : elle impose la revue par PR et la gate technique sans inventer une obligation de reviewers inexistants.

---

## 5. Versionnement et provenance

Le Core reste actuellement :

```text
version = 0.1.0
channel = development
```

D-015 définit :

```text
0.x.y          → development
1.0.0-rc.N     → rc
1.0.0          → stable
```

Une RC ou release publiée doit utiliser un tag Git immuable `v<version>` et une GitHub Release avec notes structurées.

Le tag stable `v1.0.0` reste interdit tant que D-016 et D-017 ne sont pas validées.

La provenance d’un SaaS dérivé est définie via `core-origin.json` avec :

```text
schemaVersion
repository
version
tag
commit
integratedAt
```

D-017 doit encore éprouver cette convention sur un dépôt dérivé réel.

---

## 6. Discipline des migrations

Le dépôt conserve des runners explicites et n’ajoute pas de registre Mongo persistant uniquement par convention.

Le modèle validé est :

```text
runner explicite
+
script npm migration:*
+
manifest machine-readable
+
release notes obligatoires
+
gate release:verify / release:check
```

Inventaire D-015 vérifié :

```text
16 scripts migration:*
16 runners run*Migration.js
16 entrées migration-manifest.json
```

Le helper :

```text
backend/migrations/backfillRegisteredSystemRolePermissions.migration.js
```

reste volontairement hors manifest car il n’est pas un runner autonome.

---

## 7. Documentation D-015 alignée

Les documents suivants ont été alignés avec la gouvernance de release :

```text
README.md
docs/README.md
docs/operations/OPERATIONS.md
docs/derived-saas/DERIVED-SAAS.md
docs/releases/RELEASE-POLICY.md
docs/releases/MIGRATION-POLICY.md
CHANGELOG.md
```

Le contrat `core-origin.json` est défini mais ne sera considéré éprouvé qu’après D-017.

---

## 8. État canonique des dettes après D-015

```text
D-002  VALIDÉ
D-011  VALIDÉ
D-015  VALIDÉ — 2026-09-17
D-021  VALIDÉ
D-022  VALIDÉ
D-025  VALIDÉ — 2026-09-16

D-020  DIFFÉRÉ — validation terrain, non bloquant Core 1.0

D-016  PLANIFIÉ — prochain blocker Core 1.0
D-017  PLANIFIÉ — après D-016

D-023  DIFFÉRÉ — Core 1.1
D-024  DIFFÉRÉ — Core 1.1
```

D-016 devient donc le prochain chantier une fois D-015 fusionnée dans `main` et le HEAD distant revérifié.

---

## 9. Roadmap restante vers Core stable

```text
ÉTAPE 1 — terminer la clôture D-015
→ Core Gate verte sur le commit documentaire final
→ fusion PR #14
→ revérifier main

ÉTAPE 2 — D-016
→ installer/configurer Playwright
→ couvrir les parcours E2E Core critiques
→ intégrer les E2E à release:check / Core Gate

ÉTAPE 3 — audit final Core
→ architecture
→ sécurité
→ qualité
→ documentation
→ aucun blocker résiduel non traité

ÉTAPE 4 — D-017
→ sélectionner/créer une release candidate appropriée
→ créer un SaaS dérivé pilote en conservant l’historique Git du Core
→ origin = dépôt produit
→ upstream-core = dépôt Core
→ créer core-origin.json
→ ajouter un petit module métier réel
→ ajouter une extension d’aide métier
→ faire évoluer le Core
→ réaliser un upgrade réel du dérivé
→ exécuter migrations/configuration
→ tests Core + métier + E2E
→ analyser conflits et provenance

ÉTAPE 5 — stabilisation finale
→ corrections éventuelles révélées par D-016 / D-017
→ nouvelle gate globale
→ tag/release Core stable uniquement lorsque la stratégie de distribution est réellement validée
```

Ne pas créer `v1.0.0` avant D-016 et D-017.

---

## 10. Ce qu’il ne faut pas faire maintenant

Tant que la PR D-015 n’est pas fusionnée :

```text
ne pas ouvrir D-016 sur main
ne pas créer de tag RC ou stable
ne pas créer le dépôt métier définitif
ne pas configurer de base BETA
ne pas développer de module métier
```

Après fusion D-015, le prochain travail est uniquement D-016.

---

## 11. Première étape de la prochaine reprise

À la prochaine conversation ou après fusion de D-015 :

```text
1. vérifier le HEAD distant réel de main ;
2. confirmer que la PR #14 est fusionnée ;
3. confirmer que Core Gate est verte sur le commit fusionné applicable ;
4. relire D-016 dans docs/DEBT.md ;
5. inspecter les tests frontend/backend et l’infrastructure de test actuelle ;
6. auditer l’absence/presence réelle de Playwright ;
7. cadrer D-016 avant toute implémentation ;
8. ne pas ouvrir D-017 avant validation de D-016.
```

---

## 12. Rappel de méthode

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
