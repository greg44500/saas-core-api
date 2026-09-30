# SAAS-CORE-API — Reprise courante

**Dernière mise à jour :** 2026-09-30  
**Baseline stable :** v1.2.1  
**Dernier lot validé sur main :** PR #46 — merge `a9d99aa6307a6e7adf884e949cebc4059549824e`  
**Branche courante :** `fix/workspace-dashboard-navigation-status-layout`  
**Release cible :** aucune — correctif frontend post-tag compatible

## Objet du lot

Corriger deux incohérences visuelles du shell Workspace avant l’intégration
finale dans un SaaS dérivé.

Aucun changement métier, backend, DB ou release.

## Navigation Workspace

Le Tableau de bord est une surface Core transversale qui compose :

```text
widgets Core
+
widgets applicatifs / métier
```

Il doit donc rester la première entrée du Workspace, y compris dans un SaaS
dérivé.

Ordre cible lorsqu’un produit déclare des modules :

```text
Tableau de bord
modules applicatifs / métier
séparateur « Administration de l’espace »
Fichiers
Membres
Rôles et permissions
Paramètres
Abonnement
Activité
```

Aucun séparateur, groupe ou espacement spécifique n’est ajouté entre
`Tableau de bord` et les modules applicatifs. Ils utilisent le rythme normal
de la Sidebar.

Le moteur Core expose explicitement :

```text
coreWorkspaceDashboardNavigationItem
coreWorkspaceAdministrationNavigation
coreWorkspaceNavigation
```

et `composeWorkspaceNavigation()` assemble le shell sans que le dérivé ne
recopie cette logique.

Sans module applicatif, la navigation Core plate complète reste inchangée.

## Statut du Workspace

La topbar regroupe désormais le contexte sous la forme :

```text
Espace de travail : Nom | [badge statut]
```

Le badge n’est plus repoussé à l’extrémité de la zone disponible.

Objectif : rendre immédiatement visible un état sensible comme
`Suspendu`, `Archivé` ou `Clôturé`.

## Identité du SaaS dérivé

Aucun changement de nom produit n’est effectué dans ce lot Core.

Le Core conserve son identité générique :

```text
frontend/src/app/application-identity.js
→ SaaS Core
```

Chaque SaaS dérivé doit définir sa propre identité dans son dépôt après
intégration du Core. Cette personnalisation appartient au produit et ne doit pas
être codée dans `saas-core-api`.

## Tests adaptés

Les tests verrouillent maintenant :

- Dashboard en première position ;
- modules applicatifs immédiatement après ;
- séparateur uniquement avant l’administration Core ;
- absence de changement de la navigation Core lorsqu’aucun module n’est déclaré ;
- ordre visuel `workspace → | → badge` dans la topbar ;
- maintien des permissions/capabilities existantes.

## Périmètre

Modifié :

```text
frontend/src/features/workspace/navigation/core-workspace-navigation.js
frontend/src/features/workspace/navigation/compose-workspace-navigation.js
frontend/src/app/workspace-navigation.test.js
frontend/src/features/workspace/components/workspace-sidebar.test.jsx
frontend/src/features/workspace/components/workspace-topbar.jsx
frontend/src/features/workspace/components/workspace-topbar.test.jsx
backend/modules/help/helpCore.registry.js
docs/derived-saas/EXTENSION-POINTS.md
docs/derived-saas/DERIVED-SAAS.md
docs/REPRISE-CURRENT.md
```

Non modifié :

```text
MongoDB
migrations
backend métier
permissions
capabilities
dépendances npm
version Core
tag Core
GitHub Release
identité du SaaS métier
```

## Validation

Validation canonique :

```bash
npm run release:check
```

La Core Gate de la PR reste l’autorité de validation.

## Après merge validé

Le SHA post-tag final devra être intégré une seule fois dans
`saas-fiches-techniques-gms` en conservant :

```text
version = 1.2.1
tag     = v1.2.1
commit  = <SHA Core exact du merge final>
```

Le produit devra ensuite :

1. utiliser le moteur Core `composeWorkspaceNavigation()` ;
2. conserver ses modules Dossiers / Produits / Fournisseurs ;
3. vérifier visuellement l’ordre Dashboard → métier → Administration ;
4. définir son propre `APPLICATION_IDENTITY` à la place de `SaaS Core` ;
5. vérifier le format `Nom du Workspace | badge` ;
6. poursuivre l’intégration Help Center et la reprise M-002 selon le cadrage produit.
