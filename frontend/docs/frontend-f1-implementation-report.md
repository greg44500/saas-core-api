# SAAS-CORE-API — F1 Initialisation React + Vite

**Date :** 31 août 2026  
**Lot :** F1  
**Statut :** validation fonctionnelle locale réussie — lockfile à versionner

## Objectif

Initialiser le frontend React/Vite JavaScript et son socle de tests sans perturber le backend existant ni introduire les responsabilités des lots suivants.

## Implémenté

- application React + Vite sous `frontend/` ;
- `frontend/package.json` autonome ;
- JavaScript uniquement ;
- plage Node alignée sur le dépôt racine : `>=24.7 <25` ;
- alias unique `@/` vers `frontend/src/` ;
- `jsconfig.json` pour la résolution de l’alias dans l’éditeur ;
- Vitest ;
- environnement `jsdom` ;
- React Testing Library ;
- `@testing-library/jest-dom` ;
- `@testing-library/user-event` ;
- setup global de nettoyage RTL ;
- smoke test React interactif ;
- nettoyage du boilerplate Vite ;
- `.gitignore` frontend pour `node_modules`, `dist` et fichiers locaux ;
- scripts `dev`, `build`, `preview`, `test`, `test:watch` ;
- isolation de la suite backend via les scripts Vitest racine ciblant `backend/`.

## Vérifications couvertes par le smoke test

Le test `src/App.test.jsx` vérifie :

1. que React rend correctement le composant racine ;
2. que l’alias `@/` est résolu dans l’environnement de test ;
3. qu’une interaction utilisateur déclenche une mise à jour React.

## Validation locale du 31 août 2026

Validation communiquée après exécution locale :

- `npm install` frontend : réussi ;
- `npm run test` frontend : **1 test passé** ;
- `npm run build` frontend : réussi ;
- `npm run dev` : fonctionnement validé ;
- suite backend depuis la racine : tous les tests verts ;
- `frontend/package-lock.json` généré par npm et contrôlé comme cohérent avec le `frontend/package.json`.

Aucune régression fonctionnelle n’a été signalée sur le backend.

## Volontairement exclu de F1

- Tailwind CSS ;
- shadcn/ui ;
- Lucide ;
- tokens light/dark ;
- React Router ;
- Redux Toolkit ;
- RTK Query ;
- Auth/session ;
- formulaires métier.

Ces éléments appartiennent respectivement aux lots F2 et suivants.

## Lockfile

Le premier `npm install` local a généré le vrai `frontend/package-lock.json` (lockfile v3). Il doit être versionné pour permettre des installations reproductibles via `npm ci`.

## Critères de clôture

Les critères fonctionnels de F1 sont validés :

- application Vite démarrable ;
- build Vite réussi ;
- Vitest / RTL opérationnels ;
- premier smoke test vert ;
- alias `@/` opérationnel ;
- documentation frontend conservée ;
- backend non impacté.

La seule action Git restante avant clôture administrative complète de F1 est le versionnement de `frontend/package-lock.json`.
