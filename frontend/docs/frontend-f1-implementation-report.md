# SAAS-CORE-API — F1 Initialisation React + Vite

**Date :** 31 août 2026  
**Lot :** F1  
**Statut :** implémenté sur GitHub — validation locale requise

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
- nettoyage du boilerplate Vite : aucun asset ou composant de démonstration inutile ;
- `.gitignore` frontend pour `node_modules`, `dist` et fichiers locaux ;
- scripts `dev`, `build`, `preview`, `test`, `test:watch`.

## Vérifications couvertes par le smoke test

Le test `src/App.test.jsx` vérifie :

1. que React rend correctement le composant racine ;
2. que l’alias `@/` est résolu dans l’environnement de test ;
3. qu’une interaction utilisateur déclenche une mise à jour React.

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

## Validation locale requise

Après `git pull`, depuis la racine du dépôt :

```bash
cd frontend
npm install
npm run test
npm run build
```

Puis, dans un second terminal ou après interruption du processus de développement :

```bash
npm run dev
```

Vérifier que Vite démarre et que la page affiche `Frontend Core V1`.

Enfin, depuis la racine du dépôt :

```bash
npm test
```

Cette dernière commande valide l’absence de régression backend.

## Critères de clôture

F1 pourra passer de `implémenté` à `TERMINÉ` lorsque :

- `npm install` frontend réussit ;
- `npm run test` frontend est vert ;
- `npm run build` frontend est vert ;
- `npm run dev` démarre correctement ;
- les tests backend restent verts ;
- aucun document `frontend/docs/` n’a été perdu.

## Note sur le lockfile

Le connecteur GitHub ne résout pas lui-même l’arbre npm. Le fichier `frontend/package-lock.json` doit être produit par le premier `npm install` réalisé dans l’environnement local avec npm, puis versionné afin de figer la résolution effective des dépendances.
