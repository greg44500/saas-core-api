# Changelog

Ce fichier suit les releases formelles de `saas-core-api` à partir de D-015.

Le dépôt reste actuellement en développement `0.1.0` et ne possède encore aucun tag de release. L’historique détaillé antérieur à la première release candidate reste disponible dans Git ; il n’est pas reconstruit artificiellement comme une succession de versions qui n’ont jamais été publiées.

## Unreleased

### Release governance

- politique SemVer et cycle release candidate / stable ;
- identité Core machine-readable via `core-release.json` ;
- inventaire machine-readable des migrations ;
- gate de release reproductible ;
- CI `Core Gate` alignée sur `npm run release:check` ;
- ruleset `Main protection` actif avec Pull Request et status check `Core Gate` requis.

### E2E Core

- package Playwright autonome sous `e2e/` ;
- environnement E2E isolé avec garde MongoDB `_e2e_test` ;
- parcours critiques Auth, Workspace et Account couverts ;
- `npm run test:e2e` intégré à `npm run release:check` et à la CI `Core Gate`.

### Core 1.0

D-015 et D-016 sont validées. L’audit final architecture / sécurité / qualité n’a démontré aucun nouveau blocker applicatif. La première release stable visée reste `v1.0.0`, uniquement après validation réelle de D-017 — dérivation et upgrade d’un SaaS pilote.

---

## Development baseline — 0.1.0

La ligne `0.1.0` représente la phase de construction du Core avant adoption du processus de release formel. Elle inclut notamment les fondations Auth, Workspace, RBAC, Plans/Subscriptions/Entitlements, Files, Audit, Retention, Platform et Help validées avant l’ouverture de D-015.
