# SAAS-CORE-API — Reprise courante

**Dernière mise à jour :** 2026-09-30  
**Baseline stable :** v1.2.1  
**Commit stable de base :** d90d8f1e6034cbbf4f63de2be7312eae69b1d698  
**Dépendance immédiate :** PR #44 — offset sticky Workspace, Core Gate #83 success  
**Branche courante :** `feat/workspace-shell-sidebar-ux`  
**Release cible :** aucune — évolution frontend post-tag compatible

## Objet du lot

Améliorer en un seul lot Core l’UI/UX du shell Workspace et la séparation
visuelle des navigations dérivées, sans introduire de métier produit dans le
Core.

Contraintes :

```text
une seule PR pour ce lot
aucun backend
aucune DB
aucune migration
aucune variable d’environnement
aucune dépendance
aucune release / aucun tag / aucun bump Core
intégration future par SHA exact
```

## Dépendance avec la PR #44

La branche part du HEAD :

```text
3200ee4614c4d60f78decb62f50d36c4addce3be
```

de la PR #44 `fix(frontend): expose workspace topbar sticky offset`.

Cette PR a passé la Core Gate #83 avec succès. Le présent lot réutilise son
token `--workspace-topbar-height` au lieu de dupliquer la hauteur de la
topbar.

## Dashboard Workspace

Les widgets suivants sont retirés :

```text
core.workspace-status
core.workspace-role
```

Le Dashboard reste orienté synthèse utile et future valeur métier.

Les anciens IDs éventuellement conservés dans
`User.preferences.dashboard.hiddenWidgetIds` restent tolérés mais deviennent
inertes, car le registre courant reste l’autorité.

## WorkspaceTopbar

Le statut réel du Workspace est affiché en badge à côté du sélecteur.

Mapping :

```text
active     → success
suspended  → warning
archived   → neutral
closed     → destructive
```

Le rôle Workspace et le plan effectif sont visibles dans l’identité
utilisateur. Le popover avatar expose également ces détails via le contrat Auth
générique `menuContextItems`.

Tooltip avatar :

```text
Voir le compte utilisateur
```

## Sidebar Workspace

La navigation Core elle-même devient plate :

```text
Tableau de bord
Fichiers
Membres
Rôles et permissions
Paramètres
Abonnement
Activité
```

Les anciennes catégories `Ressources`, `Gestion du workspace` et
`Compte & offre` ne structurent plus la Sidebar Workspace.

Lorsqu’un produit dérivé déclare des modules, l’ordre est strictement :

```text
fonctions applicatives / métier
→ séparateur « Administration de l’espace »
→ navigation Core complète
```

Aucun titre `Métier`, `Gestion métier` ou équivalent n’est ajouté.

Le moteur de composition est centralisé dans :

```text
frontend/src/features/workspace/navigation/compose-workspace-navigation.js
```

Le produit ne doit conserver dans `app/workspace-navigation.js` que la
déclaration de ses modules.

## Animation des groupes

Les groupes restent supportés pour les modules qui en ont besoin.

Mode développé :

```text
Base UI Collapsible
--collapsible-panel-height
transition height + opacity
motion-reduce:transition-none
```

Mode icône :

```text
Popover existant conservé
```

Les tests attendent la fin réelle de la transition de fermeture au lieu de
supposer un démontage instantané.

## Sidebar Platform

Aucune refonte.

Le comportement existant reste inchangé et le Core ajoute uniquement :

```text
navigation Platform Core
→ séparateur visuel simple
→ navigation applicative
```

Le séparateur est absent sans module applicatif et retiré s’il devient orphelin
après filtrage des autorisations.

Aucun libellé métier spécifique n’est imposé au Core Platform.

## Commits du lot

```text
de8aee26ac916ab10ed27f67ed378575ce610154
→ contexte Workspace déplacé dans le shell

068dedb48c0f43cef3f31356e14ac7461ab54663
→ première simplification de navigation

452d97da617f5205ceec0761ef173895bb31463e
→ tests adaptés aux transitions Base UI

2072b640c8251b8acd8f5989454eaf9bedde3b46
→ documentation initiale du lot

e8cf81f097b4f560334b2b1c0a2da8f157289479
→ alignement exact du contrat de séparation Workspace / Platform
```

## Validation attendue

La validation canonique reste :

```bash
npm run release:check
```

La sandbox actuelle ne peut pas résoudre `github.com`, donc aucun clone local
ni résultat local n’est déclaré comme exécuté. La Core Gate de la PR finale
reste l’autorité de validation réelle.

## Après merge Core

Le produit dérivé devra intégrer le SHA Core exact validé tout en conservant :

```text
version = 1.2.1
tag     = v1.2.1
commit  = SHA post-tag exact intégré
```

Puis il devra :

1. importer le moteur Core `composeWorkspaceNavigation()` au lieu de conserver
   sa copie locale ;
2. garder ses descriptors Dossiers / Produits / Fournisseurs dans
   `APPLICATION_WORKSPACE_NAVIGATION_MODULES` ;
3. bénéficier automatiquement du séparateur `Administration de l’espace` ;
4. conserver la Sidebar Platform existante avec le simple séparateur Core avant
   les entrées applicatives ;
5. valider visuellement le résultat dans le produit.

Principe :

```text
Core = shell et composition génériques
Produit = valeur métier
```
