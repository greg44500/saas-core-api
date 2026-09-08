# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il décrit l'état réel du travail au moment de la reprise. Il n'est pas normatif : le code, les contraintes DB, les tests réellement validés et les contrats canoniques priment.
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

À chaque reprise : commencer par `git pull`, vérifier le HEAD courant et relire le code réellement présent avant toute modification.

---

## 2. Objectif du Core

`saas-core-api` est un **socle SaaS générique clonable, maintenable et évolutif**.

Le Core porte les responsabilités transversales :

```text
authentification / sessions
RBAC Workspace
RBAC Platform
Workspaces / membres
Plans / Subscriptions / trial
Entitlements / quotas / dérogations
Files sécurisés
Audit logs
administration Platform
lifecycle Account / Workspace
points d'extension métier
rétention / purge générique sécurisée
onboarding commercial générique
versionnement / migrations / upgrade
E2E Core
```

Les modules métier réels ne doivent pas être développés directement dans le dépôt Core.

---

## 3. Roadmap réelle jusqu'au clonage métier

État actuel :

```text
D-019 moteur sécurisé de rétention / purge Core ✅ VALIDÉ
→ DOC-CODE-1 normalisation de la documentation du code source ⏭️ PROCHAIN BLOC OBLIGATOIRE
→ D-020 invitation commerciale client / offre privée Découverte
→ D-015 versionnement / provenance / migrations / release
→ D-016 Playwright / E2E Core
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
→ release v1.0.0
→ clone du véritable SaaS métier
→ cadrage puis développement des modules métier
```

`DOC-CODE-1` est un bloc de qualité transversal ajouté avant D-020. Il ne constitue pas une nouvelle fonctionnalité métier : il rétablit une exigence de maintenabilité déjà demandée mais insuffisamment appliquée dans le code source.

Important :

```text
D-017
= clone pilote technique temporaire destiné à éprouver dérivation + upgrade

clone métier réel
= seulement après validation du Core et release v1.0.0
```

---

## 4. D-018 — VALIDÉ

D-018 « Équipe de la Plateforme / RBAC Platform / invitations internes » reste clôturé et VALIDÉ depuis le 2026-09-07.

Contrat canonique :

```text
docs/contracts/PLATFORM-TEAM.md
```

Invariants à ne pas rouvrir sans besoin démontré :

- RBAC Platform distinct du RBAC Workspace ;
- Fondateur protégé et toujours Super administrateur ;
- plusieurs Super administrateurs possibles avec protection du dernier actif ;
- autorité sensible recalculée depuis MongoDB ;
- rôles système immuables depuis l'administration courante ;
- rôles personnalisés sans permission `RESERVED` ;
- invitations Platform réservées aux collaborateurs internes ;
- page unique « Gestion des membres » avec onglets Membres / Invitations / Rôles & permissions ;
- composants partagés obligatoires.

---

## 5. D-019 — VALIDÉ le 2026-09-08

```text
D-019 — Moteur sécurisé de rétention et purge des données Core
```

Contrat canonique :

```text
docs/contracts/RETENTION.md
```

D-019 fournit le moteur technique générique. Il reste distinct de D-006 :

```text
D-019
→ mécanismes sécurisés, configurables, bornés et traçables

D-006
→ règles juridiques / produit réelles de conservation, anonymisation ou suppression
```

Invariants validés à ne pas rouvrir sans bug démontré :

- registre de targets et adapters code-owned ;
- configuration persistée strictement validée ;
- aucune collection/filter/cutoff arbitraire fourni par le frontend ;
- première target administrable : `AuditLog` ;
- permissions `platform:retention:read/preview/update/execute` avec `update/execute` RESERVED ;
- policies versionnées et append-only ;
- `RetentionExecution` durable et indépendante des AuditLogs purgés ;
- delete File utilisateur = soft-delete ;
- File `DELETED` compte dans `storage_bytes` tant qu'il existe physiquement ;
- purge File par claim/lease atomique ;
- adapter AuditLog étroit ;
- preview et cutoff calculés côté serveur ;
- batches bornés ;
- lock/lease distribué MongoDB ;
- scheduler avec identité système ;
- comportement fail-closed ;
- frontend Platform via RTK Query, composants partagés et `DataTable` partagé.

Validation confirmée par l'utilisateur le 2026-09-08 :

```text
backend ciblé / sécurité      ✅
backend global                 ✅
frontend ciblé                 ✅
frontend global                ✅
build Vite production          ✅
```

Repère frontend final confirmé :

```text
164 fichiers de tests
532 tests
→ verts
```

D-019 ne doit plus être rouvert sauf bug démontré ou nouvelle exigence générique.

### 5.1 Point documentaire encore à nettoyer

`docs/DEBT.md` peut encore contenir une mention historique `D-019 = PLANIFIÉ`. Cette mention est obsolète et doit être alignée lors du bloc documentaire sans rouvrir la fonctionnalité.

---

# 6. PROCHAIN BLOC OBLIGATOIRE — DOC-CODE-1

```text
DOC-CODE-1 — Normalisation de la documentation du code source
```

## 6.1 Pourquoi ce bloc est nécessaire

La documentation du code de production n'a pas été appliquée de manière suffisamment systématique malgré l'exigence de maintenabilité du projet.

Le principe « commenter uniquement le pourquoi » reste valide, mais il a été interprété de façon trop restrictive. Il ne signifie pas qu'un fichier de production peut rester sans expliquer :

- sa responsabilité ;
- son contrat ;
- ses invariants ;
- ses effets de bord ;
- ses contraintes de sécurité ;
- les raisons non évidentes de certains choix.

Pour un Core clonable, le code source doit être compréhensible par un développeur qui n'a pas participé à sa création.

Constat technique actuel à revérifier depuis le HEAD :

- le `package.json` racine expose `"lint": "eslint ."` ;
- `eslint` n'est pas actuellement déclaré dans les `devDependencies` racine observées ;
- aucune configuration ESLint versionnée n'a été identifiée lors du constat ;
- le `frontend/package.json` ne possède pas de script lint ;
- certaines fonctions critiques disposent de commentaires utiles, mais la couverture documentaire des fichiers de production est hétérogène.

La règle documentaire doit donc devenir **explicite, canonique et vérifiable**, au même niveau que les tests, la sécurité et la réutilisabilité des composants.

---

## 6.2 Politique documentaire cible à figer

Créer un document canonique :

```text
docs/architecture/CODE-DOCUMENTATION.md
```

Ce contrat devra établir la règle suivante :

> La documentation explique responsabilité, contrat, invariants, effets de bord et raisons non évidentes. Elle ne paraphrase pas mécaniquement le code.

Documentation minimale attendue par catégorie :

| Type de fichier | Documentation attendue |
|---|---|
| Service métier | en-tête de fichier + JSDoc des fonctions publiques/majeures |
| Model Mongoose | en-tête + invariants/contraintes non évidentes |
| Validation Zod | en-tête + justification des règles sensibles |
| Controller | en-tête ; JSDoc si contrat complexe |
| Routes | en-tête précisant domaine, accès et rôle des middlewares |
| Middleware | en-tête + contrat + sécurité |
| Adapter / registry | en-tête + contrat d'extension |
| Job | en-tête + effets de bord + idempotence + mode d'exécution |
| Migration | en-tête + objectif + préconditions + idempotence/reprise |
| RTK Query API | en-tête + responsabilité et frontière serveur |
| Composant partagé | en-tête/JSDoc + contrat des props pertinentes |
| Composant métier complexe | en-tête expliquant rôle et responsabilités |
| Hook/helper réutilisable | JSDoc du contrat |
| Page React | en-tête si orchestration métier/serveur significative |
| Constantes triviales | documentation seulement si le sens n'est pas évident |
| Tests critiques | en-tête léger pour les invariants de sécurité/métier importants |
| Tests simples | noms `describe/it` suffisamment expressifs ; pas de commentaire obligatoire artificiel |

Interdiction : ajouter des commentaires de faible valeur qui répètent ce que le code dit déjà.

---

## 6.3 JSDoc : règle cible

JSDoc doit être utilisé lorsqu'il améliore réellement le contrat de maintenance, notamment pour :

```text
services métier exportés
helpers réutilisables
hooks
adapters
jobs
migrations
fonctions de sécurité importantes
composants partagés
composants métier complexes
API techniques réutilisables
```

Le projet reste JavaScript uniquement. JSDoc doit améliorer la compréhension sans transformer le code en pseudo-TypeScript ni dupliquer inutilement chaque type évident.

Les commentaires doivent prioritairement expliquer le **pourquoi** : sécurité, atomicité, fail-closed, isolation tenant, choix de quota, invariants de lifecycle, raison d'un lock, raison d'une transaction, etc.

---

## 6.4 Réutilisabilité et documentation sont deux gates distinctes

La documentation ne remplace pas la réutilisabilité.

Règle permanente :

```text
composant réutilisable pertinent
+
documentation de son contrat
```

Les composants partagés existants restent obligatoires : `DataTable`, drawers, confirmations, formulaires, `InfoTooltip`, toasts et conventions RTK Query.

Aucun composant dupliqué ne doit être créé sous prétexte de mieux le documenter.

---

## 6.5 Découpage recommandé de DOC-CODE-1

Ne pas traiter tout le dépôt en un commit massif sans contrôle.

### DOC-CODE-1.1 — politique + gate qualité

- inspecter l'outillage actuel ESLint/Prettier ;
- créer `docs/architecture/CODE-DOCUMENTATION.md` ;
- définir les règles JSDoc réellement utiles ;
- installer/configurer ESLint et `eslint-plugin-jsdoc` si l'audit confirme leur absence/incomplétude ;
- ajouter des scripts lint cohérents racine/frontend ;
- ne pas activer une règle imposant du JSDoc artificiel à chaque fonction privée ;
- définir la future gate documentaire.

### DOC-CODE-1.2 — audit et documentation backend production

Priorité aux fichiers livrés/exécutés en production :

```text
config / constantes structurantes
middlewares
modules auth / user / workspace / RBAC
plans / subscriptions / entitlements / trial
files / audit logs
platform / platform team
retention
jobs
migrations
shared techniques critiques
```

Pour chaque fichier :

1. comprendre son rôle réel ;
2. documenter la responsabilité du fichier ;
3. documenter les contrats publics/majeurs ;
4. commenter uniquement les invariants/raisons non évidents ;
5. ne modifier aucune logique métier hors bug démontré.

### DOC-CODE-1.3 — audit et documentation frontend production

Priorité :

```text
app / router / providers
services/api / baseQuery
components/shared
components/forms
components/data-display
features/auth
features/workspace
features/subscription/commercial
features/platform
hooks / helpers réutilisables
layouts / navigation
```

Règles :

- documenter les composants partagés et leurs props pertinentes ;
- documenter les pages/orchestrateurs complexes ;
- documenter les helpers et contrats RTK Query ;
- ne pas commenter chaque `useState`, rendu JSX ou classe Tailwind évidente ;
- ne créer aucun composant dupliqué.

### DOC-CODE-1.4 — tests critiques

Les tests simples n'ont pas besoin d'un JSDoc systématique.

En revanche, les suites qui protègent des invariants majeurs doivent avoir un en-tête léger lorsque cela améliore la maintenance, par exemple :

```text
auth/session
RBAC
multi-tenant
subscription/trial
quota/file
platform permissions
retention/concurrence
lifecycle account/workspace
```

Le nom des tests doit rester la première source de compréhension.

### DOC-CODE-1.5 — validation finale

Gate minimale :

```text
lint backend/frontend        ✅
backend tests globaux        ✅
frontend tests globaux       ✅
build Vite                   ✅
revue documentaire manuelle  ✅
```

La documentation ne doit provoquer aucune régression fonctionnelle.

---

## 6.6 Critère de clôture DOC-CODE-1

DOC-CODE-1 est fermé seulement lorsque :

- la politique documentaire est canonique et versionnée ;
- la gate lint/JSDoc est réellement exécutable ;
- les fichiers de production importants sont documentés selon leur niveau de complexité ;
- les composants partagés ont un contrat compréhensible ;
- les tests critiques sont suffisamment explicites ;
- aucune documentation artificielle ne pollue le code ;
- tests backend/frontend et build restent verts ;
- la règle « documentation source » devient un critère permanent de chaque mini-lot futur.

Nouvelle gate permanente après DOC-CODE-1 :

```text
Architecture          ✅
Sécurité              ✅
Validation stricte    ✅
Réutilisabilité       ✅
Documentation source  ✅
Tests                 ✅
Build                  ✅
```

---

# 7. D-020 — BLOC SUIVANT APRÈS DOC-CODE-1

```text
D-020 — Invitation commerciale client et offres privées de découverte
```

D-020 ne doit commencer qu'après clôture de DOC-CODE-1.

## 7.1 Frontière obligatoire

```text
PlatformInvitation
→ collaborateur interne de l'éditeur

CommercialInvitation
→ prospect / futur client utilisateur du SaaS
```

Il est interdit de réutiliser `PlatformInvitation` comme modèle métier d'invitation commerciale.

Les primitives de sécurité peuvent être réutilisées conceptuellement : token aléatoire, hash, expiration, rotation, revoke, audit, absence de secret brut persistant.

## 7.2 Décisions commerciales déjà figées

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

## 7.3 Points à résoudre avant code D-020

1. sémantique exacte d'une offre gratuite sans échéance ;
2. relation entre CommercialInvitation, Plan privé, Subscription et Workspace ;
3. comportement de `TrialEligibility` pour une invitation commerciale manuelle ;
4. flow existing-user vs new-user ;
5. création ou rattachement exact du Workspace à l'acceptation ;
6. état et cycle de vie de `CommercialInvitation` ;
7. permissions Platform dédiées ;
8. conditions de resend/rotation/revoke ;
9. atomicité de l'acceptation ;
10. audit et absence de secrets ;
11. impact sur le résolveur de Subscription qui attend une `currentPeriodEnd` future pour les subscriptions commerciales actives.

Une date artificielle lointaine telle que `2099-12-31` ne doit pas simuler un accès illimité.

---

## 8. Règles permanentes de développement

### Backend

```text
backend/modules/<domaine>/
├── routes
├── controller
├── service
├── model
├── validation
└── tests
```

- JavaScript uniquement ;
- Zod strict ;
- logique métier dans les services ;
- controllers minces ;
- routes sans logique métier ;
- isolation Workspace ;
- RBAC ;
- entitlement / quotas si nécessaire ;
- audit ;
- transactions lorsque les invariants l'exigent ;
- sécurité fail-closed ;
- documentation source obligatoire selon `CODE-DOCUMENTATION.md` après sa création.

### Frontend

```text
frontend/src/features/<domaine>/
├── api
├── components
├── hooks si nécessaire
├── pages
├── validation / helpers
└── tests
```

Gestion d'état :

```text
useState      → état UI local
Redux Toolkit → état client global
RTK Query     → état serveur
```

Réutilisation obligatoire des composants partagés. Aucun second `DataTable`, système de drawer générique, confirmation générique, `InfoTooltip`, toast ou stratégie RTK Query parallèle ne doit être créé sans justification architecturale.

Les pages assemblent ; elles ne portent pas de logique métier lourde.

La documentation source fait partie de la Definition of Done de tout nouveau fichier de production.

---

## 9. Sécurité permanente

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

## 10. Ce qu'il ne faut pas faire pendant DOC-CODE-1

Ne pas :

- commencer D-020 avant clôture de DOC-CODE-1 ;
- modifier la logique métier sous prétexte de documentation ;
- ajouter des commentaires qui paraphrasent chaque ligne ;
- imposer du JSDoc à toutes les petites fonctions privées sans valeur documentaire ;
- transformer JavaScript + JSDoc en pseudo-TypeScript ;
- créer de nouveaux composants dupliqués ;
- réorganiser massivement l'architecture sans besoin démontré ;
- modifier D-002 ;
- ouvrir D-015 ;
- développer des modules métier du futur SaaS dans le Core.

---

## 11. Prochaine reprise exacte

La prochaine conversation doit suivre cet ordre :

```text
1. git pull
2. vérifier le HEAD courant
3. lire docs/REPRISE-CURRENT.md
4. considérer D-018 et D-019 comme VALIDÉS
5. ne pas démarrer D-020 immédiatement
6. inspecter package.json, frontend/package.json et tout fichier ESLint/Prettier existant
7. auditer un échantillon représentatif backend/frontend pour mesurer l'état réel de documentation
8. proposer et figer DOC-CODE-1.1 : politique CODE-DOCUMENTATION + stratégie ESLint/JSDoc
9. créer la politique canonique seulement après confirmation du périmètre exact
10. poursuivre ensuite le rattrapage backend/frontend par mini-lots contrôlés
11. valider lint + tests backend + tests frontend + build
12. clôturer DOC-CODE-1
13. seulement ensuite reprendre D-020.1
```

---

## 12. Fichiers prioritaires à la prochaine conversation

Documentation et outillage :

```text
docs/REPRISE-CURRENT.md
docs/DEBT.md
README.md
docs/README.md
package.json
frontend/package.json
fichiers ESLint / Prettier éventuels
```

Échantillon backend de départ à auditer :

```text
backend/modules/auth
backend/modules/user
backend/modules/workspace
backend/modules/platformRole
backend/modules/platformInvitation
backend/modules/subscription
backend/modules/file
backend/modules/retention
backend/jobs
backend/migrations
backend/middlewares
```

Échantillon frontend de départ à auditer :

```text
frontend/src/services/api
frontend/src/components/shared
frontend/src/components/forms
frontend/src/features/auth
frontend/src/features/workspace
frontend/src/features/platform
frontend/src/features/subscription
frontend/src/app
```

Les chemins exacts doivent toujours être revérifiés depuis le HEAD courant avant modification.

---

## 13. Résumé de reprise en une phrase

D-018 et D-019 sont **VALIDÉS** ; avant d'ouvrir D-020, le projet doit exécuter **DOC-CODE-1**, un bloc transversal obligatoire qui formalise la politique de documentation du code source, met en place une gate ESLint/JSDoc proportionnée, documente progressivement les fichiers de production backend/frontend sans paraphraser le code ni modifier la logique métier, puis valide lint, tests globaux et build avant de reprendre le cadrage de `CommercialInvitation`.