# SAAS-CORE-API — Conventions sémantiques UI partagées

**Statut :** canonique — actif  
**Dernière mise à jour :** 2026-09-10  
**Périmètre :** frontend du Core et futurs modules métier dérivés

## 1. Objet

Ce document complète `docs/frontend/FRONTEND-GUIDELINES.md` pour les conventions visuelles et linguistiques transversales qui doivent rester cohérentes dans les tableaux, cartes et formulaires.

Principe :

```text
même sémantique fonctionnelle
→ même ton visuel
→ composant partagé
→ mapping métier explicite
```

Une feature ne recopie pas localement des classes Tailwind lorsqu’un composant partagé porte déjà la convention.

## 2. Statuts et tons sémantiques

Le composant partagé de référence est :

```text
frontend/src/components/shared/status-badge.jsx
```

Il porte les tons visuels, pas la logique métier.

Convention Core :

```text
success      → vert    → état normal, validé ou opérationnel
warning      → orange  → attention, transition, attente ou blocage réversible
destructive  → rouge   → échec, révocation critique ou état terminal
neutral      → gris    → archivé, inactif sans anomalie ou information secondaire
```

La couleur ne doit jamais être l’unique porteuse de l’information : le libellé textuel du statut reste obligatoire.

### Mapping métier

Chaque domaine associe explicitement ses statuts à un ton. Le composant partagé ne déduit jamais un ton depuis une chaîne arbitraire.

Exemple Workspace :

```text
active     → success
suspended  → warning
archived   → neutral
closed     → destructive
```

Exemple CommercialInvitation :

```text
pending   → warning
accepted  → success
declined  → destructive
revoked   → destructive
expired   → destructive
```

Un futur module métier doit définir son propre mapping selon la signification fonctionnelle réelle de ses états, puis réutiliser `StatusBadge`.

## 3. Couleurs d’état et palettes

Les couleurs d’état restent indépendantes des palettes de marque et des préférences utilisateur.

Une palette peut modifier l’identité visuelle générale du produit, mais ne doit pas inverser la sémantique : un succès ne devient pas rouge et un état terminal ne devient pas vert.

Les composants consomment les tokens sémantiques du Design System :

```text
success
warning
destructive
muted / neutral
```

Les valeurs hexadécimales ou classes de couleur arbitraires ne doivent pas être dispersées dans les features pour représenter des statuts.

## 4. Langue et correction orthographique

Le frontend Core francophone déclare :

```html
<html lang="fr-FR">
```

Les composants de saisie de texte long réutilisables utilisent par défaut la langue française et la correction orthographique navigateur lorsque pertinente.

Le composant de référence est :

```text
frontend/src/components/ui/textarea.jsx
```

Valeurs par défaut :

```text
lang = fr-FR
spellCheck = true
```

Ces valeurs restent surchargeables lorsqu’un champ doit légitimement accepter principalement une autre langue ou du contenu technique.

Le navigateur reste responsable du dictionnaire réellement installé/activé. Le frontend peut déclarer la langue attendue, mais ne peut pas installer un dictionnaire utilisateur.

## 5. Grilles de KPI

Les Dashboards Workspace et Platform partagent la même logique d’équilibrage :

```text
frontend/src/components/shared/balanced-six-column-grid.js
```

La répartition dépend du nombre réellement rendu, notamment après permissions, entitlement ou préférences d’affichage.

Convention large écran :

```text
1 → 1
2 → 2
3 → 3
4 → 2 + 2
5 → 3 + 2
6 → 3 + 3
7 → 3 + 2 + 2
8 → 3 + 3 + 2
```

Un futur module ne doit pas recréer localement une autre règle de grille pour des KPI compatibles avec cette composition.

## 6. Règle pour les SaaS dérivés

Un module métier dérivé doit réutiliser les conventions du Core :

```text
statuts        → StatusBadge + mapping métier
KPI            → composants de métrique + grille équilibrée si applicable
formulaires    → primitives de saisie partagées
langue         → héritage du document ou `lang` explicite lorsque nécessaire
```

Cette discipline fait partie de la maintenabilité du Core lors des futures dérivations et upgrades.
