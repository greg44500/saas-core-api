# SAAS-CORE-API — Reprise courante

**Dernière mise à jour :** 2026-10-01  
**Baseline stable :** v1.2.1  
**Point de départ du lot :** `main@d3b9891bc2a32705a0a99b2ed62bed60caf653ca`  
**Dernier lot intégré avant ce travail :** PR #47 — merge `d3b9891bc2a32705a0a99b2ed62bed60caf653ca`  
**Branche courante :** `feat/platform-navigation-sections`  
**Release cible :** aucune — évolution frontend compatible post-tag v1.2.1

## Objet du lot

Ajouter au moteur générique de navigation Platform une primitive visuelle `section` utilisable par les SaaS dérivés.

Le besoin est uniquement structurel :

```text
Core
→ fournit la primitive de section visuelle

produit dérivé
→ fournit libellés, routes, icônes, autorisations et comportement métier
```

Aucun référentiel métier, produit, fournisseur ou permission métier n’est ajouté au Core.

## Contrat de navigation Platform

Descriptors historiques conservés :

```text
item
group
separator interne Core
```

Nouveau descriptor applicatif :

```text
section
→ id
→ label
→ items[]
→ isVisible(context) optionnel
```

Une `section` :

- organise visuellement les entrées ;
- n’est jamais repliable ;
- disparaît si tous ses enfants sont filtrés ;
- ne laisse aucun séparateur orphelin ;
- reste compatible avec la Sidebar compacte ;
- alimente le routing et l’accès rapide à travers ses enfants.

Les anciens descriptors `item` et `group` conservent leur comportement et leur séparation historique.

## Autorisations

Invariant inchangé :

```text
Platform permissions
≠
Application Global permissions
```

Le contexte de visibilité conserve séparément :

```text
platformAccess
platformPermissions
applicationGlobalPermissions
```

Un Fondateur / Super Admin Platform ne reçoit aucune permission Application Global implicite. Les guards backend restent l’autorité de sécurité.

## Périmètre du lot

Modifié :

```text
frontend/src/app/application-platform-navigation.js
frontend/src/features/platform/lib/platform-navigation.js
frontend/src/components/shared/app-sidebar.jsx
frontend/src/app/application-platform-navigation.test.js
frontend/src/features/platform/lib/platform-navigation.test.js
frontend/src/features/workspace/components/workspace-sidebar.test.jsx
docs/derived-saas/EXTENSION-POINTS.md
docs/derived-saas/DERIVED-SAAS.md
docs/REPRISE-CURRENT.md
```

Non modifié :

```text
backend d’autorisation
MongoDB / Mongoose
migrations
plans / capabilities
RBAC Workspace
Files
subscriptions
référentiels métier
routes métier
```

## Validation

Gate canonique :

```bash
npm run release:check
```

Elle reste l’autorité avant merge.

Le résultat de la Core Gate est communiqué par Greg. Ne pas sonder ou relancer périodiquement GitHub Actions.

## Versionnement

La baseline stable reste :

```text
version = 1.2.1
tag     = v1.2.1
```

Le tag `v1.2.1` reste immuable. Aucun nouveau tag, aucune GitHub Release et aucune micro-version artificielle ne sont créés pour ce lot.

Après merge et validation de la Gate finale, un SaaS dérivé peut intégrer le SHA Core exact descendant de `v1.2.1` en conservant la version et le tag de base dans `core-origin.json`.

## Après validation Core

Ne pas modifier `saas-fiches-techniques-gms` avant confirmation de la fusion et de la Gate finale.

La reprise produit devra suivre :

```text
branche core-update dédiée
→ intégration du SHA Core exact
→ tests globaux produit
→ Core Gate produit
→ core-origin.json après validation
→ implémentation métier de Gestion des référentiels
```
