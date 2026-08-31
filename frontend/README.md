# SaaS Core Frontend

Frontend générique du socle `saas-core-api`.

## Stack initialisée en F1

- React ;
- Vite ;
- JavaScript exclusivement ;
- Vitest ;
- jsdom ;
- React Testing Library ;
- `@testing-library/user-event`.

Les couches Tailwind CSS, shadcn/ui, React Router, Redux Toolkit et RTK Query sont volontairement différées aux lots suivants.

## Prérequis

Le frontend respecte la même plage Node.js que le dépôt racine :

```text
>=24.7 <25
```

## Installation

Depuis `frontend/` :

```bash
npm install
```

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run test:watch
npm run preview
```

## Alias

L’alias unique du frontend est :

```text
@/ → frontend/src/
```

Il est configuré à la fois pour Vite/Vitest (`vite.config.js`) et pour l’éditeur (`jsconfig.json`).

## Tests

Les tests de composants utilisent Vitest + React Testing Library avec un environnement `jsdom`.

Le premier smoke test vérifie :

- le rendu de l’application React ;
- l’alias `@/` ;
- une interaction utilisateur via `user-event`.
