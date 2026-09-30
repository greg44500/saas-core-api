# SAAS-CORE-API — Reprise courante

**Dernière mise à jour :** 2026-09-30  
**Baseline stable :** v1.2.1  
**Commit stable de base :** d90d8f1e6034cbbf4f63de2be7312eae69b1d698  
**Lot UI/UX précédent :** PR #45 fusionnée — merge `1a8672169cc72fa34e05132ae3798d79bf71dcc0`  
**Branche courante :** `feat/core-help-platform-quick-access`  
**Release cible :** aucune — évolution post-tag compatible avec v1.2.1

## Objet du lot courant

Finaliser le lot Core générique avant une unique intégration dans le SaaS
dérivé :

```text
mise à jour du centre d’aide Core
+
extension Help compatible Application Global
+
suppression de la recherche Workspace redondante
+
accès rapide Platform réellement fonctionnel
```

Aucun contenu métier GMS n’est ajouté au Core.

## Aide Core et aide des SaaS dérivés

Le point d’extension existant est conservé :

```text
backend/config/applicationHelp.registry.js
→ APPLICATION_HELP_MODULES
→ ACTIVE_HELP_REGISTRY
```

Le produit dérivé ajoute son aide métier dans ce registre sans modifier
`helpCore.registry.js`.

L’utilisateur final conserve un seul centre d’aide par contexte. La séparation
Core / produit reste une séparation de code.

### Autorisation Application Global

Les fiches Platform peuvent désormais déclarer :

```text
audience.permissions
→ permissions Platform

audience.applicationGlobalPermissions
→ permissions Application Global
```

Les deux autorités sont résolues séparément.

Invariant :

```text
Platform Super Admin / Fondateur
≠
autorité métier globale implicite
```

Le registre Help autorise jusqu’à 10 catégories par contexte afin que les
dérivés disposent d’une capacité réelle. Le Core en occupe actuellement 4 côté
Workspace et 5 côté Platform.

## Aide mise à jour pour le shell Workspace

Le corpus Core documente maintenant :

- le statut de l’espace affiché près du sélecteur ;
- le rôle visible dans l’identité utilisateur ;
- le plan effectif lorsqu’un utilisateur possède `subscription:read` ;
- la séparation `Administration de l’espace` ;
- la navigation Core plate ;
- la différence entre droits Platform et droits globaux applicatifs.

Les anciennes instructions `Ressources → Fichiers` sont remplacées par la
navigation actuelle.

## Recherche Workspace

La recherche générique de `WorkspaceTopbar` est supprimée.

Principe :

```text
Workspace
→ recherches dans les pages fonctionnelles
→ pas de moteur global dupliqué dans le shell
```

## Accès rapide Platform

La recherche factice de la topbar Platform est remplacée par un accès rapide
aux vues d’administration autorisées.

Source :

```text
APPLICATION_PLATFORM_NAVIGATION
+
getVisiblePlatformNavigationSections()
→ getPlatformQuickAccessItems()
```

Le mécanisme recherche les libellés de destinations et de groupes, puis navigue
vers la vue sélectionnée.

Il inclut automatiquement :

- les vues Core autorisées par les permissions Platform ;
- les vues dérivées autorisées par leur callback `isVisible` ;
- donc les vues globales applicatives lorsqu’une permission Application Global
  correspondante est présente.

Il ne recherche volontairement pas les données elles-mêmes. Les recherches
d’utilisateurs, workspaces, abonnements ou objets métier restent dans leurs
pages dédiées.

## Périmètre technique

Le lot modifie :

```text
backend/modules/help/*
backend/config/applicationHelp.registry.js
backend/tests/help/*
frontend/src/features/help/*
frontend/src/features/workspace/components/workspace-topbar*
frontend/src/features/platform/components/platform-quick-access*
frontend/src/features/platform/lib/platform-navigation*
frontend/src/app/layouts/platform-layout*
docs/contracts/CORE-CONTRACT.md
docs/derived-saas/*
docs/debt/D-025-secure-help-center.md
```

Le lot ne modifie pas :

```text
MongoDB schemas
migrations
variables d’environnement
dépendances npm
version Core
tag Core
GitHub Release
contenu métier GMS
```

## Validation

Validation canonique :

```bash
npm run release:check
```

La Core Gate de la PR finale reste l’autorité de validation réelle.

## Après merge validé

Le produit `saas-fiches-techniques-gms` devra intégrer **une seule fois** le
SHA Core final de ce lot.

La provenance restera :

```text
version = 1.2.1
tag     = v1.2.1
commit  = <SHA Core post-tag exact validé>
```

Le produit devra ensuite :

1. conserver ses modules Dossiers / Produits / Fournisseurs ;
2. utiliser le moteur Core `composeWorkspaceNavigation()` ;
3. bénéficier du shell Workspace mis à jour ;
4. injecter son aide métier via `APPLICATION_HELP_MODULES` ;
5. déclarer les permissions Application Global des fiches d’aide globales
   lorsqu’elles existent ;
6. conserver ses entrées Platform dérivées, automatiquement accessibles via
   l’accès rapide si elles sont autorisées ;
7. valider visuellement et fonctionnellement le produit.

Principe :

```text
Core = mécanismes génériques + aide générique
Produit = métier + aide métier
Interface finale = expérience unifiée
```
