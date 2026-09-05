# SAAS Core Frontend

Frontend générique du socle `saas-core-api`.

Ce README reste volontairement local et concis. Les règles d'architecture et de développement frontend sont documentées dans :

- [`../docs/architecture/FRONTEND.md`](../docs/architecture/FRONTEND.md) ;
- [`../docs/frontend/FRONTEND-GUIDELINES.md`](../docs/frontend/FRONTEND-GUIDELINES.md) ;
- [`../docs/security/SECURITY.md`](../docs/security/SECURITY.md).

## Stack

Le frontend courant utilise notamment :

- React + Vite ;
- JavaScript uniquement ;
- Tailwind CSS ;
- React Router ;
- Redux Toolkit ;
- RTK Query ;
- React Hook Form + Zod ;
- Vitest ;
- React Testing Library ;
- `@testing-library/user-event`.

Les versions installées restent celles de [`package.json`](package.json).

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

## Développement

```bash
npm run dev
```

Les appels frontend utilisent `/api` comme base HTTP. Le serveur Vite proxy cette base vers :

```text
http://localhost:5000
```

par défaut.

La cible peut être remplacée avec :

```text
VITE_API_PROXY_TARGET
```

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run test:watch
npm run preview
```

## Architecture

Le code est organisé principalement autour de :

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── shared/
│   ├── forms/
│   └── data-display/
├── features/
├── hooks/
├── lib/
├── services/api/
├── store/
└── utils/
```

Règles structurantes :

```text
server state
→ RTK Query

état global client réel
→ Redux Toolkit

état local
→ React

navigation / filtres partageables
→ URL / Router
```

Les features ne recréent pas une seconde infrastructure transversale. Les tableaux compatibles utilisent le `DataTable` partagé ; drawers, confirmations, formulaires et autres primitives communes sont réutilisés lorsque leur contrat convient.

## API et session

Le frontend conserve une seule API slice RTK Query.

La base HTTP par défaut est `/api`, avec `credentials: include`. L'access token reste dans l'état Auth et le refresh est centralisé dans `baseQueryWithReauth` avec mutex afin d'éviter des rotations concurrentes inutiles.

Le frontend améliore l'expérience utilisateur, mais le backend reste l'autorité pour l'authentification, les permissions, l'isolation Workspace, les entitlements et les quotas.

## Tests

```bash
npm test
npm run build
```

Les tests composants utilisent Vitest + React Testing Library dans `jsdom`.

Playwright fait partie de la cible E2E du Core mais n'est pas encore installé/configuré dans l'état actuel du frontend. Son intégration avant la release Core 1.0 est suivie dans [`../docs/DEBT.md`](../docs/DEBT.md).

## Alias

L'alias partagé reste :

```text
@/ → frontend/src/
```

Il est configuré pour Vite/Vitest et pour l'éditeur via `jsconfig.json`.
