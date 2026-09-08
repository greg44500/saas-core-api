# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active. Il doit rester court et refléter l'état réel du HEAD courant. Le code, les contraintes DB, les tests validés et les contrats canoniques priment.
>
> **Dernière mise à jour : 2026-09-08**

---

## 1. Hiérarchie d'autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés réellement exécutés et validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. présent fichier de reprise.

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement prêt pour la production.

À chaque reprise : `git pull`, vérifier le HEAD courant et relire le code réellement présent avant modification.

---

## 2. Objectif du Core

`saas-core-api` est un **socle SaaS générique clonable, maintenable et évolutif**.

Le Core porte les responsabilités transversales : authentification/sessions, RBAC Workspace et Platform, Workspaces/membres, Plans/Subscriptions/trial, entitlements/quotas/dérogations, fichiers sécurisés, audit logs, lifecycle Account/Workspace, rétention/purge générique, onboarding commercial générique, points d'extension métier, versionnement/migrations/upgrade et E2E Core.

Les modules métier réels ne doivent pas être développés directement dans le dépôt Core.

---

## 3. Roadmap réelle jusqu'au clonage métier

État actuel :

```text
D-018 Équipe Platform / RBAC / invitations internes            ✅ VALIDÉ
D-019 moteur sécurisé de rétention / purge Core                ✅ VALIDÉ
DOC-CODE-1 normalisation documentation source                  ✅ VALIDÉ
HOME-CORE accès public login/register                          🔄 CORRECTIF INTÉGRÉ, GATE FINALE À RECONFIRMER
→ D-020 invitation commerciale client / offre privée Découverte ⏭️ PROCHAIN BLOC
→ D-015 versionnement / provenance / migrations / release
→ D-016 Playwright / E2E Core
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
→ release v1.0.0
→ clone du véritable SaaS métier
→ cadrage puis développement des modules métier
```

D-018 et D-019 ne doivent pas être rouverts sans bug démontré ou nouvelle exigence générique.

---

## 4. DOC-CODE-1 — VALIDÉ le 2026-09-08

```text
DOC-CODE-1 — Normalisation de la documentation du code source
```

Contrat canonique :

```text
docs/architecture/CODE-DOCUMENTATION.md
```

### 4.1 Éléments validés

- politique documentaire canonique et versionnée ;
- ESLint backend et frontend configurés ;
- `eslint-plugin-jsdoc` intégré ;
- dépendances et lockfiles persistés ;
- lint séparé backend/frontend reproductible après clone ;
- backend de production documenté par mini-lots sur les frontières critiques ;
- frontend de production documenté sur les frontières RTK Query, routing et composants métier sensibles ;
- tests critiques documentés légèrement uniquement lorsque l'invariant le justifie ;
- aucune règle globale `require-jsdoc` ;
- aucune documentation artificielle ligne par ligne ;
- aucune modification de logique métier réalisée pour satisfaire la documentation.

### 4.2 Invariants de documentation permanents

La documentation source doit expliquer, lorsque pertinent :

```text
responsabilité
contrat
invariants
effets de bord
frontières de sécurité
raisons non évidentes
```

Elle ne doit pas paraphraser le code.

JSDoc est utilisé lorsqu'il améliore réellement un contrat public, réutilisable ou sensible. Le projet reste JavaScript uniquement ; JSDoc ne doit pas devenir du pseudo-TypeScript.

Réutilisabilité et documentation restent deux gates distinctes :

```text
composant partagé pertinent
+
contrat documenté
```

Aucun second `DataTable`, système de drawer générique, confirmation générique, `InfoTooltip`, toast ou stratégie RTK Query parallèle ne doit être créé sans justification architecturale.

### 4.3 Gate finale confirmée

Validation locale confirmée par l'utilisateur le 2026-09-08 :

```text
lint backend                 ✅
lint frontend                ✅
backend tests globaux        ✅
frontend tests globaux       ✅
build Vite production        ✅
revue documentaire ciblée    ✅
```

DOC-CODE-1 est donc **clôturé**.

Nouvelle Definition of Done permanente :

```text
Architecture          ✅
Sécurité              ✅
Validation stricte    ✅
Réutilisabilité       ✅
Documentation source  ✅
Tests                 ✅
Build                 ✅
```

---

## 5. Correctif générique HOME-CORE — accès Auth depuis `/`

### 5.1 Problème constaté

La route publique `/` affichait encore l'ancienne démonstration du design system F2. Un visiteur ne pouvait accéder à l'authentification qu'en saisissant manuellement `/login` ou `/register` dans la barre d'adresse.

Pour un Core destiné à être cloné puis spécialisé métier, ce comportement n'est pas acceptable : la home publique générique doit fournir un point d'entrée professionnel et neutre vers les parcours Auth sans imposer une identité métier spécifique.

### 5.2 Correction intégrée

`frontend/src/App.jsx` a été transformé en landing publique générique :

- CTA réel `Se connecter` vers `/login` ;
- CTA réel `Créer un compte` vers `/register` ;
- conservation du `ThemeToggle` ;
- design neutre et professionnel basé sur le design system existant ;
- aucune promesse métier spécifique ;
- contenu explicitement remplaçable lors de la dérivation d'un SaaS métier ;
- aucune modification du workflow Auth, des guards ou du backend.

Tests associés :

- `frontend/src/App.test.jsx` vérifie désormais les accès `/login` et `/register` ;
- `frontend/src/app/router.test.jsx` a été aligné sur la nouvelle landing et ne vérifie plus l'ancienne home F2 ni un texte `SaaS Core` ambigu.

Commits repères :

```text
2236b8f7e859f9f623129080f47f66a86f6caad6  feat(home): expose auth entry points from public landing
32f22956234b057377b2ce247701775b85f7b759  test(home): cover public auth navigation
9717f177e470a391183b3c9ffae33cfacbac6ba7  test(router): align public root assertions with landing
```

### 5.3 Gate à confirmer avant D-020

Le dernier run frontend complet avait révélé un seul test obsolète dans `router.test.jsx`. Ce test a été corrigé au commit `9717f177...`, mais sa revalidation locale finale n'a pas encore été confirmée dans cette synthèse.

Avant d'ouvrir D-020 :

```text
frontend lint global     à reconfirmer
frontend tests globaux   à reconfirmer après 9717f177
build Vite               à reconfirmer
```

Contrôle manuel recommandé :

```text
/ → Créer un compte → /register
/ → Se connecter    → /login
```

Ce correctif appartient au Core générique et reste indépendant de D-020.

---

## 6. D-020 — PROCHAIN BLOC

```text
D-020 — Invitation commerciale client et offres privées de découverte
```

Le blocage documentaire qui empêchait D-020 de commencer est levé. D-020 ne doit toutefois démarrer qu'après confirmation de la gate frontend du correctif HOME-CORE ci-dessus.

### 6.1 Frontière obligatoire

```text
PlatformInvitation
→ collaborateur interne de l'éditeur

CommercialInvitation
→ prospect / futur client utilisateur du SaaS
```

Il est interdit de réutiliser `PlatformInvitation` comme modèle métier d'invitation commerciale.

Les primitives de sécurité peuvent être réutilisées conceptuellement : token aléatoire, hash, expiration, rotation, revoke, audit et absence de secret brut persistant.

### 6.2 Décisions commerciales déjà figées

- une offre « Découverte commerciale » peut utiliser un Plan privé `isPublic=false` ;
- un Plan privé peut avoir un prix `0` sans devenir la baseline Free ;
- les fonctionnalités sont explicitement listées ;
- aucune règle dynamique « toutes les fonctionnalités sauf IA » ;
- une future capability ne doit jamais être accordée automatiquement ;
- un accès commercial gratuit durable n'est pas un « trial illimité » ;
- un vrai trial reste temporaire avec `trialEndsAt` ;
- `EntitlementOverride` reste l'outil d'exception individuelle ;
- un Plan privé représente une offre réutilisable ;
- l'acteur commercial choisit une offre existante et ne fabrique pas arbitrairement des capabilities au moment de l'invitation ;
- l'invitation doit être auditée : acteur, bénéficiaire, offre, raison, dates, acceptation, révocation ;
- le Workspace doit être créé ou rattaché dans le flow d'acceptation afin d'éviter les workspaces orphelins ;
- le Super administrateur est l'autorité initiale ;
- l'architecture doit utiliser des permissions Platform dédiées pour permettre une délégation future sans réécrire la logique métier.

### 6.3 Points à résoudre avant code D-020

1. sémantique exacte d'une offre gratuite sans échéance ;
2. relation `CommercialInvitation` / Plan privé / Subscription / Workspace ;
3. comportement de `TrialEligibility` pour une invitation commerciale manuelle ;
4. flow existing-user vs new-user ;
5. création ou rattachement exact du Workspace à l'acceptation ;
6. états et cycle de vie de `CommercialInvitation` ;
7. permissions Platform dédiées ;
8. conditions de resend / rotation / revoke ;
9. atomicité de l'acceptation ;
10. audit et absence de secrets ;
11. impact sur le résolveur Subscription qui attend actuellement une `currentPeriodEnd` future pour les subscriptions commerciales actives.

Une date artificielle lointaine telle que `2099-12-31` ne doit pas simuler un accès illimité.

D-020 doit être **cadré avant tout code**.

---

## 7. Règles permanentes de développement

### Backend

- JavaScript uniquement ;
- Zod strict ;
- logique métier dans les services ;
- controllers minces ;
- routes sans logique métier ;
- isolation Workspace ;
- RBAC ;
- entitlements/quotas lorsque nécessaires ;
- audit ;
- transactions lorsque les invariants l'exigent ;
- sécurité fail-closed ;
- documentation source selon `docs/architecture/CODE-DOCUMENTATION.md`.

### Frontend

```text
useState      → état UI local
Redux Toolkit → état client global
RTK Query     → état serveur
```

- pages = assemblage ;
- appels API via RTK Query ;
- composants partagés obligatoires lorsqu'ils sont pertinents ;
- aucune duplication de tableau, drawer, confirmation ou infrastructure transverse sans justification ;
- backend = autorité finale sur permissions, entitlements et transitions sensibles ;
- documentation source obligatoire selon le niveau de complexité.

---

## 8. Sécurité permanente

Invariant :

```text
ne jamais faire confiance au frontend
ne jamais faire dépendre la sécurité d'un bouton masqué
```

Backend = autorité sur identité, ownership, memberships, permissions, entitlements, quotas, lifecycle, invitations, subscription et transitions sensibles.

Validation Zod stricte obligatoire.

`sanitizeFilter` reste activé. Utiliser `mongoose.trusted()` uniquement pour les opérateurs MongoDB construits intentionnellement par le serveur.

Les mutations sensibles doivent réautoriser depuis l'état courant lorsque nécessaire et conserver un audit approprié.

Les tokens/secrets d'invitation ne doivent jamais être persistés ou exposés en clair.

---

## 9. Prochaine reprise exacte

```text
1. git pull
2. vérifier le HEAD courant
3. lire docs/REPRISE-CURRENT.md
4. considérer D-018, D-019 et DOC-CODE-1 comme VALIDÉS
5. revalider le correctif HOME-CORE : lint frontend + tests globaux + build + navigation manuelle login/register
6. ne pas ouvrir D-015
7. une fois HOME-CORE confirmé vert, commencer D-020 par le cadrage fonctionnel et architectural
8. figer le contrat CommercialInvitation
9. seulement ensuite découper D-020 en mini-lots backend/frontend/tests
```

D-002 reste hors périmètre et ne doit pas être modifié.

---

## 10. Résumé de reprise en une phrase

D-018, D-019 et DOC-CODE-1 sont **VALIDÉS** ; le correctif générique de home publique avec accès `/login` et `/register` est intégré et doit recevoir une dernière confirmation locale après le patch de `router.test.jsx` ; une fois cette gate verte, **D-020** devient le prochain bloc à cadrer avant toute implémentation.