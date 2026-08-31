# SAAS-CORE-API — Cadrage Frontend UX/UI

**Statut :** document vivant de cadrage  
**Date d’ouverture :** 30 août 2026  
**Dernière consolidation :** 31 août 2026  
**Périmètre :** Frontend Core V1 et futurs modules métier

## 1. Rôle du document

Ce document centralise les questions, réponses, arbitrages et décisions structurantes du frontend avant et pendant son implémentation.

Il sert à éviter les décisions implicites, les divergences entre conversations et les effets de bord lors des évolutions futures.

Chaque décision structurante doit être :

1. explicitée ;
2. accompagnée de son objectif ;
3. évaluée sous l’angle maintenabilité, sécurité, accessibilité et évolutivité ;
4. reportée dans la checklist d’implémentation lorsque son application nécessite un travail concret.

## 2. Contraintes déjà décidées

Les choix suivants sont considérés comme acquis sauf décision explicite ultérieure :

- React avec Vite ;
- JavaScript uniquement, sans TypeScript ;
- Tailwind CSS ;
- shadcn/ui utilisé en JavaScript ;
- Lucide pour les icônes ;
- thème clair et thème sombre prévus dès l’architecture ;
- palette de couleurs de marque personnalisée à fournir et intégrer au design system ;
- aucune couleur métier ou de marque dispersée en dur dans les composants ;
- recours à des tokens sémantiques et variables de design ;
- aucune donnée sensible, secret, rôle, permission, endpoint ou règle métier critique codé en dur lorsqu’une abstraction/configuration adaptée est nécessaire ;
- composants réutilisables et architecture par fonctionnalités ;
- priorité à la composition plutôt qu’aux composants monolithiques ou sur-paramétrés ;
- les pages ne doivent pas accumuler logique métier, appels API, règles de permissions et rendu complexe dans un même fichier ;
- un fichier devenu difficile à lire, tester ou faire évoluer doit être revu selon ses responsabilités plutôt qu’en fonction d’un seuil arbitraire de lignes ;
- affichage conditionnel prévu pour adapter navigation, actions et contenu selon permissions, rôles, entitlements, statuts et contexte courant ;
- aucune condition d’affichage ne doit être considérée comme une frontière de sécurité : le backend reste l’autorité ;
- une même règle conditionnelle réutilisée ne doit pas être dupliquée dans plusieurs composants ;
- une stratégie unique de notifications/toasts sera retenue pour l’application ;
- les toasts complètent les messages inline mais ne remplacent pas les erreurs de formulaire proches des champs ;
- les modales sont utilisées lorsque le contexte le justifie, notamment pour confirmations, actions sensibles, formulaires courts ou interactions nécessitant de préserver le contexte de la page ;
- une modale ne doit pas remplacer une page dédiée lorsqu’une tâche est longue, complexe ou nécessite une navigation propre ;
- priorité à la maintenabilité, la sécurité et la cohérence globale ;
- développement progressif, un lot fonctionnel à la fois ;
- les contrats Markdown backend/frontend existants restent les références d’intégration API pendant la phase actuelle.

## 3. Principes UX/UI déjà retenus

- le Core doit rester adaptable aux futurs SaaS métier ;
- l’interface ne doit pas être limitée à une simple coquille technique ;
- toute l’authentification frontend doit être prévue, avec ses parcours complets ;
- les dashboards et navigations doivent refléter rôles et permissions ;
- la zone Platform SUPER_ADMIN doit disposer d’une véritable interface de pilotage distincte ;
- les interfaces d’administration peuvent être plus denses que les interfaces utilisateur métier ;
- l’affichage conditionnel doit réduire le bruit visuel et présenter à l’utilisateur les actions pertinentes dans son contexte ;
- les retours d’action doivent être cohérents : erreurs de champ inline, états de page/composant pour les erreurs structurelles, et notifications temporaires pour les confirmations ou informations transverses ;
- les questions de cadrage utilisant des notions génériques ou ambiguës doivent toujours comporter des exemples concrets ;
- les interfaces authentifiées doivent prévoir une navigation latérale gauche rétractable ;
- la navigation latérale ouverte affiche icônes et libellés, et son état rétracté conserve au minimum les icônes avec une affordance accessible permettant d’identifier chaque destination ;
- un bandeau supérieur doit exposer le contexte utilisateur connecté et les actions globales pertinentes ;
- le profil doit être accessible depuis l’avatar ou la pastille utilisateur du bandeau supérieur ;
- la déconnexion doit rester rapidement accessible à un emplacement cohérent et prévisible, idéalement dans le menu utilisateur associé au profil ;
- l’ergonomie responsive de la navigation latérale et du bandeau supérieur sera précisée dans le bloc navigation/responsive sans remettre en cause ces principes.

## 4. Règle de design system

Les composants ne doivent pas multiplier des classes de couleur directement liées à une marque ou à une palette brute lorsqu’un token sémantique convient.

Exemple à privilégier :

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
destructive
border
input
ring
```

La palette de marque fournie ultérieurement doit alimenter ces tokens plutôt que forcer une réécriture des composants.

Le dark mode doit utiliser la même couche sémantique avec des valeurs adaptées au thème sombre. Le thème sombre fait partie du périmètre obligatoire du Core et ne constitue pas une amélioration différée.

## 5. Méthode de décision

Pour chaque bloc de cadrage :

```text
question
→ exemples concrets
→ options possibles
→ recommandation professionnelle
→ réponse utilisateur
→ décision figée
→ impact checklist / architecture
```

Une décision peut être révisée, mais toute révision doit être explicite et ses impacts évalués avant modification du code.

---

# Bloc 1 — Positionnement UX/UI et utilisateurs

## Q1 — Profil utilisateur de référence

Quel niveau de technicité doit servir de référence au Core ?

**Réponse :**

- utilisateur métier peu technique : responsable de restaurant, formateur, responsable RH, avec un Core adaptable : base professionnelle accessible, complexité ajustée ensuite selon le SaaS métier.

**Décision figée :**

> Le frontend Core prend comme référence un utilisateur métier non nécessairement technique. L’interface doit rester professionnelle, claire et immédiatement compréhensible sans connaissance technique du fonctionnement interne du SaaS. Le Core reste adaptable : les futurs modules métier pourront augmenter ou réduire la densité et la sophistication sans remettre en cause les principes fondamentaux du design system.

**Conséquences :**

- privilégier un vocabulaire métier et compréhensible plutôt que des termes internes ou techniques ;
- rendre les erreurs et statuts actionnables sans exposer inutilement les détails d’implémentation ;
- fournir une aide contextuelle lorsque la conséquence d’une action n’est pas évidente ;
- éviter de surcharger l’interface d’explications lorsque l’action est immédiatement compréhensible.

## Q2 — Densité par défaut des écrans métier

Exemples :

- interface très épurée : peu d’informations simultanées, actions principales très visibles ;
- interface professionnelle intermédiaire : recherche, filtres, statuts, tableaux, actions contextuelles ;
- interface très dense : nombreuses colonnes, bulk actions, métriques et contrôles avancés.

**Réponse :**

- interface professionnelle intermédiaire : recherche, filtres, statuts, tableaux, actions contextuelles.

**Décision figée :**

> Les interfaces Workspace utilisent par défaut une densité professionnelle intermédiaire : informations structurées, tableaux lorsque pertinents, recherche, filtres, statuts et actions contextuelles, sans surcharge visuelle inutile. La densité peut être supérieure dans la console Platform SUPER_ADMIN lorsque le besoin de pilotage le justifie, sans sacrifier la hiérarchie, l’accessibilité ou le responsive.

**Conséquences :**

- éviter les dashboards composés de cartes sans valeur opérationnelle réelle ;
- ne pas créer de colonnes, filtres ou métriques que le backend ne permet pas d’alimenter correctement ;
- permettre une adaptation responsive plutôt que comprimer mécaniquement une vue desktop dense.

## Q3 — Identité visuelle du Core

Exemples :

- identité forte propre au Core ;
- design totalement neutre ;
- design system professionnel configurable via tokens, permettant un rebranding futur sans réécrire les composants.

**Réponse :**

- design system professionnel configurable via tokens ;
- mise en place d’un thème de couleurs de marque ;
- palette exacte à fournir ;
- intégration obligatoire d’un mode sombre.

**Décision partiellement figée :**

> Le Core utilise un design system professionnel configurable par tokens sémantiques. Un thème de couleurs de marque sera intégré au niveau des tokens afin de permettre son évolution sans modification structurelle des composants. Le mode sombre est obligatoire et doit reposer sur les mêmes tokens sémantiques avec des valeurs adaptées.

**Reste à figer :**

- palette de marque exacte ;
- déclinaison claire/sombre des tokens ;
- couleurs sémantiques de statuts si elles nécessitent des extensions ;
- validation des contrastes.

## Q4 — Responsive

Exemples :

- desktop uniquement ;
- desktop prioritaire mais mobile utilisable ;
- responsive complet desktop/tablette/mobile ;
- mobile-first.

**Réponse :**

- responsive complet desktop/tablette/mobile.

**Décision figée :**

> Le frontend Core est responsive sur desktop, tablette et mobile. Le desktop reste le contexte principal des interfaces professionnelles complexes, mais aucune fonctionnalité essentielle ne doit devenir inutilisable sur tablette ou mobile. Les composants complexes comme tableaux, sidebars et formulaires doivent prévoir un comportement responsive spécifique plutôt qu’un simple rétrécissement.

## Q5 — Niveau de guidage utilisateur

Exemples :

- formulaire minimal avec uniquement les champs ;
- formulaire guidé avec aide contextuelle, explication des rôles et conséquences ;
- wizard multi-étapes pour actions complexes ou sensibles.

**Réponse :**

- formulaire avec placeholder quand nécessaire et règle de validation sous les champs mal remplis ou requis mais vides.

**Décision figée :**

> Les interfaces doivent guider l’utilisateur sans multiplier les explications inutiles. Les formulaires utilisent des labels explicites, des placeholders seulement lorsqu’ils apportent une information utile, et des erreurs de validation affichées près du champ concerné. Les champs obligatoires et les contraintes importantes doivent être compréhensibles avant ou après validation. Les assistants multi-étapes ne sont utilisés que pour les opérations réellement complexes, longues ou sensibles.

**Complément modales :**

> Une modale peut être utilisée lorsqu’elle permet d’accomplir une interaction courte ou sensible sans perdre le contexte de la page. Les confirmations destructrices ou à fort impact doivent utiliser une interaction explicite et accessible. Une opération complexe, longue ou nécessitant plusieurs sous-étapes importantes doit préférer une page dédiée ou un véritable parcours guidé.

## Q6 — Console Platform SUPER_ADMIN

Faut-il une zone d’administration Platform réellement distincte de l’espace Workspace ?

Exemples de sections :

```text
Overview
Users
Workspaces
Plans
Subscriptions
Audit Logs
```

Exemples d’informations de pilotage possibles lorsque le backend les expose : nombre d’utilisateurs, workspaces par statut, subscriptions par statut, trials actifs, événements d’audit récents, actions nécessitant une intervention.

**Réponse :**

- oui, il faut une zone d’administration Platform et les exemples proposés sont un minimum.

**Décision figée :**

> La zone Platform SUPER_ADMIN constitue une interface d’administration distincte de l’espace Workspace, avec son propre routing, layout, navigation et contrôle d’accès. Elle doit offrir une véritable interface de pilotage global. Les sections Overview, Users, Workspaces, Plans, Subscriptions et Audit Logs constituent un périmètre minimal, extensible uniquement lorsque le backend expose les données ou opérations correspondantes. Aucun KPI ou état métier ne doit être inventé côté frontend.

---

# Bloc 2 — Structure globale de navigation

## Décisions déjà apportées

Les principes suivants sont désormais figés avant le cadrage détaillé du routing :

### Navigation latérale

- menu latéral positionné à gauche pour les interfaces authentifiées ;
- menu rétractable ;
- état ouvert : icônes + libellés visibles ;
- état rétracté : icônes conservées ;
- chaque icône doit rester identifiable de manière accessible lorsque le libellé visuel est masqué ;
- l’action permettant d’ouvrir ou rétracter le panneau doit rester visible, compréhensible et utilisable au clavier ;
- les entrées réellement visibles dépendent du contexte, des permissions et des capacités exposées par le backend.

### Bandeau supérieur

- bandeau supérieur présent dans les interfaces authentifiées ;
- affichage d’informations utiles sur l’utilisateur connecté sans exposer de données excessives ;
- avatar/pastille utilisateur servant de point d’accès logique au profil ;
- menu utilisateur pouvant regrouper les actions globales liées au compte.

### Profil et déconnexion

- accès au profil depuis la zone utilisateur du bandeau supérieur ;
- déconnexion accessible rapidement depuis un emplacement logique, cohérent et constant ;
- la déconnexion ne doit pas être cachée dans une profondeur de navigation excessive ;
- le comportement exact de logout reste conforme au contrat Auth et à la politique de session du frontend.

### Responsive

La navigation latérale desktop pourra devenir un drawer/sheet ou une autre navigation adaptée sur les petits écrans. Le comportement exact sera figé dans le bloc responsive afin de conserver la fonctionnalité sans reproduire artificiellement la sidebar desktop sur mobile.

---

# Blocs de cadrage à traiter ensuite

Les blocs suivants seront détaillés progressivement, sans les mélanger :

1. structure globale de l’application, routing et navigation détaillée ;
2. dashboards Workspace et Platform ;
3. design system, palette, typographie et dark mode ;
4. architecture frontend et conventions de code ;
5. authentification et cycle de session ;
6. rôles, permissions, affichage conditionnel et guards UI ;
7. contexte workspace et multi-tenant ;
8. formulaires et validation ;
9. erreurs, loaders, empty states, toasts et confirmations ;
10. tableaux, pagination, recherche et filtres ;
11. accessibilité ;
12. responsive ;
13. sécurité frontend ;
14. tests unitaires, intégration et E2E ;
15. performance ;
16. observabilité et gestion des erreurs client ;
17. préparation aux futurs modules métier ;
18. stratégie de maintenance, composition des composants et revue des effets de bord.

## 6. Règle de maintenance du document

Après chaque bloc :

```text
réponses
→ décisions
→ justification
→ impacts
→ mise à jour de la checklist
```

Aucune réponse importante ne doit rester uniquement dans une conversation si elle a un impact durable sur le frontend.