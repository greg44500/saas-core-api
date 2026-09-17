# Changelog

Ce fichier suit les releases formelles de `saas-core-api` à partir de D-015.

Le dépôt reste actuellement en développement `0.1.0` et ne possède encore aucun tag de release. L’historique détaillé antérieur à la première release candidate reste disponible dans Git ; il n’est pas reconstruit artificiellement comme une succession de versions qui n’ont jamais été publiées.

## Unreleased

### Release governance

- politique SemVer et cycle release candidate / stable ;
- identité Core machine-readable via `core-release.json` ;
- inventaire machine-readable des migrations ;
- gate de release reproductible ;
- CI et gouvernance de `main` à finaliser dans D-015.

### Core 1.0

La première release stable visée reste `v1.0.0`, uniquement après validation de D-016 et D-017.

---

## Development baseline — 0.1.0

La ligne `0.1.0` représente la phase de construction du Core avant adoption du processus de release formel. Elle inclut notamment les fondations Auth, Workspace, RBAC, Plans/Subscriptions/Entitlements, Files, Audit, Retention, Platform et Help validées avant l’ouverture de D-015.
