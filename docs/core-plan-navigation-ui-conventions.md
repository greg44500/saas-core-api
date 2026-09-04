# SaaS Core — Conventions Plan, navigation Workspace et visibilité UI

**Statut :** convention active du Core  
**Date :** 4 septembre 2026

## 1. Identité d'un Plan

Un Plan possède trois niveaux distincts :

```text
_id
→ identité MongoDB
→ automatique
→ jamais pilotée par l'humain

name
→ nom commercial affiché
→ modifiable par Platform

systemRole
→ responsabilité structurelle éventuelle
→ réservée au backend
→ immuable
```

La valeur `systemRole = baseline` identifie l'offre de référence automatiquement attachée aux nouveaux workspaces. Son nom commercial ne participe jamais à cette décision.

La clé historique `Plan.key` reste temporairement présente pour compatibilité des anciennes données et des seeds, mais elle est désormais générée par le backend pour tout nouveau Plan créé depuis Platform. Elle ne doit pas être demandée, modifiée ni affichée dans l'UI.

Le Plan baseline :

- doit rester actif ;
- ne peut pas être archivé ;
- peut être renommé ;
- peut changer de description, prix, fonctionnalités et limites ;
- peut être public ou privé selon la stratégie commerciale.

Une base existante doit exécuter `backfillBaselinePlanSystemRole` afin de rattacher l'ancien plan identifié par `key=free` au rôle système `baseline`.

## 2. Catalogue utilisateur

Une offre est proposée dans le catalogue utilisateur uniquement si :

```text
status = active
ET
isPublic = true
```

Le frontend public consomme `isBaseline` et le nom commercial courant ; il ne doit jamais dépendre de `key=free` ni d'un autre identifiant technique.

## 3. Convention de navigation Workspace

La Sidebar est un renderer générique. Elle ne connaît pas les modules métier d'une application dérivée.

La configuration Core est déclarée dans :

```text
features/workspace/navigation/core-workspace-navigation.js
```

La composition finale de l'application est réalisée dans :

```text
app/workspace-navigation.js
```

Une application dérivée ajoute ses groupes métier uniquement à ce point de composition. Le Core ne doit jamais importer un module métier dérivé.

Chaque entrée peut déclarer :

```text
id
label
Icon
path
permission
feature
```

Un groupe n'est rendu que s'il contient au moins une entrée visible. Une entrée n'est visible que lorsque sa permission RBAC et sa capability commerciale éventuelle sont toutes deux satisfaites.

Les groupes Core actuels servent de convention visuelle :

```text
Tableau de bord
Fonctionnalités
Gestion du workspace
Compte & offre
```

Les groupes sont repliables. Lorsque la Sidebar est réduite, un clic sur l'icône du groupe ouvre un flyout contenant ses sous-options.

## 4. Convention Tailwind

La réutilisation doit prioritairement se faire par :

```text
composants réutilisables
+ cn()
+ variantes lorsque nécessaire
```

Il ne faut pas déplacer mécaniquement toutes les utilities Tailwind vers des classes CSS `@apply`. Une répétition importante de structure ou d'états doit conduire à extraire un composant ou une variante plutôt qu'à dupliquer de longues chaînes `className`.

## 5. Dashboard et capabilities

Un widget dépendant d'une fonctionnalité produit est rendu seulement lorsque :

```text
capability effective du workspace
+
permission RBAC du membre
```

La même décision pilote le `skip` RTK Query : une fonctionnalité non disponible ne doit pas déclencher une requête simplement pour afficher `Indisponible`.

`Indisponible` est réservé à une erreur réelle de chargement d'un widget que le workspace est censé pouvoir utiliser.

Les informations de contexte général telles que le statut du workspace et le rôle courant restent indépendantes des capabilities métier. La synthèse d'abonnement reste soumise à sa permission RBAC.

### Particularité du module Fichiers

La feature Core actuelle `file_upload` contrôle l'ajout de nouveaux fichiers. La navigation vers les fichiers existants reste accessible avec `file:read` afin de ne pas rendre les documents déjà stockés invisibles après un downgrade.

Sur le dashboard, le widget `Fichiers actifs` est en revanche masqué lorsque `file_upload` est absent afin de ne pas promouvoir une fonctionnalité non incluse dans un nouveau workspace.
