# SAAS-CORE-API — Reprise courante

**Dernière mise à jour :** 2026-10-02  
**Baseline stable :** v1.2.1  
**Point de départ du lot :** `main@6581e573c6a6885790b23fe502bd34d8199ea6ba`  
**Branche courante :** `feat/design-system-segmented-workspace-quick-access`  
**Release cible :** aucune — évolution frontend compatible post-tag v1.2.1

## Objet du lot

Ajouter des primitives génériques Design System nécessaires aux produits
dérivés, sans introduire de logique métier :

- `ToggleGroup` Base UI ;
- `SegmentedControl` exclusif et accessible ;
- variante `Button warning` ;
- accès rapide Workspace aux vues de navigation autorisées, symétrique à
  l'accès rapide Platform ;
- retrait du widget Core `Abonnement` du Dashboard Workspace, puisque le plan
  est déjà visible dans l'identité utilisateur et reste gérable dans sa vue dédiée.

## Frontière Core / métier

Le Core fournit la mécanique transverse uniquement. Aucun libellé, taux,
règle M-004, restauration ou référentiel métier n'est ajouté.

Le SaaS dérivé fournit ses items, valeurs, routes, permissions et usages.

## Navigation haute

La recherche de la topbar n'est pas une recherche de données métier.

```text
Platform
→ accès rapide aux vues Platform autorisées

Workspace
→ accès rapide aux vues Workspace autorisées
```

La mécanique Autocomplete/recherche est mutualisée dans
`components/shared/navigation-quick-access.jsx`.

Les enfants de `group` et `section` Workspace sont filtrés par permissions
et capabilities avant d'être rendus ou proposés dans l'accès rapide.

## Validation

Validation canonique :

```bash
npm run release:check
```

La Core Gate de la PR reste l'autorité avant merge. Greg communique son
résultat ; ne pas sonder périodiquement GitHub Actions.

## Versionnement

Aucun changement de version, tag ou GitHub Release pour ce lot.

La baseline reste :

```text
version = 1.2.1
tag     = v1.2.1
```

Après merge et Core Gate finale verte, le produit dérivé peut intégrer le SHA
Core exact descendant de v1.2.1 dans une branche `core-update/v1.2.1`, en
conservant `version` et `tag` et en mettant à jour uniquement le `commit`
de `core-origin.json` après validation.
