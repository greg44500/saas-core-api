# Changelog

Ce fichier suit les releases formelles de `saas-core-api` à partir de D-015.

La première release candidate formelle du Core est `v1.0.0-rc.1`, publiée le 2026-09-17. L’historique détaillé antérieur à cette première candidate reste disponible dans Git ; il n’est pas reconstruit artificiellement comme une succession de versions qui n’ont jamais été publiées.

## Unreleased

D-017 reste en cours. Aucun changement Core postérieur à `v1.0.0-rc.1` n’est encore publié comme nouvelle version.

---

## 1.0.0-rc.1 — 2026-09-17

Première Release Candidate réelle du Core, utilisée comme base immuable de dérivation pour l’exercice D-017.

Référence :

```text
tag : v1.0.0-rc.1
commit : 432fcfd88cd185234e6317a27df0d3d458f93f28
channel : rc
Core Gate post-merge : #28
run : 35224400758
conclusion : success
```

### Release governance

- politique SemVer et cycle release candidate / stable ;
- identité Core machine-readable via `core-release.json` ;
- inventaire machine-readable des migrations ;
- gate de release reproductible ;
- CI `Core Gate` alignée sur `npm run release:check` ;
- ruleset `Main protection` actif avec Pull Request et status check `Core Gate` requis ;
- tag Git annoté `v1.0.0-rc.1` publié sur le SHA validé ;
- GitHub Release publiée comme pre-release avec notes structurées.

### E2E Core

- package Playwright autonome sous `e2e/` ;
- environnement E2E isolé avec garde MongoDB `_e2e_test` ;
- parcours critiques Auth, Workspace et Account couverts ;
- `npm run test:e2e` intégré à `npm run release:check` et à la CI `Core Gate`.

### Core 1.0

- D-015 et D-016 sont validées ;
- l’audit final architecture / sécurité / qualité n’a démontré aucun nouveau blocker applicatif ;
- la préparation de `1.0.0-rc.1` n’introduit pas de fonctionnalité métier supplémentaire ;
- le module pilote `catalog` reste destiné au dépôt SaaS dérivé, pas au Core ;
- la release stable `v1.0.0` reste interdite tant que D-017 n’a pas validé la dérivation et l’upgrade réels d’un SaaS pilote.

---

## Development baseline — 0.1.0

La ligne `0.1.0` représente la phase de construction du Core avant adoption du processus de release formel. Elle inclut notamment les fondations Auth, Workspace, RBAC, Plans/Subscriptions/Entitlements, Files, Audit, Retention, Platform et Help validées avant l’ouverture de D-015.
