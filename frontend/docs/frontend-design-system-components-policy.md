# SAAS-CORE-API — Politique Design System et composants réutilisables

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1 et futurs modules métier

## 1. Objectif

Ce document fixe les règles du design system et de réutilisation des composants afin d’éviter les divergences visuelles et comportementales entre modules.

Le frontend ne doit pas produire plusieurs composants remplissant la même fonction avec des conventions UI différentes sans justification fonctionnelle réelle.

Exemple : il ne doit pas exister dix implémentations indépendantes de tableaux présentant des espacements, actions, états de chargement, pagination ou comportements responsive différents.

La règle directrice est : **une même intention UI doit partir d’une même famille de composants et de conventions partagées**.

## 2. Palette de marque

Palette fournie :

```text
#137C8B
#709CA7
#B8CBD0
#7A90A4
#344D59
```

La logique initiale retenue est :

| Rôle | Couleur de référence | Usage principal |
| --- | --- | --- |
| `primary` | `#137C8B` | actions principales, éléments actifs, CTA, focus de marque |
| `secondary` | `#709CA7` | actions secondaires, éléments d’accompagnement |
| `muted` | `#B8CBD0` | surfaces légères, séparations douces, zones secondaires |
| `accent` | `#7A90A4` | interactions contextuelles, hover/sélection secondaire |
| `brand-dark` / foreground fort | `#344D59` | texte fort, surfaces foncées, structure de navigation selon thème |

Ces valeurs sont des références de marque. Les composants métier ne doivent pas utiliser directement les codes hexadécimaux lorsque des tokens sémantiques existent.

## 3. Tokens sémantiques

Le design system doit exposer au minimum des intentions du type :

```text
background
foreground
card
card-foreground
primary
primary-foreground
secondary
secondary-foreground
muted
muted-foreground
accent
accent-foreground
border
input
ring
destructive
```

Des extensions peuvent être ajoutées uniquement si elles représentent une intention transversale réelle.

## 4. États fonctionnels indépendants de la marque

Les états fonctionnels ne doivent pas être détournés de la palette de marque.

Ils disposent de couleurs sémantiques propres :

```text
success
warning
info
destructive
invalid
disabled
critical / urgent uniquement si un besoin métier réel le justifie
```

Règles :

- `destructive` représente une action ou un état destructif ;
- `invalid` représente principalement une validation invalide ou une erreur de champ ;
- `disabled` utilise des tokens neutres et une diminution de contraste/interaction, sans devenir illisible ;
- `warning` ne doit pas être confondu avec une couleur de marque ;
- `critical` ou `urgent` n’est ajouté que si la sémantique métier nécessite une distinction indépendante de `destructive`.

Les états ne doivent jamais être communiqués uniquement par la couleur : texte, icône, label ou autre information accessible doit compléter la couleur lorsque nécessaire.

## 5. Mode sombre

Le dark mode est obligatoire.

Il ne consiste pas à inverser mécaniquement les couleurs ou à conserver toutes les valeurs light identiques.

La même couche de tokens sémantiques est utilisée avec des valeurs adaptées au contraste sombre :

```text
token sémantique
├── valeur light
└── valeur dark adaptée
```

La palette de marque sert de base, mais des variantes plus claires ou plus sombres peuvent être dérivées pour garantir :

- lisibilité ;
- contraste ;
- cohérence visuelle ;
- états hover/focus/active ;
- surfaces imbriquées ;
- accessibilité.

Toute valeur dérivée doit rester centralisée dans les tokens du thème.

## 6. Règle de réutilisation des composants

Avant de créer un nouveau composant, vérifier successivement :

1. existe-t-il déjà une primitive dans `components/ui` ?
2. existe-t-il déjà un composant partagé dans `components/shared`, `components/forms` ou `components/data-display` ?
3. existe-t-il un composant de feature pouvant être généralisé sans devenir sur-paramétré ?
4. la différence demandée est-elle réellement fonctionnelle ou seulement visuelle ?

Si la différence est uniquement visuelle ou mineure, privilégier une variante ou une composition du composant existant.

Si la différence correspond à une responsabilité métier différente, un composant spécifique peut être créé, mais il doit réutiliser les briques du design system.

## 7. Familles de composants partagés

Les familles suivantes doivent disposer d’une convention commune au fur et à mesure de leur apparition :

```text
buttons
inputs
selects
checkboxes
radios
dialogs / modals
alerts
badges
tooltips
menus
breadcrumbs
cards
data tables
pagination
search/filter controls
empty states
loaders
skeletons
status displays
confirmations
user avatar/menu
sidebar navigation
```

Le projet n’a pas à créer toutes ces familles dès le départ. Elles sont créées progressivement lorsqu’un besoin réel apparaît.

## 8. Politique spécifique des tableaux

Les tableaux constituent une famille de composants transversale critique.

Une base commune doit être utilisée pour garantir :

- typographie et densité cohérentes ;
- en-têtes cohérents ;
- alignements ;
- états hover/selected ;
- tri lorsque disponible ;
- pagination ;
- recherche/filtres lorsqu’ils existent ;
- loading state ;
- empty state ;
- error state ;
- actions de ligne ;
- accessibilité ;
- adaptation responsive.

Les vues métier peuvent définir leurs colonnes, cellules et actions, mais ne doivent pas réinventer toute l’UI de table.

Architecture visée :

```text
DataTable / primitives partagées
        ↓
configuration ou composition métier
        ↓
MembersTable
UsersTable
FilesTable
SubscriptionsTable
AuditTable
```

Les composants métier restent explicites ; la réutilisation ne doit pas produire un composant universel impossible à comprendre ou rempli de dizaines de props conditionnelles.

## 9. Variantes plutôt que duplication

Lorsqu’un même composant présente plusieurs besoins légitimes, utiliser des variantes limitées et documentées.

Exemples possibles :

```text
Button
├── default
├── secondary
├── outline
├── ghost
└── destructive

Badge
├── neutral
├── success
├── warning
├── info
└── destructive
```

Une variante ne doit pas être créée uniquement pour reproduire un cas isolé pouvant être traité par composition.

## 10. Modales et dialogues

Les modales doivent partir d’une même famille de primitives accessibles.

Utilisations pertinentes :

- confirmation ;
- action sensible ;
- formulaire court ;
- inspection ou édition contextuelle limitée ;
- opération qui doit préserver le contexte de la page.

Une page ou un parcours dédié est préférable lorsque l’opération :

- est longue ;
- comporte de nombreuses étapes ;
- nécessite plusieurs sections ;
- doit être partageable par URL ;
- implique une navigation complexe.

Les confirmations destructrices doivent utiliser une convention cohérente dans toute l’application.

## 11. Composition et responsabilités

La réutilisation ne signifie pas créer des composants géants.

La règle est :

```text
primitive UI
→ composant partagé
→ composant métier
→ page d’assemblage
```

Les pages assemblent. Les composants métier portent la représentation d’un domaine. Les composants partagés portent les conventions réutilisables. Les primitives UI portent le design system.

## 12. Contrôle avant création d’un composant

Toute nouvelle famille visuelle doit répondre à :

```text
Existe-t-elle déjà ?
Peut-elle être composée depuis une primitive existante ?
Doit-elle être transverse ou métier ?
Introduit-elle une nouvelle convention visuelle ?
Cette convention doit-elle être documentée ?
Fonctionne-t-elle en clair et sombre ?
Est-elle responsive et accessible ?
Ses états loading / empty / error sont-ils cohérents ?
```

Une duplication UI évitable doit être considérée comme une dette de maintenabilité.