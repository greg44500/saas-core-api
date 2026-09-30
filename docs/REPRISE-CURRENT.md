# SAAS-CORE-API — Reprise courante

**Dernière mise à jour :** 2026-09-30  
**Baseline stable :** v1.2.1  
**Commit stable de base :** d90d8f1e6034cbbf4f63de2be7312eae69b1d698  
**Dépendance immédiate :** PR #44 — offset sticky Workspace, Core Gate #83 success  
**Branche courante :** `feat/workspace-shell-sidebar-ux`  
**Release cible :** aucune — évolution frontend post-tag compatible

## Objet du lot

Simplifier le shell Workspace générique afin qu’un SaaS dérivé mette sa valeur
métier au premier plan sans recopier ni détourner les primitives Core.

Le lot reste strictement frontend/documentation :

```text
aucun backend
aucune DB
aucune migration
aucune variable d’environnement
aucune dépendance
aucun métier GMS dans le Core
```

## Dépendance avec la PR #44

La branche a été créée sur :

```text
3200ee4614c4d60f78decb62f50d36c4addce3be
```

qui est le HEAD de la PR #44
`fix(frontend): expose workspace topbar sticky offset`.

Cette PR a déjà passé la Core Gate #83 avec succès. Le présent lot réutilise
son contrat `--workspace-topbar-height` au lieu de dupliquer sa modification.

Pour conserver une PR finale propre vers `main`, #44 doit être fusionnée
avant la PR de ce lot ou la PR courante doit être retargetée après cette
fusion.

## Décisions UI/UX

### Dashboard Workspace

Les widgets suivants sont retirés du registre :

```text
core.workspace-status
core.workspace-role
```

Ils ne sont pas remplacés par d’autres KPI.

Les anciens IDs éventuellement conservés dans les préférences utilisateur sont
ignorés par le registre courant ; aucune migration destructive des préférences
n’est introduite.

### Topbar Workspace

Le statut réel du Workspace est présenté par un `WorkspaceStatusBadge` à côté
du sélecteur de Workspace.

Mapping sémantique :

```text
active     → success
suspended  → warning
archived   → neutral
closed     → destructive
```

### Identité utilisateur

Le rôle Workspace et le plan effectif sont des informations de contexte du
shell :

```text
Nom utilisateur
Rôle · Plan
```

Le popover avatar reçoit les mêmes informations via un contrat Auth générique
`menuContextItems`. Le composant Auth ne connaît ni Workspace ni Plan.

Un tooltip explique l’action de l’avatar :

```text
Voir le compte utilisateur
```

### Navigation Workspace

Le Core sépare maintenant :

```text
coreWorkspacePrimaryNavigation
coreWorkspaceAdministrationNavigation
```

Le moteur générique est :

```text
frontend/src/features/workspace/navigation/compose-workspace-navigation.js
```

Ordre avec modules applicatifs :

```text
Tableau de bord
→ modules applicatifs
→ séparateur
→ Fichiers
→ Membres
→ Rôles et permissions
→ Paramètres
→ Abonnement
→ Activité
```

Les anciennes catégories Core `Ressources`, `Gestion du workspace` et
`Compte & offre` ne structurent plus la sidebar Workspace.

Les groupes restent supportés pour les modules qui en ont réellement besoin.
Leur ouverture/fermeture en mode développé utilise la transition Base UI basée
sur `--collapsible-panel-height`. Le mode icône continue d’utiliser un
popover.

## Commits du lot avant documentation

```text
de8aee26ac916ab10ed27f67ed378575ce610154
→ contexte Workspace déplacé dans le shell

068dedb48c0f43cef3f31356e14ac7461ab54663
→ navigation Workspace simplifiée et moteur de composition

452d97da617f5205ceec0761ef173895bb31463e
→ tests adaptés aux transitions de fermeture
```

## Validation attendue

La validation canonique reste :

```bash
npm run release:check
```

Elle doit être exécutée par la Core Gate de la PR finale.

Points particulièrement couverts par les tests frontend :

- retrait des widgets statut/rôle ;
- anciens IDs de préférences inertes ;
- badge de statut et mapping sémantique ;
- rôle + plan dans l’identité Workspace ;
- détails contextuels génériques du popover utilisateur ;
- tooltip avatar ;
- ordre de composition Workspace ;
- navigation Core plate ;
- filtrage permission/capability ;
- séparateur ;
- groupes applicatifs développés/réduits ;
- attente réelle des transitions Base UI.

## Après merge Core

Le SaaS dérivé devra intégrer le SHA exact post-tag validé conformément à
`docs/releases/RELEASE-POLICY.md` :

```text
version = 1.2.1
tag     = v1.2.1
commit  = SHA Core exact intégré
```

Le produit devra ensuite supprimer sa copie locale de
`composeWorkspaceNavigation()` et importer le moteur Core, tout en conservant
uniquement ses descriptors métier dans
`APPLICATION_WORKSPACE_NAVIGATION_MODULES`.

Principe directeur :

```text
Core = shell, primitives, sécurité et composition génériques
Produit = modules métier et valeur utilisateur
```
