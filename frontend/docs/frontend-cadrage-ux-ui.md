# SAAS-CORE-API — Cadrage Frontend UX/UI

**Statut :** document vivant de cadrage  
**Date d’ouverture :** 30 août 2026  
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
- palette de couleurs personnalisée à fournir et intégrer au design system ;
- aucune couleur métier ou de marque dispersée en dur dans les composants ;
- recours à des tokens sémantiques et variables de design ;
- aucune donnée sensible, secret, rôle, permission, endpoint ou règle métier critique codé en dur lorsqu’une abstraction/configuration adaptée est nécessaire ;
- composants réutilisables et architecture par fonctionnalités ;
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
- les questions de cadrage utilisant des notions génériques ou ambiguës doivent toujours comporter des exemples concrets.

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

Une future palette doit modifier ces tokens plutôt que forcer une réécriture des composants.

Le dark mode doit utiliser la même couche sémantique avec des valeurs adaptées au thème sombre.

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

Exemples :

- utilisateur métier peu technique : responsable de restaurant, formateur, responsable RH ;
- utilisateur professionnel habitué aux logiciels de gestion : manager utilisant CRM, ERP ou outils de reporting ;
- utilisateur technique : développeur, intégrateur, administrateur système ;
- Core adaptable : base professionnelle accessible, complexité ajustée ensuite selon le SaaS métier.

**Réponse :**

> À compléter.

**Décision :**

> À figer.

## Q2 — Densité par défaut des écrans métier

Exemples :

- interface très épurée : peu d’informations simultanées, actions principales très visibles ;
- interface professionnelle intermédiaire : recherche, filtres, statuts, tableaux, actions contextuelles ;
- interface très dense : nombreuses colonnes, bulk actions, métriques et contrôles avancés.

**Réponse :**

> À compléter.

**Décision :**

> À figer.

## Q3 — Identité visuelle du Core

Exemples :

- identité forte propre au Core ;
- design totalement neutre ;
- design system professionnel configurable via tokens, permettant un rebranding futur sans réécrire les composants.

**Réponse :**

> À compléter.

**Décision :**

> À figer.

## Q4 — Responsive

Exemples :

- desktop uniquement ;
- desktop prioritaire mais mobile utilisable ;
- responsive complet desktop/tablette/mobile ;
- mobile-first.

**Réponse :**

> À compléter.

**Décision :**

> À figer.

## Q5 — Niveau de guidage utilisateur

Exemples :

- formulaire minimal avec uniquement les champs ;
- formulaire guidé avec aide contextuelle, explication des rôles et conséquences ;
- wizard multi-étapes pour actions complexes ou sensibles.

**Réponse :**

> À compléter.

**Décision :**

> À figer.

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

> À compléter.

**Décision :**

> À figer.

---

# Blocs de cadrage à traiter ensuite

Les blocs suivants seront détaillés progressivement, sans les mélanger :

1. structure globale de l’application et navigation ;
2. dashboards Workspace et Platform ;
3. design system, palette, typographie et dark mode ;
4. architecture frontend et conventions de code ;
5. authentification et cycle de session ;
6. rôles, permissions et guards UI ;
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
18. stratégie de maintenance et revue des effets de bord.

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