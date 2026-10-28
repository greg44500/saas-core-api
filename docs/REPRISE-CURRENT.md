# Core — Centre d’aide : onglets par chevrons et cartes en cascade (2026-10-28)

**Décision utilisateur validée :** le centre d’aide utilise des chevrons gauche/droite à la place de la barre de défilement visible et affiche les cartes par **Staggered Fade-In Up** lors du chargement et de chaque changement de catégorie. Effet cible : déplacement vertical de 8 px, durée 280 ms, décalage de 70 ms entre cartes, limité à 8 intervalles ; navigation des onglets, clics, recherche et liens inchangés. La préférence système `prefers-reduced-motion` et le profil `a11y-enhanced` évitent l’animation ; aucune nouvelle dépendance Motion.

**Implémentation :** sur `feat/help-scrollable-category-tabs` et la PR Core **#51 déjà ouverte en brouillon**, composant `ScrollableTabsList`, adaptation `help-center.jsx`, animation CSS dans `index.css`, tests RTL pour chevrons, focus, changements de largeur, décalages de cartes et changement de catégorie. Aucun endpoint, permission, modèle ni composant métier modifié.

**État réel des gates :** Core Gate #104 sur le commit `c995f4e` = **failure**, deux échecs RTL de `scrollable-tabs-list.test.jsx` (détection des boutons dans les tests). Le lot reprend ces tests en utilisant un événement de redimensionnement réel du DOM simulé. Les corrections et l’effet staggered doivent être contrôlés par la nouvelle CI ; ne pas présumer de réussite avant son résultat. Recette visuelle navigateur et clavier toujours requise.

**Alignement vers le produit dérivé, SANS changement de version :** le Core et le SaaS métier restent tous deux sur la base **`1.2.1`**, tag **`v1.2.1`**. Après validation et fusion de cette PR dans le dépôt maître `saas-core-api`, **aligner les commits du Core par Git en branche dédiée du produit**, sans bump SemVer, nouveau tag ni nouvelle release. Sur preuve de l’intégration et des tests du produit, mettre à jour uniquement le commit exact de `core-origin.json` en conservant `version: "1.2.1"` et `tag: "v1.2.1"` ; le produit ne doit pas être changé directement dans sa branche `main` ni dans la PR métier #53 en cours.

---

# Core UI — Navigation par chevrons des onglets du centre d’aide (2026-10-28)

**Branche :** `feat/help-scrollable-category-tabs`. **Périmètre :** Core frontend uniquement, aucun changement métier, RBAC, backend ou schéma.

**Constat :** `help-center.jsx` utilisait `TabsList variant="section"` avec `overflow-x-auto` et rendait la barre horizontale native visible lorsque les catégories composées Core + métier débordaient.

**Correctif proposé :** primitive générique `ScrollableTabsList` autour des onglets Base UI existants. La barre reste techniquement scrollable (souris/tactile) mais est masquée visuellement. Deux chevrons apparaissent seulement en cas de débordement ; ils révèlent le prochain onglet partiellement/non visible, s’inactivent aux extrémités et respectent les préférences de réduction des animations. Les onglets et la sémantique `tablist/tab` sont conservés, ainsi que le focus clavier, l’onglet sélectionné et l’actualisation lors des changements de largeur ou de corpus autorisé. `HelpCenter` utilise cette primitive pour Workspace et Platform ; `SectionTabs` et les autres navigations ne sont pas modifiés.

**Tests ajoutés :** RTL `frontend/src/components/shared/scrollable-tabs-list.test.jsx` : sans débordement, avec chevrons, sélection/focus, redimensionnement. À exécuter : `npm --prefix frontend run test -- src/components/shared/scrollable-tabs-list.test.jsx src/features/help/components/help-page.test.jsx`, puis lint, build, et `npm run release:check` via Core Gate CI. **Aucun de ces tests n’est déclaré exécuté localement ici.** Recette visuelle sur écran étroit, mobile tactile, thème sombre et clavier requise.

**Intégration SaaS dérivé :** après revue, gate et merge dans `saas-core-api`, intégrer le commit Core exact via branche `core-update/v1.2.1` du produit, puis mettre à jour `core-origin.json` après validation de la gate du produit ; pas d'injection directe dans la PR M-006 en cours, ni de tag/release inventé.

---

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
