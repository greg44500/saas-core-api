# SAAS-CORE-API — Politique canonique des composants frontend

**Statut :** canonique — actif  
**Dernière mise à jour :** 2026-09-11  
**Périmètre :** frontend du Core et futurs SaaS/modules métier dérivés

## 1. Objet

Ce document formalise la règle de construction des composants frontend du projet.

Il complète :

```text
docs/architecture/FRONTEND.md
docs/frontend/FRONTEND-GUIDELINES.md
docs/frontend/UI-SEMANTICS.md
```

La stack UI de référence est :

```text
React + Vite
JavaScript uniquement
Tailwind CSS
shadcn/ui
primitives Base UI utilisées par les composants shadcn du dépôt
```

Aucune implémentation TypeScript ne doit être introduite dans le frontend.

---

## 2. Règle obligatoire

Toute mécanique UI générique ou récurrente doit être construite à partir d’un **composant réutilisable**.

Lorsqu’une primitive shadcn/ui adaptée existe, elle constitue la base obligatoire de l’implémentation.

Règle de décision :

```text
besoin UI
→ primitive shadcn/Base UI existante ?
   → oui : réutiliser/composer cette primitive
   → non : vérifier les composants partagés existants
      → aucun composant adapté : créer une abstraction réutilisable justifiée
```

Une feature ne doit pas recréer localement la mécanique d’un composant déjà fourni par shadcn/Base UI ou par le Design System du projet.

Exemples concernés :

```text
Button
Input
Textarea
Select
Checkbox
Radio Group
Switch
Slider
Tooltip
Popover
Dropdown Menu
Dialog
Drawer / Sheet
Tabs
Accordion
Badge
Skeleton
Table / DataTable
pagination
form controls
```

La liste n’est pas exhaustive.

---

## 3. Hiérarchie obligatoire

```text
components/ui/
→ primitives shadcn/ui adaptées au projet
→ couche UI de base

components/shared/
→ compositions transverses réutilisables
→ aucune duplication de mécanique déjà portée par components/ui

components/forms/
→ composants de formulaire réutilisables

components/data-display/
→ tableaux, pagination, cartes, badges et affichages de données réutilisables

features/<feature>/components/
→ composants métier construits par composition des couches précédentes

features/<feature>/pages/
→ assemblage et orchestration légère
```

Les dépendances doivent descendre vers les primitives, jamais l’inverse.

```text
feature
→ shared/forms/data-display
→ ui
→ Base UI
```

Un composant `components/ui` ne dépend pas d’une feature métier.

---

## 4. Interdiction des wrappers mécaniques inutiles

Un wrapper partagé autour d’une primitive shadcn/Base UI n’est accepté que s’il apporte une abstraction transverse réelle, par exemple :

- une convention d’accessibilité ;
- une sémantique produit commune ;
- une API réutilisable simplifiant plusieurs usages réels ;
- un assemblage stable de plusieurs primitives ;
- une règle de Design System centralisée.

Il ne doit pas :

- recopier le positionnement, le focus, le portal ou le clavier déjà gérés par la primitive ;
- reconstruire une primitive shadcn à la main ;
- masquer l’API standard sans bénéfice transverse ;
- exister uniquement pour éviter d’écrire trois composants shadcn dans une feature.

Exemple : un `InfoTooltip` transverse peut composer la primitive canonique `components/ui/tooltip.jsx` pour imposer une icône et une convention d’accessibilité. En revanche, un second composant `shared/tooltip.jsx` reproduisant la mécanique du Tooltip est interdit.

---

## 5. Réutilisabilité avant duplication

Avant toute création de composant, vérifier obligatoirement :

1. `components/ui` ;
2. `components/shared` ;
3. `components/forms` ;
4. `components/data-display` ;
5. les composants de la feature pouvant être généralisés proprement.

Une duplication évitable est une dette de maintenance.

La réutilisabilité ne signifie pas créer un composant universel sur-paramétré. La composition reste préférée aux composants comportant de nombreuses branches conditionnelles métier.

---

## 6. Tailwind et Design System

Tailwind sert à adapter les primitives et à composer les interfaces, pas à recréer localement un Design System parallèle.

Les composants doivent utiliser en priorité :

- les tokens sémantiques existants ;
- les variantes centralisées ;
- les espacements et conventions partagées ;
- les composants shadcn déjà présents dans `components/ui`.

Les classes Tailwind métier ou structurelles restent possibles lorsqu’elles décrivent la composition propre au composant. Les classes répétées portant une convention transverse doivent être centralisées.

---

## 7. Accessibilité

L’utilisation de shadcn/Base UI ne dispense pas de vérifier l’accessibilité.

Chaque composant interactif doit conserver :

- navigation clavier ;
- focus visible ;
- nom accessible ;
- rôles et attributs ARIA appropriés ;
- comportement Escape/focus trap lorsque la primitive le prévoit ;
- contraste conforme aux tokens du Design System ;
- information non portée uniquement par la couleur.

Une feature ne doit pas supprimer les comportements accessibles d’une primitive pour simplifier son rendu.

---

## 8. Tests obligatoires

Une abstraction réutilisable nouvelle ou modifiée doit tester les comportements réellement critiques de son contrat :

```text
rendu
interaction
accessibilité observable
états disabled/loading si applicables
callback / valeur sélectionnée
intégration métier critique lorsque nécessaire
```

Les tests ne doivent pas reproduire les détails internes de Base UI lorsqu’ils n’appartiennent pas au contrat du projet.

Les tests doivent vérifier le comportement utilisateur, pas figer artificiellement l’implémentation interne d’une primitive.

---

## 9. Garde d’architecture

Lorsque cela est techniquement pertinent, les règles d’architecture doivent être protégées par le lint ou les tests.

Exemple actuellement instauré : les imports vers l’ancien `components/shared/tooltip` sont interdits par ESLint. Tous les tooltips utilisent désormais la primitive canonique :

```text
frontend/src/components/ui/tooltip.jsx
```

Toute suppression ou migration d’un composant partagé doit être précédée d’un inventaire exhaustif de ses imports et usages, puis suivie de :

```text
lint frontend
→ tests frontend
→ build frontend
```

Un build ne doit pas servir de mécanisme principal pour découvrir successivement des imports cassés.

---

## 10. Critères d’acceptation d’un nouveau composant

Un nouveau composant frontend est acceptable uniquement si :

1. aucune primitive/composition existante ne couvre correctement le besoin ;
2. son emplacement respecte la hiérarchie du projet ;
3. il utilise shadcn/Base UI lorsqu’une primitive adaptée existe ;
4. il ne duplique pas une mécanique transverse ;
5. son API reste explicite et limitée ;
6. son accessibilité est préservée ;
7. ses comportements critiques sont testés ;
8. sa création ne nécessite aucune dérogation JavaScript/TypeScript : le projet reste JavaScript uniquement.

Toute exception doit être explicitement justifiée dans le code review ou la documentation du lot concerné.
