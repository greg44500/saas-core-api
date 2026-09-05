# SAAS-CORE-API

Socle SaaS fullstack générique et réutilisable, destiné à être dérivé en applications métier tout en conservant des fondations communes maintenables : authentification, multi-tenant, RBAC, plans et abonnements, entitlements, quotas, fichiers, audit et administration Platform.

## Statut du projet

Le dépôt est actuellement en développement (`0.1.0`).

La documentation canonique du Core a été consolidée, mais le socle ne doit pas encore être présenté comme une release stable `v1.0.0` ni comme une application automatiquement prête pour la production.

Avant une release Core 1.0, plusieurs blockers restent suivis dans [`docs/DEBT.md`](docs/DEBT.md), notamment la fermeture de compte / cycle de vie Workspace, les points d'extension métier, le versionnement et le release process, les E2E Playwright et la validation réelle d'un upgrade de SaaS dérivé.

## Ce que fournit le Core

Le Core fournit des mécanismes génériques réutilisables :

- authentification et sessions avec rotation des refresh tokens ;
- comptes utilisateurs ;
- Workspaces multi-tenant ;
- memberships, invitations, rôles et permissions ;
- transfert d'ownership ;
- Plans, Subscription, trial et baseline ;
- Capability Registry extensible ;
- entitlements effectifs, quotas et `UsageMetric` ;
- `EntitlementOverride` administré depuis Platform ;
- pipeline File sécurisé, soft delete et purge différée ;
- AuditLog Workspace / Platform ;
- console Platform ;
- frontend Core React avec composants et patterns réutilisables.

Le Core ne doit pas contenir les domaines propres à un produit métier : cours, produits, stocks métier, recettes, CRM, certificats, règles sectorielles, IA métier, etc. Ces responsabilités appartiennent aux applications dérivées.

## Stack actuelle

### Backend

- Node.js / JavaScript ESM ;
- Express ;
- MongoDB / Mongoose ;
- Zod ;
- JWT + sessions de refresh persistées ;
- Multer / `file-type` / ClamAV pour le pipeline File ;
- Nodemailer ;
- Vitest + Supertest.

### Frontend

- React + Vite ;
- JavaScript uniquement ;
- Tailwind CSS et composants de design system inspirés de shadcn/ui ;
- React Router ;
- Redux Toolkit ;
- RTK Query ;
- React Hook Form + Zod ;
- Vitest + React Testing Library.

Les versions réellement installées restent celles des `package.json` racine et `frontend/package.json`.

## Architecture

```text
saas-core-api/
├── backend/
│   ├── config/
│   ├── constants/
│   ├── jobs/
│   ├── middlewares/
│   ├── migrations/
│   ├── modules/
│   ├── operations/
│   ├── seeds/
│   ├── services/
│   └── tests/
│
├── frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── hooks/
│       ├── lib/
│       ├── services/api/
│       ├── store/
│       └── utils/
│
└── docs/
```

Principes structurants :

```text
route backend
→ middlewares / validation
→ controller
→ service métier
→ models / services techniques

server state frontend
→ RTK Query

état global client réel
→ Redux Toolkit

état local
→ React

navigation partageable
→ URL / Router
```

Les pages frontend assemblent des composants ; elles ne doivent pas devenir propriétaires d'une logique métier lourde. Les tableaux compatibles utilisent le `DataTable` partagé et les drawers, confirmations, formulaires et primitives transverses existantes doivent être réutilisés lorsqu'ils couvrent le besoin.

## Prérequis de développement

Le dépôt exige actuellement :

```text
Node.js >= 24.7 < 25
npm
MongoDB compatible avec les transactions
```

Pour exercer l'ensemble des fonctionnalités :

- MongoDB doit être configuré pour supporter les transactions utilisées par le Core ;
- ClamAV / `clamscan` doit être accessible pour le pipeline d'upload sécurisé ;
- un serveur SMTP doit être configuré pour les emails d'authentification.

Le `.env.example` local utilise une URI MongoDB avec replica set :

```text
mongodb://127.0.0.1:27017/saas-core-api?replicaSet=rs0
```

## Installation locale

### 1. Backend

Depuis la racine :

```bash
npm install
```

Créer ensuite `.env` à partir de [`.env.example`](.env.example) et remplacer toutes les valeurs d'exemple nécessaires.

### 2. Frontend

```bash
cd frontend
npm install
```

Le frontend utilise `/api` comme base HTTP. En développement, Vite proxy cette base vers :

```text
http://localhost:5000
```

La cible peut être remplacée via :

```text
VITE_API_PROXY_TARGET
```

## Démarrage en développement

### Backend

Depuis la racine :

```bash
npm run dev
```

Par défaut, l'API écoute sur le port configuré par `PORT` (`5000` dans `.env.example`).

### Frontend

Depuis `frontend/` :

```bash
npm run dev
```

Le serveur Vite utilise normalement `http://localhost:5173` en développement.

## Seeds utiles

Depuis la racine :

```bash
npm run seed:plans
npm run seed:super-admin
```

Le seed SUPER_ADMIN utilise les variables `SUPER_ADMIN_*` de l'environnement. Les seeds ne remplacent jamais les migrations et ne doivent pas servir de mécanisme de synchronisation forcée d'un catalogue commercial dérivé.

## Tests et qualité

### Backend

```bash
npm test
npm run lint
npm run format:check
```

### Frontend

```bash
cd frontend
npm test
npm run build
```

Playwright fait partie de la cible E2E du Core mais n'est pas encore installé/configuré dans l'état actuel du dépôt ; son intégration est suivie par D-016.

## Migrations et jobs

Le dépôt expose des runners explicites via les scripts `migration:*` et `job:*` du `package.json` racine.

Une migration ne doit jamais être exécutée en production uniquement parce qu'elle existe dans le dépôt : chaque release doit préciser son ordre, sa phase de déploiement, sa compatibilité et sa stratégie de reprise.

Les jobs sont des processus autonomes. Leur présence dans le dépôt ne signifie pas qu'ils sont automatiquement planifiés ou supervisés en production.

Voir [`docs/operations/OPERATIONS.md`](docs/operations/OPERATIONS.md).

## Documentation

La porte d'entrée documentaire interne est [`docs/README.md`](docs/README.md).

| Sujet | Référence |
|---|---|
| Contrat Core transversal | [`docs/contracts/CORE-CONTRACT.md`](docs/contracts/CORE-CONTRACT.md) |
| Commercial / Subscription / entitlement | [`docs/contracts/COMMERCIAL.md`](docs/contracts/COMMERCIAL.md) |
| Capability Registry | [`docs/contracts/CAPABILITIES.md`](docs/contracts/CAPABILITIES.md) |
| Architecture globale | [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) |
| Architecture backend | [`docs/architecture/BACKEND.md`](docs/architecture/BACKEND.md) |
| Architecture frontend | [`docs/architecture/FRONTEND.md`](docs/architecture/FRONTEND.md) |
| Sécurité | [`docs/security/SECURITY.md`](docs/security/SECURITY.md) |
| Guidelines frontend | [`docs/frontend/FRONTEND-GUIDELINES.md`](docs/frontend/FRONTEND-GUIDELINES.md) |
| SaaS dérivés / upgrades Core | [`docs/derived-saas/DERIVED-SAAS.md`](docs/derived-saas/DERIVED-SAAS.md) |
| Conformité / RGPD | [`docs/compliance/COMPLIANCE.md`](docs/compliance/COMPLIANCE.md) |
| Opérations | [`docs/operations/OPERATIONS.md`](docs/operations/OPERATIONS.md) |
| Dettes actives | [`docs/DEBT.md`](docs/DEBT.md) |
| Reprise temporaire | [`docs/REPRISE-CURRENT.md`](docs/REPRISE-CURRENT.md) |

En cas de contradiction, le code et les contraintes de base de données restent prioritaires, puis les tests validés, puis les contrats et documents canoniques.

## Sécurité

Le Core applique une défense en profondeur. Authentification, validation, isolation Workspace, permissions RBAC, entitlement, quotas et contraintes de persistance restent des contrôles distincts.

Le frontend n'est jamais l'autorité de sécurité : masquer une route, un menu ou une action améliore l'UX mais ne remplace jamais les vérifications backend.

Le pipeline File adopte une politique fail-closed pour les contrôles de contenu/antivirus et les opérations sensibles utilisent transactions ou réservations atomiques lorsque leur invariant l'exige.

Voir [`docs/security/SECURITY.md`](docs/security/SECURITY.md).

## Créer un SaaS dérivé

La stratégie cible n'est pas une simple copie indépendante du dépôt.

Un produit destiné à recevoir les futures corrections du Core doit conserver l'historique Git du Core, utiliser son propre dépôt comme `origin` et conserver `saas-core-api` comme `upstream-core`.

Le métier est ajouté par composition : modules backend, features frontend, permissions, capabilities, métriques et navigation propres au produit. Une mise à niveau du Core doit passer par une branche dédiée, revue des changements, migrations/configuration, tests puis intégration contrôlée.

Cette stratégie doit encore être validée par un exercice réel de dérivation + upgrade avant la release 1.0.

Voir [`docs/derived-saas/DERIVED-SAAS.md`](docs/derived-saas/DERIVED-SAAS.md).

## Production

`saas-core-api` n'est pas automatiquement production-ready parce que le Core est fonctionnel en développement.

Selon le produit dérivé, la mise en production peut nécessiter notamment :

- Billing/Payment réel ;
- qualification RGPD et juridique ;
- observabilité ;
- politique de rétention/anonymisation ;
- stockage File adapté ;
- sauvegardes/restauration ;
- ordonnancement et supervision des jobs ;
- SMTP/antivirus de production ;
- reverse proxy, HTTPS, secrets et stratégie de déploiement ;
- E2E propres au produit.

Les obligations actives sont suivies dans [`docs/DEBT.md`](docs/DEBT.md) et les procédures génériques dans [`docs/operations/OPERATIONS.md`](docs/operations/OPERATIONS.md).

## Licence

Le package racine est actuellement déclaré `UNLICENSED`. Le dépôt n'est donc pas présenté comme un package open source distribuable sans décision explicite de licence.
