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

La logique retenue est :

| Rôle | Couleur de référence | Usage principal |
| --- | --- | --- |
| `primary` | `#137C8B` | actions principales, éléments actifs, CTA, focus de marque |
| `secondary` | `#709CA7` | actions secondaires, éléments d’accompagnement |
| `muted` | `#B8CBD0` | surfaces légères, séparations douces, zones secondaires |
| `accent` | `#7A90A4` | interactions contextuelles, hover/sélection secondaire |
| `brand-dark` / foreground fort | `#344D59` | texte fort, surfaces foncées, structure de navigation selon thème |

Ces valeurs sont des références de marque. Les composants métier ne doivent pas utiliser directement les codes hexadécimaux lorsque des tokens sémantiques existent.

## 3. Tokens sémantiques

Le design system doit exposer au minimum :

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
- `critical` ou `urgent` n’est ajouté que si la sémantique métier nécessite une distinction indépendante de `destructive` ;
- un état ne doit jamais être communiqué par la couleur seule : texte, icône ou label doit compléter la couleur lorsque nécessaire.

## 5. Mode sombre

Le dark mode est obligatoire.

Il ne consiste pas à inverser mécaniquement les couleurs ou à conserver toutes les valeurs light identiques.

La même couche de tokens sémantiques est utilisée avec des valeurs adaptées :

```text
token sémantique
├── valeur light
└── valeur dark adaptée
```

La palette de marque sert de base, mais des variantes plus claires ou plus sombres peuvent être dérivées pour garantir lisibilité, contraste, hover/focus/active, surfaces imbriquées et accessibilité.

Toute valeur dérivée reste centralisée dans les tokens du thème.

## 6. Typographie

Police principale retenue : **Inter**.

Elle est utilisée pour l’interface applicative afin de garantir lisibilité, cohérence et densité maîtrisée.

Échelle de référence :

```text
Page title / display  → 30–32 px, semibold
Section title         → 22–24 px, semibold
Subsection            → 18–20 px, semibold
Body                  → 14–16 px, regular
Table / metadata      → 13–14 px
Caption               → 12–13 px
```

Le projet évite de multiplier les tailles intermédiaires sans besoin fonctionnel.

## 7. Spacing

Échelle de référence :

```text
4
8
12
16
20
24
32
40
48
64 px
```

Usages :

```text
4–8 px   → proximité interne
12–16 px → composants
20–24 px → blocs
32 px+   → sections et structure de page
```

Les écrans ne doivent pas inventer des espacements locaux incohérents lorsque les tokens/échelles existants suffisent.

## 8. Radius

Échelle de référence :

```text
sm → 6 px
md → 8 px
lg → 12 px
xl → 16 px
```

Usages recommandés :

```text
inputs / buttons     → 8 px
cards                → 12 px
dialogs / panels     → 12–16 px
badges                → pill seulement si la sémantique le justifie
```

`rounded-full` n’est pas une convention globale.

## 9. Ombres

Les ombres restent discrètes. La hiérarchie repose principalement sur le spacing, les surfaces, les bordures et le contraste.

```text
card standard   → bordure en priorité
dropdown/popover→ ombre légère
modal/sheet     → ombre plus marquée
élément actif   → pas d’ombre obligatoire
```

## 10. Densité

Densité par défaut : professionnelle intermédiaire.

Repères :

```text
Button       → hauteur 36–40 px
Input        → hauteur 36–40 px
Table row    → environ 44–48 px
Sidebar item → environ 40 px
Topbar       → environ 56–64 px
```

Une variante partagée `compact` peut être utilisée sur certaines interfaces d’administration denses, sans créer une nouvelle UI par module.

## 11. Réutilisation des composants

Avant de créer un nouveau composant, vérifier successivement :

1. existe-t-il une primitive dans `components/ui` ?
2. existe-t-il un composant partagé dans `components/shared`, `components/forms` ou `components/data-display` ?
3. existe-t-il un composant de feature généralisable sans devenir sur-paramétré ?
4. la différence demandée est-elle réellement fonctionnelle ou uniquement visuelle ?

La composition est préférée à la duplication comme au composant universel sur-paramétré.

## 12. Familles de composants partagés

Les familles suivantes disposent progressivement d’une convention commune :

```text
buttons
inputs
selects
checkboxes
radios
dialogs / modals
sheets / details panels
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

Elles sont créées uniquement lorsqu’un besoin réel apparaît.

## 13. Buttons

Variantes standard :

```text
primary / default
secondary
outline
ghost
destructive
link
```

Une zone logique ne doit présenter qu’une action principale dominante lorsque possible.

## 14. Cards

Les cards servent à regrouper une information, un statut, une action ou un widget réellement cohérent.

Le projet évite les imbrications décoratives de cards et les pages de listes enfermées systématiquement dans plusieurs surfaces inutiles.

## 15. Politique normative DataTable

Les tableaux sont une famille transversale critique.

Architecture cible :

```text
DataTable / primitives partagées
        ↓
configuration ou composition métier
        ↓
MembersTable
UsersTable
FilesTable
SubscriptionsTable
ProductsTable futur
```

La base commune gère de manière cohérente :

```text
Table
TableHeader
TableBody
TableRow
TableCell
TablePagination
TableToolbar
TableEmptyState
TableSkeleton
RowActions
```

### Pagination

Les tableaux de données métier sont **paginés par défaut**.

Pour les jeux de données non trivialement bornés, la pagination doit être serveur lorsque l’API la permet. Le frontend ne charge pas volontairement de gros volumes uniquement pour les paginer localement.

Une petite liste réellement bornée peut exceptionnellement ne pas être paginée si cela améliore l’UX et si le volume maximal est connu et faible.

La pagination, le nombre d’éléments par page et les filtres partageables doivent être synchronisables avec l’URL lorsque leur conservation/navigation le justifie.

### Actions de ligne

Une colonne ou un menu d’actions n’existe que lorsqu’une ou plusieurs actions utiles existent réellement.

Exemples :

```text
Voir
Modifier
Supprimer
Suspendre
Restaurer
```

Une action est affichée seulement si :

1. le backend expose l’opération correspondante ;
2. l’utilisateur possède la permission nécessaire ;
3. l’action est pertinente dans l’état courant de la ressource.

Si une table est purement informative et qu’aucune route d’édition/suppression/consultation spécifique n’existe, aucune colonne d’actions vide ou artificielle n’est ajoutée.

Les actions sensibles utilisent les conventions de confirmation déjà figées.

### Responsive

Desktop : table complète.  
Tablette : colonnes secondaires réduites/priorisées.  
Mobile : représentation condensée, scroll contrôlé ou variante carte selon le cas d’usage.

Le responsive ne doit pas modifier la signification des données ni masquer une action essentielle sans alternative accessible.

## 16. DetailsPanel / Sheet

Structure partagée :

```text
DetailsPanel
├── header
├── title
├── metadata
├── body scrollable
└── footer actions
```

Desktop : largeur typique 400–600 px selon contenu.  
Mobile : quasi plein écran ou plein écran lorsque nécessaire.

Le panneau conserve le contexte de liste et réutilise les conventions de sauvegarde explicite, dirty state et confirmations définies dans la politique dashboard/activité/panneaux.

## 17. Modales

Tailles fonctionnelles :

```text
small  → confirmation
medium → formulaire court
large  → exceptionnel
```

Une modale longue, multi-sections ou nécessitant navigation interne doit être reconsidérée au profit d’un panneau, d’une page ou d’un wizard.

## 18. Loaders et skeletons

Famille partagée :

```text
PageLoader
InlineLoader
ButtonLoader
TableSkeleton
CardSkeleton
FormSkeleton
```

Le loader de navigation peut intégrer une animation de marque discrète. Les skeletons restent sobres et reflètent la structure du contenu attendu.

## 19. Icônes Lucide

Repères :

```text
16 px    → inline / actions compactes
18–20 px → navigation / boutons
24 px    → illustration UI légère
```

Une icône seule possède un nom accessible. La même intention utilise la même icône dans toute l’application sauf justification fonctionnelle.

## 20. Responsive du design system

Le responsive est défini par comportement, pas par simple réduction visuelle.

Exemples :

```text
DataTable    → table complète / priorisée / condensée selon viewport
DetailsPanel → sheet latérale / plein écran mobile
Sidebar      → sidebar desktop / drawer mobile
```

Les composants partagés portent ces conventions pour éviter que chaque feature réimplémente son propre responsive.

## 21. Contrôle avant création d’un composant

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

Une duplication UI évitable est une dette de maintenabilité.