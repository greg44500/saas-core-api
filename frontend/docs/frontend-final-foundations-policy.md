# SAAS-CORE-API — Fondations finales avant implémentation Frontend

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** derniers arbitrages F0 avant initialisation Vite

## 1. Objectif

Ce document clôt le cadrage transversal nécessaire avant l’implémentation du frontend Core V1.

Le principe retenu est volontairement simple : ne plus ajouter de couche d’architecture tant qu’un besoin réel ne la justifie pas.

## 2. Organisation du frontend

Structure cible :

```text
frontend/
├── docs/
├── e2e/
├── src/
│   ├── app/
│   ├── components/
│   │   ├── ui/
│   │   ├── shared/
│   │   ├── forms/
│   │   └── data-display/
│   ├── features/
│   ├── services/api/
│   ├── store/
│   ├── hooks/
│   ├── lib/
│   ├── utils/
│   └── assets/
└── ...configuration Vite/tests
```

Les dossiers sont créés lorsqu’ils ont un besoin concret. Aucun squelette vide massif n’est requis.

## 3. Frontières de responsabilités

```text
components/ui
→ primitives shadcn et adaptations design system très génériques

components/shared
→ assemblages transverses réutilisables dans plusieurs domaines

components/forms
→ primitives et assemblages génériques de formulaire

components/data-display
→ DataTable, états, badges, indicateurs et autres composants de présentation transverses

features/<feature>
→ pages, composants, hooks, schémas et API propres au domaine

services/api
→ base RTK Query et infrastructure HTTP transverse

store
→ configuration Redux Toolkit et état client réellement global

app
→ providers, router, layouts racine, bootstrap et composition applicative

lib
→ abstractions techniques partagées

utils
→ fonctions utilitaires simples et sans état
```

Une feature ne place pas un composant métier dans `components/shared` uniquement pour éviter un import relatif.

## 4. Aliases

Alias principal retenu :

```text
@/ → frontend/src/
```

Exemples :

```js
import { Button } from '@/components/ui/button';
import { baseApi } from '@/services/api/baseApi';
```

Les aliases multiples (`@features`, `@components`, etc.) ne sont pas introduits par défaut. Un alias unique garde la configuration et la lecture simples.

## 5. Conventions de nommage

```text
Composants React       → PascalCase
Pages React            → PascalCase + suffixe Page lorsque pertinent
Hooks                  → camelCase préfixé par use
Fonctions/utilitaires  → camelCase
Slices Redux           → camelCase + suffixe Slice
Fichiers API           → camelCase explicite
Constantes             → UPPER_SNAKE_CASE lorsque réellement constantes globales
Routes/URLs            → segments kebab-case si plusieurs mots
```

Les noms décrivent l’intention métier ou technique réelle. Les suffixes génériques inutiles comme `Manager`, `Helper`, `Utils2` sont évités.

## 6. Tests frontend

Stack normative :

```text
Vitest
React Testing Library
@testing-library/user-event
Playwright
```

### Tests unitaires et composants

Les tests restent proches du code qu’ils valident lorsque cela améliore la lisibilité :

```text
features/auth/components/LoginForm.jsx
features/auth/components/LoginForm.test.jsx
```

ou dans un sous-dossier `__tests__` uniquement lorsque plusieurs tests d’un même bloc le justifient.

Les tests globaux d’intégration applicative peuvent rester dans une zone dédiée sous `src` si nécessaire.

### Playwright

Les parcours E2E vivent dans :

```text
frontend/e2e/
```

Ils couvrent les parcours critiques et non chaque détail visuel.

## 7. Philosophie de test

Priorité :

```text
comportement utilisateur
→ contrat visible
→ interactions
→ permissions/états
```

Éviter les tests couplés à l’implémentation interne.

Exemples à tester :

- soumission d’un formulaire valide/invalide ;
- affichage d’une erreur ;
- visibilité d’une action selon permission ;
- changement de route ;
- état loading/empty/error ;
- refresh Auth concurrent ;
- onboarding Free ;
- upgrade/downgrade lorsque implémentés.

## 8. Couverture

Aucun seuil global arbitraire n’est imposé au démarrage.

La couverture doit être suffisante sur les zones à risque : Auth/session, permissions, mutations sensibles, onboarding, subscription, transformations d’erreurs et composants partagés complexes.

Un seuil chiffré pourra être ajouté plus tard si les métriques montrent qu’il devient un garde-fou utile plutôt qu’un objectif artificiel.

## 9. Tests E2E prioritaires

Premiers parcours critiques :

```text
register → login
login → workspace
bootstrap session
logout
forgot/reset password
création workspace → Free actif
invitation → workspace existant
navigation protégée
```

Puis les parcours Subscription et Platform au fur et à mesure de leur implémentation.

## 10. Mocking

Les tests de composants peuvent mocker les frontières réseau lorsqu’ils testent uniquement l’UX locale.

Les tests d’intégration doivent tester autant que possible les interactions réelles entre store, RTK Query, router et composants.

Playwright vérifie les parcours de bout en bout dans un environnement contrôlé.

Le mocking ne doit pas reproduire une deuxième implémentation du backend.

## 11. Accessibilité dans les tests

React Testing Library privilégie les sélecteurs accessibles : rôle, nom accessible, label et texte utilisateur.

Les `data-testid` restent un dernier recours lorsque le composant ne possède pas de sémantique accessible adaptée.

## 12. ESLint et formatage

Le frontend utilise les mêmes principes de qualité que le backend : lint et formatage automatisés.

La configuration Vite/React pourra compléter ESLint avec les règles React/hooks nécessaires sans introduire une seconde philosophie de style contradictoire.

## 13. Imports et dépendances

Ordre logique recommandé :

```text
bibliothèques externes
imports via @/
imports relatifs locaux
```

Aucune dépendance n’est ajoutée uniquement par confort si la stack retenue couvre déjà le besoin.

## 14. Règle anti-surarchitecture

Avant de créer :

```text
nouveau store global
nouveau provider
nouvelle abstraction générique
nouveau dossier transverse
nouvelle dépendance
```

il faut pouvoir nommer le problème concret qu’il résout.

Une première duplication locale tolérable est préférable à une abstraction prématurée mal définie ; dès qu’une intention réellement commune apparaît, elle est extraite au bon niveau.

## 15. Première implémentation

L’initialisation frontend peut désormais commencer.

Ordre recommandé :

```text
F1 — Vite + React
F2 — Tailwind + shadcn + tokens de base
F3 — Router + providers + layouts minimaux
F4 — Redux Toolkit + RTK Query + Auth infrastructure
F5 — Login/Register et bootstrap session
F6 — onboarding Workspace Free
F7 — shell Workspace et premières pages Core
```

Les politiques normatives existantes restent l’autorité pour chaque lot.

## 16. Décision de clôture F0

Le cadrage transversal est considéré suffisant pour démarrer le code.

Les questions de détail restantes doivent être résolues dans le lot qui les rencontre plutôt que de retarder l’initialisation globale du frontend.
