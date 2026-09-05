# SAAS-CORE-API — Architecture globale

**Statut :** document canonique d’architecture  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** socle Core, frontend, backend et futures applications dérivées

## 1. Objet

`saas-core-api` est un socle SaaS générique destiné à fournir les fondations techniques et fonctionnelles communes à plusieurs applications métier.

Le projet n’a pas vocation à devenir une application métier universelle. Il fournit un **Core stable et réutilisable** sur lequel des applications dérivées ajoutent leurs propres domaines.

Principe directeur :

```text
SAAS-CORE-API
→ fournit les fondations SaaS génériques

APPLICATION DÉRIVÉE
→ conserve ces fondations
→ ajoute ses modules métier
→ déclare ses capabilities métier
→ définit son catalogue commercial final
```

La dépendance architecturale doit rester :

```text
MODULE MÉTIER
      ↓
     CORE
```

et jamais :

```text
CORE
  ↓
MODULE MÉTIER SPÉCIFIQUE
```

Le Core ne doit donc pas importer un module propre à la formation, la restauration, l’e-commerce, un CRM ou tout autre produit futur.

---

## 2. Responsabilités du Core

Le Core couvre les domaines SaaS génériques actuellement présents :

```text
Authentification et sessions
Compte utilisateur
Workspaces et isolation tenant
Memberships et invitations
Rôles et permissions Workspace
Ownership
Plans et catalogue
Subscriptions et trials
Capabilities et métriques
Entitlements et quotas
EntitlementOverride
Fichiers génériques
AuditLog
Administration Platform
Dashboard Platform générique
```

Ces domaines sont réutilisables indépendamment du métier final.

Une fonctionnalité ne doit rejoindre le Core que lorsqu’elle constitue une capacité générique démontrée et non une anticipation d’un futur produit.

---

## 3. Frontières de contexte

L’architecture distingue trois contextes fonctionnels principaux.

### 3.1 Compte

Le compte utilisateur est global et indépendant d’un Workspace.

Exemples :

```text
profil
sécurité
sessions
mot de passe
```

Le compte ne doit pas être artificiellement rattaché au Workspace courant.

### 3.2 Workspace

Le Workspace est la frontière tenant du Core V1.

Les ressources tenant-scoped doivent toujours être résolues dans un contexte Workspace explicite.

Exemples :

```text
members
roles
invitations
subscription
files
audit logs
entitlements
usage metrics
```

Le simple fait de connaître un identifiant MongoDB d’une ressource ne constitue jamais une autorisation d’accès.

### 3.3 Platform

Platform représente l’administration globale de l’instance SaaS.

Elle est distincte du Workspace et couvre notamment :

```text
users
workspaces
plans
subscriptions
entitlement overrides
audit logs
overview
capability catalogue en lecture
```

Le frontend et le backend doivent préserver cette séparation afin d’éviter les confusions entre administration d’un tenant et administration de la plateforme.

---

## 4. Vue d’ensemble technique

```text
Navigateur
   │
   ▼
Frontend React / Vite
   │
   │ HTTP / JSON
   ▼
Express API /api
   │
   ├── Auth / validation / tenant / RBAC
   ├── Entitlement / quotas
   ├── Services métier Core
   ├── Services techniques transverses
   └── Audit
   │
   ▼
MongoDB / Mongoose
```

Les fichiers suivent en parallèle un pipeline technique dédié de contrôle, inspection, antivirus et stockage.

Les contrats observables frontend/backend sont documentés dans :

```text
docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md
```

---

## 5. Stack actuelle de référence

Le code courant reste l’autorité sur les versions réellement installées.

### Backend

```text
Node.js >=24.7 <25
JavaScript ESM uniquement
Express 5
MongoDB / Mongoose 9
Zod 4
Vitest
Supertest
```

### Frontend

```text
React 19
Vite 8
JavaScript uniquement
Tailwind CSS 4
composants shadcn/ui adaptés au projet
Redux Toolkit
RTK Query
React Router 8
React Hook Form
Zod
Vitest
React Testing Library
```

Playwright fait partie de la stratégie E2E cible du projet, mais son absence éventuelle du package courant ne doit pas être masquée par la documentation. Son installation et ses scénarios critiques seront traités dans la finalisation du Core et des applications dérivées.

Aucune migration TypeScript ne doit être introduite implicitement.

---

## 6. Architecture backend

Le backend est organisé autour de domaines Core sous :

```text
backend/modules/
```

Les responsabilités transverses restent séparées :

```text
backend/config/       configuration technique
backend/constants/    constantes et registres transverses
backend/middlewares/  pipeline HTTP et sécurité
backend/services/     services techniques partagés
backend/jobs/         traitements planifiés
backend/migrations/   évolutions contrôlées des données
backend/seeds/        initialisation idempotente
backend/operations/   opérations explicitement déclenchées
backend/tests/        tests backend
backend/utils/        utilitaires transverses
```

Le détail normatif est maintenu dans `BACKEND.md`.

---

## 7. Architecture frontend

Le frontend est organisé par responsabilités et par fonctionnalités :

```text
frontend/src/
├── app/
├── components/
│   ├── ui/
│   ├── shared/
│   ├── forms/
│   └── data-display/
├── features/
├── services/api/
├── store/
├── hooks/
├── lib/
├── utils/
└── pages/
```

Les pages et routes assemblent des composants ; la logique fonctionnelle doit rester dans les features, hooks, helpers et couches API appropriés.

Le détail normatif est maintenu dans `FRONTEND.md` puis complété par `docs/frontend/FRONTEND-GUIDELINES.md` pour les règles UI/UX et de composants.

---

## 8. Gestion d’état frontend

La séparation suivante constitue l’architecture cible et correspond aux choix actifs :

```text
État serveur
→ RTK Query

État global client réel
→ Redux Toolkit

État local d’un composant
→ useState / useReducer

État de navigation partageable
→ URL / React Router

État de formulaire
→ React Hook Form

État dérivé
→ calculé depuis sa source
```

Une donnée serveur déjà gérée par RTK Query ne doit pas être recopiée dans un slice Redux classique.

Le store global actuel porte principalement le cycle Auth et le `baseApi` RTK Query.

---

## 9. Capabilities comme point d’extension

Le Capability Registry est la jonction officielle entre le Core et les futurs modules métier.

```text
Core capabilities
        +
Capabilities des modules métier installés
        ↓
ACTIVE_PLAN_CAPABILITY_REGISTRY
        ↓
Plans / Entitlements / Quotas / Platform
```

Le Core ne découvre pas automatiquement des modules métier dans le filesystem.

Après dérivation, l’application importe explicitement les descriptors des modules réellement présents puis compose son registre actif.

Cette règle permet de conserver un Core générique tout en rendant le catalogue commercial et les contrôles d’entitlement extensibles.

Référence : `docs/contracts/CAPABILITIES.md`.

---

## 10. Commercial et métier

Le moteur commercial générique appartient au Core :

```text
Plan
Subscription
TrialEligibility
UsageMetric
Entitlement effectif
EntitlementOverride
```

Le catalogue commercial réel appartient à l’application dérivée :

```text
noms des offres
prix
features incluses
limites
positionnement commercial
```

Le Core ne doit pas accorder un droit à partir d’un nom de Plan, d’une clé historique ou d’un prix.

Référence : `docs/contracts/COMMERCIAL.md`.

---

## 11. Réutilisabilité frontend

La réutilisabilité des composants est une contrainte d’architecture et non une simple préférence esthétique.

Les composants transverses doivent être réutilisés lorsqu’ils correspondent au besoin.

Exemples déjà présents dans le Core :

```text
DataTable
DataPagination
EntityDetailsDrawer
ConfirmationDialog
FeatureToggle
DashboardSection
composants data-display génériques
```

Un futur module métier ne doit pas recréer son propre système de table, pagination, drawer ou confirmation lorsque le composant partagé couvre le contrat nécessaire.

La composition reste préférable à un composant sur-paramétré qui tenterait de résoudre tous les cas possibles.

---

## 12. Sens des dépendances

Les dépendances doivent suivre le niveau de responsabilité.

### Backend

```text
route
  ↓
middlewares / validation
  ↓
controller
  ↓
service métier
  ↓
models / services techniques / autres services Core explicitement nécessaires
```

Les controllers ne doivent pas devenir une seconde couche de services métier.

### Frontend

```text
route / page
   ↓
feature components
   ↓
shared components / UI primitives

feature
   ↓
RTK Query endpoint / hooks / helpers
```

Une primitive UI générique ne doit pas importer une feature métier.

Un composant transverse ne doit pas dépendre de Platform, Subscription ou d’un futur module métier pour fonctionner.

---

## 13. Données et autorité

Le backend reste l’autorité pour :

```text
authentification
autorisation
isolation tenant
validation finale
RBAC
entitlements
quotas
états de Subscription
règles métier
sécurité des fichiers
audit
```

Le frontend adapte l’expérience mais ne crée jamais une nouvelle règle d’autorisation indépendante.

Masquer une action, une navigation ou une fonctionnalité améliore l’UX ; cela ne remplace jamais le contrôle serveur.

---

## 14. Transactions et invariants

Les opérations sensibles qui modifient plusieurs ressources cohérentes doivent préserver leurs invariants de manière atomique lorsque nécessaire.

Exemples actuels ou typiques :

```text
membership + UsageMetric
ownership + rôles/memberships
Subscription lifecycle
EntitlementOverride + AuditLog
fichier + quotas / métadonnées
```

Les détails de sécurité, d’atomicité et de transactions seront centralisés dans `docs/security/SECURITY.md` au lot DOC-4 afin de ne pas dupliquer leur contrat ici.

---

## 15. Tests dans l’architecture

Un comportement Core n’est considéré comme stabilisé que si son niveau de risque est couvert par des tests adaptés.

Architecture actuelle :

```text
Backend
→ Vitest
→ Supertest
→ tests regroupés sous backend/tests

Frontend
→ Vitest
→ React Testing Library
→ user-event
→ tests majoritairement colocated avec composants/helpers
```

Les E2E Playwright couvriront les parcours critiques lorsqu’ils seront introduits dans la phase de finalisation.

Les tests doivent vérifier les comportements et invariants observables, pas figer inutilement les détails internes d’implémentation.

---

## 16. Architecture d’une application dérivée

Une application dérivée doit conserver une frontière lisible :

```text
APPLICATION DÉRIVÉE
│
├── Core conservé
│   ├── auth
│   ├── account
│   ├── workspace
│   ├── RBAC
│   ├── commercial
│   ├── files
│   ├── audit
│   └── platform
│
└── Modules métier ajoutés
    ├── backend/modules/<domaine>
    ├── frontend/src/features/<domaine>
    ├── capabilities métier
    ├── permissions métier
    ├── métriques métier
    └── tests métier
```

Une application dérivée peut naturellement intégrer ses modules au routing, à la navigation et aux Plans, mais elle doit éviter de réécrire les mécanismes Core uniquement pour ajouter une nouvelle fonctionnalité métier.

Le workflow complet de création et de maintenance des applications dérivées sera documenté dans `docs/derived-saas/DERIVED-SAAS.md`.

---

## 17. Maintenabilité du Core

L’objectif futur est de pouvoir faire évoluer le Core puis transférer de façon contrôlée les correctifs compatibles vers les applications dérivées.

Cette exigence impose dès maintenant :

- une séparation Core / métier claire ;
- peu de modifications arbitraires du Core dans les applications dérivées ;
- des contrats stables ;
- des migrations explicites ;
- des tests de non-régression ;
- un versionnement du Core avant sa diffusion comme socle finalisé.

La stratégie Git et de versionnement sera cadrée dans `DERIVED-SAAS.md`, pas dans ce document d’architecture générale.

---

## 18. Règle d’évolution

Avant d’introduire une nouvelle abstraction ou un nouveau domaine dans le Core, poser successivement les questions suivantes :

1. le besoin est-il réellement générique à plusieurs SaaS ?
2. existe-t-il déjà une abstraction Core adaptée ?
3. peut-il rester dans le module métier dérivé ?
4. modifie-t-il un contrat HTTP ou une frontière de sécurité ?
5. modifie-t-il le Capability Registry, RBAC ou le moteur commercial ?
6. nécessite-t-il migration, audit ou transaction ?
7. quels tests garantissent sa non-régression ?
8. compromet-il la capacité à mettre à jour les futurs SaaS dérivés ?

Une nouvelle convention transverse ne doit jamais apparaître accidentellement au détour d’une feature locale.

---

## 19. Documents liés

```text
docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md
docs/architecture/BACKEND.md
docs/architecture/FRONTEND.md
docs/security/SECURITY.md          # DOC-4
docs/frontend/FRONTEND-GUIDELINES.md # DOC-5
docs/derived-saas/DERIVED-SAAS.md # DOC-6
docs/DEBT.md
```

En cas de contradiction, le code et les tests actuels restent prioritaires selon la hiérarchie définie dans `docs/README.md`.
