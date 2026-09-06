# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il décrit l'état réel du travail pour reprendre dans une nouvelle conversation. Il n'est pas normatif : en cas de contradiction, le code, les tests validés et les contrats canoniques priment.
>
> **Dernière mise à jour : 2026-09-06**

---

## 1. Hiérarchie d'autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés réellement validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. présent fichier de reprise.

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement prêt pour la production.

Dernier HEAD connu au moment de cette synthèse :

```text
44e3b001fa2aeebd73d61d6d9149951eb4c93133
fix(frontend): restore administration actions title
```

---

## 2. Objectif final du Core

Le dépôt `saas-core-api` est un **socle SaaS générique clonable**.

Le résultat recherché n'est pas d'y intégrer les futurs modules métier, mais de figer un Core stable contenant les capacités communes :

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
stratégie de versionnement / upgrade
E2E Core
```

Une fois `v1.0.0` réellement validée :

```text
saas-core-api v1.0.0
→ clone / dérivation d'un nouveau dépôt SaaS
→ configuration environnement
→ ajout des modules métier via les points d'extension du Core
→ conservation d'une provenance Core permettant les futurs upgrades
```

Les modules métier ne doivent donc pas être développés directement dans le Core avant cette gate.

---

## 3. Roadmap réelle avant `v1.0.0`

État actuel :

```text
CORE-FIN-1  reprise et clôture F10.6                         VALIDÉ
CORE-FIN-2  audit fonctionnel complet                       VALIDÉ
CORE-FIN-3  corrections révélées par l'audit                VALIDÉ
CORE-FIN-4  D-001 fermeture Account / Workspace             VALIDÉ
CORE-FIN-5  D-014 points d'extension métier                 VALIDÉ
D-018       Équipe de la Plateforme / RBAC / invitations    FINALISATION
D-019       moteur sécurisé rétention / purge Core          À ENREGISTRER + FAIRE
D-015       versionnement / migrations / release            PLANIFIÉ
D-016       Playwright / E2E Core                            PLANIFIÉ
Audit final architecture / sécurité / qualité               À VENIR
D-017       dérivation pilote + upgrade Core                PLANIFIÉ
Release v1.0.0                                               À VENIR
Clone SaaS réel + modules métier                             APRÈS v1.0.0
```

Ordre à respecter :

```text
D-018
→ D-019
→ D-015
→ D-016
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel
→ release v1.0.0
→ clone du vrai SaaS dérivé
→ modules métier
```

`D-017` implique volontairement un **petit clone pilote technique avant la release finale** afin de prouver que la stratégie de dérivation et d'upgrade fonctionne. Ce pilote n'est pas le futur produit métier complet.

---

## 4. D-014 — Points d'extension métier — VALIDÉ

D-014 est clôturée.

Points de composition disponibles :

```text
capabilities / relations feature → métriques
→ backend/config/applicationCapability.registry.js

permissions métier / extensions des rôles système Workspace
→ backend/config/applicationRolePermission.registry.js

routes backend métier
→ backend/config/applicationRoutes.registry.js

routes frontend métier
→ frontend/src/app/application-routes.js

navigation Workspace métier
→ frontend/src/app/workspace-navigation.js
```

La composition reste explicite, auditable et testable. Aucun système d'autodécouverte implicite ou plugin filesystem n'a été ajouté.

Invariant pour les futurs SaaS dérivés : les modules métier utilisent ces points d'extension au lieu de réécrire les longues listes centrales du Core.

---

## 5. D-018 — Équipe de la Plateforme — architecture figée

Modèle actif :

```text
User
→ identité / authentification uniquement

PlatformTeamMember
→ appartenance à l'équipe interne de la Plateforme

PlatformRole
→ rôle système ou personnalisé

PlatformPermission
→ autorité administrative réelle

PlatformInvitation
→ invitation interne sécurisée

Fondateur
→ qualité historique protégée, distincte du rôle RBAC
```

Le RBAC Platform reste strictement distinct du RBAC Workspace.

### Invariants principaux

```text
exactement un Fondateur actif
Fondateur → toujours Super administrateur
Super administrateur → pas nécessairement Fondateur
1 PlatformTeamMember → 1 PlatformRole
permissions → dérivées du rôle, jamais directement du User
```

Le Fondateur ne peut pas être rétrogradé, suspendu, révoqué ou fermé via l'administration ordinaire.

Plusieurs Super administrateurs sont possibles, mais le système protège l'invariant d'au moins un Super administrateur actif.

Les permissions sensibles sont résolues depuis l'état DB courant :

```text
requête sensible
→ resolvePlatformAuthorization()
→ PlatformTeamMember courant
→ PlatformRole courant
→ permissions effectives courantes
```

Une suspension ou révocation Platform prend donc effet sans attendre l'expiration du JWT.

Le fallback legacy `User.platformRole === super_admin` ne reste qu'une compatibilité backend transitoire pour un utilisateur n'ayant jamais eu de membership Platform. Il ne doit plus servir d'autorité frontend.

---

## 6. D-018 backend — état actuel

### Permissions et rôles système

Implémentés :

- registre de permissions Platform code-owned ;
- niveaux `DELEGABLE`, `SENSITIVE`, `RESERVED` ;
- presets système immuables ;
- extension applicative des permissions Platform ;
- Super administrateur recevant toutes les permissions actives du registre ;
- middleware d'autorisation par permission runtime.

Presets système :

```text
Super administrateur
Administrateur de la Plateforme
Support technique
Support commercial
Support client
```

Ils sont non supprimables, non archivables et non modifiables depuis l'administration normale.

### Invitations Platform

Implémenté et testé :

- modèle séparé des invitations Workspace ;
- token aléatoire et stockage SHA-256 uniquement ;
- expiration ;
- resend avec rotation ;
- revoke ;
- acceptance ;
- contrôle exact de l'email ;
- aucune session implicite pour un nouvel utilisateur ;
- `emailVerifiedAt` à l'acceptation ;
- mutations transactionnelles ;
- réautorisation dans la transaction ;
- audit ;
- rate limiting ;
- aucun token brut dans l'audit.

### Cycle de vie des membres

Endpoints :

```text
GET    /api/platform/team/members
PATCH  /api/platform/team/members/:memberId/role
PATCH  /api/platform/team/members/:memberId/suspend
PATCH  /api/platform/team/members/:memberId/reactivate
DELETE /api/platform/team/members/:memberId
```

Protections importantes : protection Fondateur, interdiction d'auto-altération sensible, stricte sous-puissance pour les acteurs ordinaires, protection du dernier Super administrateur actif, audit des mutations.

### Current Platform Context

```text
GET /api/platform/me
```

Cet endpoint est maintenant la source frontend du contexte Platform courant. Il utilise l'autorisation runtime backend et peut retourner `platformAccess: null` pour un utilisateur SaaS ordinaire.

### Rôles personnalisés — gouvernance durcie

Décisions désormais implémentées :

```text
Fondateur OU Super administrateur
→ créer / modifier / archiver un rôle personnalisé

Administrateur de la Plateforme et rôles inférieurs
→ jamais gouverner le catalogue de rôles
```

Un rôle personnalisé :

- reçoit une clé technique opaque générée uniquement par le backend ;
- exige une description / justification métier non vide ;
- utilise uniquement des permissions actives du registre ;
- ne reçoit jamais de permission RESERVED ;
- reste soumis à l'anti-escalade ;
- ne peut pas dupliquer exactement le jeu de permissions d'un autre rôle actif ;
- peut être archivé uniquement s'il n'est utilisé par aucun membre ACTIVE/SUSPENDED ;
- n'est jamais supprimé physiquement par le workflow normal.

Les tests backend ciblés `platformRole` ont été confirmés verts pendant le lot.

### Route legacy supprimée

La mutation historique suivante n'existe plus et ne doit jamais être restaurée :

```text
PATCH /api/platform/users/:id/role
```

---

## 7. D-018 frontend — état actuel

### Équipe de la Plateforme

Surface unique :

```text
Administration de la Plateforme
→ Équipe de la Plateforme
```

Routes :

```text
/platform/team/members
/platform/team/invitations
/platform/team/roles
```

Les onglets et actions sont filtrés par permissions runtime. Le backend reste l'autorité finale.

Les composants partagés restent obligatoires (`DataTable`, drawers partagés, confirmations, champs de formulaire, badges, actions).

### Membres

Disponible : consultation, pagination serveur, détail, modification du rôle, suspension, réactivation et révocation selon autorisation.

### Invitations

Disponible : liste, création, rôle prévu, resend, revoke, acceptance destinataire et informations temporelles dérivées uniquement des vrais timestamps backend.

Aucun historique de resend n'est inventé lorsque l'API ne l'expose pas.

### Rôles personnalisés

Le frontend respecte la gouvernance Fondateur / Super administrateur en plus des permissions techniques. Les rôles système restent en lecture seule.

### Navigation et autorité frontend — nettoyage legacy terminé

Décision centrale :

```text
User.platformRole
≠ autorité frontend

/platform/me → platformAccess
= source runtime de navigation et d'accès Platform
```

Le frontend possède maintenant une policy partagée :

```text
frontend/src/features/platform/lib/platform-navigation.js
```

Elle centralise :

- les sections de navigation Platform ;
- leur permission requise ;
- le calcul des sections visibles ;
- la détection d'un accès Platform actif ;
- la première destination Platform réellement autorisée.

Cette policy est utilisée par le Sidebar, les guards, l'acceptation d'invitation, le login, l'AccountLayout et l'entrée Workspace.

Conséquence importante : un rôle Platform qui n'a pas `overview:read` n'est plus artificiellement envoyé vers `/platform/overview`. Il est dirigé vers sa première route réellement autorisée.

### Reliquats legacy supprimés

Supprimés :

```text
updatePlatformUserRole
PATCH /platform/users/:id/role côté frontend
contrôle de rôle Platform dans le drawer User
ancienne constante frontend PLATFORM_ROLE
isPlatformSuperAdmin comme décision d'autorité frontend
fixtures de routing fondées sur User.platformRole
```

Le dernier build a révélé un consommateur transversal oublié dans `WorkspaceEntryPage`. Il a été corrigé pour utiliser `platformAccess` et `getFirstPlatformDestination()` ; son test a été aligné.

### Drawer utilisateur SaaS

Le drawer Platform d'un utilisateur SaaS gère le **compte User** : statut et sessions. Il ne mélange plus cette responsabilité avec l'appartenance à l'Équipe de la Plateforme.

Le texte explicatif technique devenu inutile a été retiré. Le titre `Actions d’administration` a été restauré dans le dernier commit.

---

## 8. Audit Metadata Contract — validé pendant D-018

Le vocabulaire Audit visible n'est plus maintenu dans des catalogues statiques parallèles côté React.

Principe :

```text
BACKEND = source canonique actions / ressources / statuts / labels
FRONTEND = présentation et filtres à partir des metadata API
```

Endpoints :

```text
GET /api/platform/audit-logs/metadata
GET /api/workspaces/:workspaceId/audit-logs/metadata
```

Le fallback frontend est neutre (`Action inconnue`, `Ressource inconnue`, `Statut inconnu`) et n'expose pas une pseudo-traduction construite depuis une valeur technique.

Les tests ciblés et le build associés à cette correction ont été confirmés verts pendant le lot.

---

## 9. État de validation D-018 au moment de la reprise

Plusieurs barrières ciblées ont été confirmées vertes au cours du lot :

```text
backend platformRole
frontend gouvernance rôles personnalisés
frontend invitations temporelles
frontend suppression mutation legacy User.platformRole
autorité/navigation frontend basée sur platformAccess
Audit Metadata
```

Le dernier défaut statique trouvé par le build (`WorkspaceEntryPage` utilisant encore `isPlatformSuperAdmin`) a été corrigé et testé.

L'utilisateur indique le frontend OK après le dernier push.

**Cependant D-018 ne doit pas être marqué VALIDÉ uniquement sur cette phrase.** Il reste une barrière de clôture explicite afin d'avoir une baseline reproductible finale après l'ensemble des modifications.

### Barrière finale D-018 à effectuer / consigner

Depuis la racine :

```bash
npx vitest run
```

Puis depuis `frontend/` :

```bash
npx vitest run
npm run build
```

Contrôles statiques utiles à rejouer :

```bash
git grep -n "platformRole" -- frontend/src
git grep -n "isPlatformSuperAdmin" -- frontend/src
```

Résultat attendu : aucune utilisation comme autorité frontend.

### Checklist manuelle D-018 minimale

Vérifier au minimum :

```text
Utilisateur SaaS ordinaire
→ /platform/me ne lui donne pas d'accès Platform
→ entrée Workspace normale

Membre Platform actif
→ redirection vers première destination autorisée

Membre Platform suspendu/révoqué
→ perte immédiate des permissions Platform

Fondateur
→ protections non contournables

Super administrateur
→ gouvernance rôles personnalisés autorisée

Administrateur de la Plateforme
→ ne peut pas gouverner le catalogue de rôles personnalisés

Invitation
→ create / resend / revoke / accept
→ aucune donnée temporelle inventée

Utilisateur Platform Users drawer
→ lifecycle User distinct de PlatformTeamMember
```

Après ces contrôles :

- mettre `docs/DEBT.md` à jour sur l'état réel de D-018 ;
- aligner le statut de `docs/contracts/PLATFORM-TEAM.md` sur l'implémentation réellement finalisée ;
- passer D-018 à `VALIDÉ` uniquement si code + tests + manuel + docs concordent.

---

## 10. D-019 — Moteur sécurisé de rétention et purge des données Core

### Décision déjà validée

Avant D-015, le registre de dette doit recevoir une nouvelle dette Core :

```text
D-019 — Moteur sécurisé de rétention et purge des données Core
```

Cette dette **n'est pas encore enregistrée dans `docs/DEBT.md` au moment de cette synthèse**. La prochaine conversation doit l'ajouter après la clôture D-018 et avant de commencer D-015.

### Pourquoi D-019 est distincte de D-006

`D-006` reste la dette de politique juridique / produit : quelles durées de conservation s'appliquent réellement à une application dérivée selon ses données, obligations, contrats et fournisseurs.

`D-019` concerne le mécanisme générique sécurisé permettant au Core d'appliquer une politique déjà configurée.

Invariant :

```text
D-006
→ décide quoi conserver, combien de temps, pourquoi

D-019
→ applique techniquement et de façon sécurisée une politique configurée
```

Il ne faut donc pas coder une durée juridique universelle dans le Core.

### Cible D-019 retenue

Le moteur devra être conçu avant implémentation avec priorité sécurité :

- policy de rétention validée et explicite ;
- éligibilité calculée côté backend ;
- aucun cutoff arbitraire fourni librement par un utilisateur ;
- aucune route générique permettant un `deleteMany` arbitraire ;
- autorité Platform fortement restreinte ;
- preview avant purge ;
- confirmation explicite ;
- traitement par lots ;
- audit durable indépendant du contenu purgé, par exemple `AuditPurgeRun` ;
- protection contre deux exécutions concurrentes ;
- scheduler compatible avec plusieurs instances ;
- stratégie `nextRunAt` + lock distribué MongoDB à privilégier avant d'introduire Redis uniquement pour ce besoin ;
- vérification des indexes existants avant ajout ;
- tests sécurité / concurrence / idempotence.

Périmètre V1 à privilégier : Platform-wide, simple, auditable et sans filtres libres par entité ou Workspace.

Les routes exactes ne sont pas encore contractuelles. Le cadrage pourra partir d'une API de type :

```text
GET   /platform/audit-retention
PATCH /platform/audit-retention
POST  /platform/audit-retention/preview
POST  /platform/audit-retention/purge
GET   /platform/audit-retention/runs
```

mais elles doivent être figées dans le contrat avant codage.

D-019 est considérée comme un **blocker Core 1.0** avant D-015.

---

## 11. D-015 — Versionnement, provenance, migrations et release

D-015 ne doit commencer qu'après D-018 et D-019.

À finaliser :

- SemVer appliqué réellement ;
- provenance Core machine-readable dans les dérivés ;
- tag Git ;
- release notes / changelog ;
- discipline de migrations ;
- ordre pre/post-deploy ;
- idempotence explicitée ;
- contrôles post-migration ;
- rollback lorsque nécessaire ;
- variables d'environnement ajoutées/modifiées documentées ;
- dépendances système documentées ;
- gate de tests reproductible ;
- décision sur runner individuel vs orchestrateur/registre de migrations ;
- procédure d'upgrade Core documentée.

Le but n'est pas uniquement d'écrire `1.0.0` dans `package.json`, mais de pouvoir distribuer et mettre à niveau le Core proprement.

---

## 12. D-016 — Playwright / E2E Core

Playwright reste un blocker Core 1.0.

La suite E2E doit couvrir les parcours transversaux critiques plutôt que dupliquer les tests unitaires :

```text
auth / session / refresh / logout
fermeture Account
création / accès Workspace
archivage Workspace
isolation tenant
RBAC Workspace
RBAC Platform
subscription / entitlement / quotas
administration Platform critique
File lorsque activé
principaux états interdits
```

La commande E2E devra intégrer la gate de release D-015.

---

## 13. Audit final architecture / sécurité / qualité

Après D-015 et D-016, effectuer une revue finale avant dérivation pilote :

- frontières frontend/backend ;
- séparation responsabilités routes/controllers/services/models ;
- validation Zod ;
- permissions et anti-escalade ;
- multi-tenant ;
- auth/session ;
- lifecycle ;
- audit ;
- quotas/concurrence ;
- jobs ;
- suppression de code legacy ;
- composants frontend partagés ;
- duplication ;
- configuration ;
- documentation canonique ;
- dettes Core encore ouvertes.

Aucun écart critique générique ne doit être repoussé vers le premier module métier uniquement pour accélérer la release.

---

## 14. D-017 — dérivation pilote et upgrade réel

D-017 est la preuve finale que le Core est réellement clonable et maintenable.

Exercice :

```text
release candidate Core
→ création d'un dépôt SaaS pilote avec historique/provenance
→ ajout d'un petit module métier représentatif
→ nouvelle évolution compatible du Core
→ nouvelle release candidate
→ upgrade du pilote depuis upstream Core
→ migrations/config éventuelles
→ tests Core + module + E2E
→ analyse des conflits
```

Ce pilote doit rester petit. Toute faiblesse générique révélée par l'exercice doit être corrigée dans le Core avant `v1.0.0`.

---

## 15. Après `v1.0.0` — vrai clone et modules métier

Une fois toutes les gates précédentes franchies :

```text
1. tag/release v1.0.0 du Core
2. création du dépôt du SaaS métier
3. conservation de l'historique / provenance Core
4. variables d'environnement propres au produit
5. cadrage fonctionnel du module métier AVANT codage
6. définition des permissions métier
7. définition des capabilities / quotas métier
8. définition des routes backend/frontend
9. composants réutilisables obligatoires
10. validation Zod et règles de sécurité
11. tests unitaires / intégration / E2E métier
12. exploitation des points d'extension D-014
```

Le modèle commercial du SaaS dérivé pourra être adapté au produit ; le Core fournit le moteur générique Plan / Subscription / entitlements, pas des prix universels imposés à tous les clones.

---

## 16. Composants frontend et règles de structure à préserver

Réutilisabilité obligatoire :

- `DataTable` ;
- `DataPagination` ;
- `DataTableActions` ;
- `EntityDetailsDrawer` ;
- `ConfirmationDialog` ;
- `ActionIconButton` ;
- `InfoTooltip` ;
- `SectionTabs` ;
- `SelectField` ;
- `CheckboxField` ;
- `Textarea` ;
- `InlineIconLink` ;
- `SmoothCollapse` ;
- `CollapsibleCard` ;
- `DistributionBarChart` ;
- composants de badge partagés lorsqu'une même sémantique est réutilisée.

Règle permanente :

```text
pages
→ assemblent

useState
→ état UI local

Redux Toolkit
→ vrai état client global

RTK Query
→ état serveur
```

Ne pas recréer un tableau, drawer, formulaire ou dialogue parallèle lorsqu'un composant partagé peut être composé.

---

## 17. Règles permanentes de sécurité

Invariant :

```text
ne jamais faire confiance au frontend
ne jamais faire dépendre la sécurité d'un bouton masqué
```

Backend = autorité sur :

- identité ;
- ownership ;
- membership ;
- permissions ;
- entitlements ;
- quotas ;
- lifecycle ;
- transitions sensibles ;
- purge/rétention ;
- vocabulaire backend constituant un contrat.

Validation Zod stricte obligatoire.

MongoDB :

- `sanitizeFilter` reste activé ;
- ne jamais le contourner ;
- les opérateurs Mongo internes utilisent la convention `mongoose.trusted()` du projet lorsque nécessaire.

Mutations sensibles : réautorisation dans la transaction si nécessaire, audit, fail-closed et aucune confiance dans une autorité JWT obsolète.

---

## 18. Conventions de tests

### Backend

Depuis la racine :

```bash
npx vitest run <tests ciblés>
```

Suite globale uniquement aux barrières de clôture :

```bash
npx vitest run
```

### Frontend

L'utilisateur entre dans :

```bash
cd frontend
```

Puis :

```bash
npx vitest run <tests ciblés>
```

Barrière globale :

```bash
npx vitest run
npm run build
```

Ne pas utiliser de commandes Bash avec continuation `\` sous Windows. Ne pas utiliser `npm --prefix frontend`.

---

## 19. Prochaine reprise exacte

La prochaine conversation doit commencer par **finir D-018, pas par lancer D-015 ni un module métier**.

Ordre conseillé :

```text
1. git pull et vérifier HEAD
2. vérifier que le dernier frontend est stable
3. exécuter/consigner la barrière globale D-018 backend + frontend + build
4. faire la checklist manuelle de sécurité D-018
5. mettre à jour docs/DEBT.md et docs/contracts/PLATFORM-TEAM.md
6. passer D-018 VALIDÉ si tout concorde
7. enregistrer D-019 dans docs/DEBT.md comme blocker Core 1.0
8. cadrer D-019 avant tout code
9. implémenter et valider D-019
10. seulement ensuite lancer D-015
11. D-016 Playwright
12. audit final
13. D-017 pilote clone + upgrade
14. release v1.0.0
15. clone du vrai SaaS et démarrage des modules métier
```

Ne pas effectuer plusieurs de ces blocs en parallèle : chaque gate doit être fermée avant la suivante.

---

## 20. Fichiers prioritaires pour la prochaine conversation

```text
docs/REPRISE-CURRENT.md
docs/DEBT.md
docs/contracts/PLATFORM-TEAM.md

backend/modules/platformTeam/*
backend/modules/platformRole/*
backend/modules/platformInvitation/*
backend/modules/platform/currentContext/*
backend/config/applicationPlatformPermission.registry.js
backend/modules/auditLog/*

frontend/src/features/platform/*
frontend/src/features/platform-invitation/*
frontend/src/features/auth/lib/authenticated-destination.js
frontend/src/features/auth/components/auth-guard.jsx
frontend/src/features/workspace/pages/workspace-entry-page.jsx
frontend/src/app/layouts/account-layout.jsx
frontend/src/components/data-display/data-table.jsx
frontend/src/components/shared/entity-details-drawer.jsx
```

---

## 21. Ce qu'il ne faut pas faire à la reprise

Ne pas :

- restaurer `PATCH /platform/users/:id/role` ;
- réintroduire `User.platformRole` comme autorité frontend ;
- coder la navigation par nom de rôle ;
- rendre les rôles système modifiables ;
- permettre la création libre de permissions depuis l'UI ;
- ajouter des permissions directement sur un User ;
- passer au multi-rôles sans besoin réel ;
- coder une durée légale universelle de rétention dans le Core ;
- exposer une purge générique avec cutoff ou filtre arbitraire ;
- commencer D-015 avant D-019 ;
- lancer les vrais modules métier dans le dépôt Core ;
- créer des composants frontend dupliqués ;
- déclarer `v1.0.0` avant D-015, D-016, l'audit final et D-017.

---

## 22. Résumé de reprise en une phrase

Le Core a terminé ses fondations génériques et D-018 est en toute fin de consolidation ; la prochaine conversation doit fermer formellement D-018, enregistrer puis réaliser le moteur sécurisé de rétention/purge D-019, traiter ensuite versionnement D-015, Playwright D-016, l'audit final et la dérivation pilote D-017, puis seulement publier `v1.0.0` et cloner le véritable SaaS destiné aux modules métier.
