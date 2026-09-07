# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il décrit l'état réel du travail afin de reprendre dans une nouvelle conversation. Il n'est pas normatif : en cas de contradiction, le code, les tests réellement validés et les contrats canoniques priment.
>
> **Dernière mise à jour : 2026-09-07**

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

Référence fonctionnelle immédiatement avant la présente mise à jour documentaire :

```text
1500ba04d9610b905901ac3a16ea67b078376959
docs: clarify platform admin role description
```

Ce commit modifie bien un preset backend malgré son préfixe `docs:` :

```text
backend/modules/platformRole/platformRole.presets.js
Administrateur de la Plateforme
→ description : « Administration courante étendue sur les opérations. »
```

La mise à jour de `REPRISE-CURRENT.md` crée nécessairement un commit supplémentaire. À la reprise, travailler depuis le HEAD courant après `git pull` plutôt que d'exiger un SHA exact.

---

## 2. Objectif final du Core

`saas-core-api` est un **socle SaaS générique clonable et maintenable**.

Le Core doit fournir les capacités transversales :

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
versionnement / migrations / upgrade
E2E Core
```

Les modules métier réels ne doivent pas être développés directement dans le dépôt Core.

Le produit dérivé doit conserver une filiation Git avec le Core afin de pouvoir recevoir ses futures corrections et versions.

---

## 3. Roadmap réelle jusqu'au clonage métier

Ordre figé :

```text
D-018  Équipe de la Plateforme / RBAC / invitations
→ D-019 moteur sécurisé de rétention / purge Core
→ D-015 versionnement / provenance / migrations / release
→ D-016 Playwright / E2E Core
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
→ release v1.0.0
→ clone du véritable SaaS métier
→ cadrage puis développement des modules métier
```

Point important :

```text
D-017
= petit clone pilote technique destiné à éprouver dérivation + upgrade

clone métier réel
= après validation du Core et release v1.0.0
```

Ne pas confondre ces deux étapes.

---

## 4. Points d'extension métier déjà validés — D-014

D-014 est `VALIDÉ`.

Points de composition disponibles :

```text
capabilities / relations feature → métriques
→ backend/config/applicationCapability.registry.js

permissions métier / extensions rôles système Workspace
→ backend/config/applicationRolePermission.registry.js

routes backend métier
→ backend/config/applicationRoutes.registry.js

routes frontend métier
→ frontend/src/app/application-routes.js

navigation Workspace métier
→ frontend/src/app/workspace-navigation.js
```

Les futurs modules métier doivent utiliser ces points d'extension au lieu de réécrire les longues listes centrales du Core.

Aucune autodécouverte filesystem ou architecture plugin implicite n'a été retenue.

---

## 5. Architecture D-018 figée

Modèle actif :

```text
User
→ identité / authentification globale

PlatformTeamMember
→ appartenance à l'équipe interne de la Plateforme

PlatformRole
→ rôle système ou personnalisé

PlatformPermission
→ autorité administrative effective

PlatformInvitation
→ invitation interne sécurisée

Fondateur
→ qualité historique protégée, distincte du rôle RBAC
```

Invariants :

```text
exactement un Fondateur actif
Fondateur → toujours Super administrateur
Super administrateur → pas nécessairement Fondateur
Administrateur de la Plateforme → rôle distinct du Super administrateur
1 PlatformTeamMember → 1 PlatformRole
permissions → dérivées du rôle et de l'état DB courant
RBAC Platform ≠ RBAC Workspace
```

Le Fondateur ne peut pas être rétrogradé, suspendu, révoqué ou fermé via l'administration ordinaire.

Plusieurs Super administrateurs sont possibles, mais le dernier Super administrateur actif est protégé.

L'autorisation Platform sensible est résolue depuis MongoDB à chaque requête utile via `resolvePlatformAuthorization()` ; une suspension ou révocation prend donc effet sans attendre l'expiration du JWT.

`User.platformRole` reste uniquement un fallback backend de compatibilité historique très limité. Il ne doit plus être une autorité frontend.

---

## 6. D-018 — backend implémenté

### Platform Team / rôles / permissions

Implémenté :

- `PlatformTeamMember` ;
- `PlatformRole` ;
- rôles système immuables depuis l'administration courante ;
- rôles personnalisés ;
- registre de permissions Platform code-owned ;
- niveaux de sensibilité ;
- anti-escalade ;
- gouvernance Fondateur / Super administrateur ;
- interdiction des permissions RESERVED dans les rôles personnalisés ;
- interdiction du clone exact d'un rôle actif ;
- archivage d'un rôle custom interdit lorsqu'il est encore assigné à un membre actif ou suspendu ;
- protection du Fondateur ;
- protection du dernier Super administrateur actif ;
- audit transactionnel des opérations critiques.

### Platform Invitations

Implémenté :

- modèle distinct des invitations Workspace ;
- token aléatoire ;
- stockage SHA-256 uniquement ;
- expiration ;
- resend avec rotation du secret ;
- revoke ;
- accept-existing ;
- accept-new ;
- contrôle de l'email ;
- aucune session implicite lors d'une acceptation new-user ;
- revalidation de l'autorité de l'invitant au moment de l'acceptation ;
- audit ;
- rate limiting ;
- aucun token brut exposé dans les réponses administratives ou l'audit.

### Correctif transactionnel MongoDB Atlas

Un test manuel d'envoi d'invitation avait révélé :

```text
Only servers in a sharded cluster can start a new transaction at the active transaction number
```

Cause : plusieurs lectures concurrentes via `Promise.all()` partageaient la même session transactionnelle MongoDB.

Correctif validé conceptuellement et par tests : sérialisation des lectures transactionnelles dans :

```text
création d'invitation
renvoi d'invitation
acceptation d'invitation
```

Les transactions ont été conservées. Les `Promise.all()` restant dans les services adjacents concernent des lectures hors transaction.

---

## 7. Séparation « Utilisateurs clients » / « Équipe Platform »

Une confusion UX et fonctionnelle a été corrigée : un membre interne Platform n'est pas automatiquement un utilisateur client.

Règle positive retenue :

```text
Utilisateur client
= User possédant au moins un WorkspaceMember courant
  avec status active ou suspended
```

Un `WorkspaceMember` `removed` est historique et n'entre pas dans la population client courante.

Un utilisateur hybride peut être à la fois :

```text
membre Platform interne
+
utilisateur client d'un Workspace
```

Dans ce cas il apparaît légitimement dans les deux vues.

Backend :

```text
backend/modules/platform/users/services/listPlatformUsers.service.js
```

La liste utilise un agrégat MongoDB avec lookup `WorkspaceMember`, filtre avant pagination et compte chaque `User` une seule fois même s'il appartient à plusieurs Workspaces.

Frontend : la page est désormais libellée **« Utilisateurs clients »**. Le statut affiché dans cette vue reste le statut global `User` ; le statut de l'équipe Platform appartient à `PlatformTeamMember`.

Ce mini-lot a été confirmé vert et visuellement conforme par l'utilisateur avant les tout derniers changements de drawer membres.

---

## 8. Synchronisation runtime des permissions Platform côté frontend

Un défaut UX avait été découvert lors d'une révocation :

```text
backend → 403 correct
frontend → navigation Platform encore visible avec ancien platformAccess en cache
```

Le correctif implémenté :

- policy de route Platform centralisée ;
- `PlatformGuard` vérifie la permission de la route courante ;
- middleware Redux/RTK Query détecte un `403` sur `/platform/...` ;
- invalidation du tag `CurrentPlatformContext` ;
- refetch de `/api/platform/me` ;
- redirection vers la première route Platform encore autorisée ou `/workspaces`.

Pas de polling ni websocket ajouté.

Conséquence assumée : un membre révoqué mais totalement inactif dans l'interface ne reçoit pas une notification push instantanée. Au prochain appel Platform, l'autorité est recalculée et l'UI se réaligne.

Ce correctif a été confirmé vert et visuellement conforme par l'utilisateur.

---

## 9. D-018 — frontend Platform Team actuel

Routes UI :

```text
/platform/team/members
/platform/team/invitations
/platform/team/roles
```

Composants réutilisables obligatoires conservés :

```text
DataTable
DataPagination
DataTableActions
EntityDetailsDrawer
ConfirmationDialog
ActionIconButton
SelectField
badges partagés
```

### 9.1 Tableau Membres : lecture uniquement

Décision UX finale :

```text
Tableau Membres
→ colonne Actions
→ uniquement l'action « Voir » avec icône Eye
```

Les mutations administratives ont été retirées du tableau.

Objectif : le tableau sert au repérage et à l'accès au détail ; il ne devient pas une barre d'administration dense et difficile à maintenir.

Fichier principal :

```text
frontend/src/features/platform/components/platform-team-members-section.jsx
```

Le tableau continue d'utiliser le `DataTable` partagé.

### 9.2 Drawer de détail d'un membre Platform

Nouveau composant métier :

```text
frontend/src/features/platform/components/platform-team-member-details-drawer.jsx
```

Il **réutilise** le composant partagé :

```text
frontend/src/components/shared/entity-details-drawer.jsx
```

Aucune nouvelle mécanique de drawer n'a été dupliquée.

Contenu actuel :

```text
Identité
- Nom
- Email
- Statut global du compte User

Accès à la Plateforme
- Qualité : Fondateur / Membre plateforme
- Rôle
- Description du rôle
- Statut d'accès Platform

Cycle de vie
- Membre depuis
- Suspendu le, seulement si une date existe
- Révoqué le, seulement si une date existe
- Créé le
- Mis à jour le
```

La liste courante ne renvoie que les membres `active` ou `suspended` ; les lignes de cycle de vie non pertinentes ne sont donc pas affichées artificiellement avec `—`.

### 9.3 Actions d'administration centralisées dans le drawer

Décision UX finale :

```text
Tableau
→ Voir uniquement

Drawer
→ section « Actions d’administration » tout en bas
```

Selon les permissions et l'état du membre :

```text
membre actif administrable
→ Modifier le rôle
→ Suspendre
→ Révoquer

membre suspendu administrable
→ Modifier le rôle
→ Réactiver
→ Révoquer
```

`Révoquer` utilise la variante destructive.

Les boutons affichent icône + texte, car il s'agit d'actions sensibles et l'espace du drawer permet un libellé explicite.

La section entière disparaît si aucune action n'est autorisée. Le Fondateur reste consultable via `Voir`, mais aucune section d'administration vide ou action interdite n'est affichée.

La logique existante est réutilisée :

```text
canActorTargetPlatformMember()
getAssignablePlatformRoles()
permissions provenant de platformAccess
mutations RTK Query existantes
ConfirmationDialog partagé
```

La sécurité reste backend-first : le masquage frontend n'est jamais considéré comme une barrière d'autorisation.

### 9.4 Synchronisation du drawer avec RTK Query

Le composant conserve `selectedMemberId` plutôt qu'une copie durable du membre sélectionné.

Le membre affiché est retrouvé dans les données courantes de la requête de liste. Après modification de rôle, suspension ou réactivation, le drawer peut donc se réaligner avec les données rafraîchies par les invalidations RTK Query.

Après révocation, le drawer est fermé car le membre sort de la population active/suspendue.

### 9.5 Commits UI récents de référence

```text
8ac0b17b1d737c3817a9eb35c49e6978c7134dcd
refactor: keep platform member table read-only

1b5a75c3e9fb40015c7ab0098ea1a8cd46761a75
test: cover platform member drawer admin actions

bdea246f8b7f710620154c3ec72f317bf9532497
test: enforce read-only platform member table
```

Des commits précédents du même mini-lot ont introduit puis raffiné le drawer et ses tests.

---

## 10. Presets des rôles système Platform et synchronisation MongoDB

Fichier canonique des presets :

```text
backend/modules/platformRole/platformRole.presets.js
```

Rôles système actuels :

```text
Super administrateur
Administrateur de la Plateforme
Support technique
Support commercial
Support client
```

Distinction importante :

```text
Administrateur de la Plateforme
≠ Super administrateur
```

Le Fondateur possède la qualité protégée `isFounder=true` et le rôle `super_admin`.

Le texte du rôle `platform_admin` a été ajusté au commit `1500ba04...` :

```text
Administration courante étendue sur les opérations.
```

Modifier le preset ne change pas immédiatement le document déjà persisté en MongoDB.

Le mécanisme prévu pour resynchroniser les rôles système est :

```bash
npm run seed:platform-roles
```

qui exécute :

```text
backend/seeds/seedPlatformRoles.js
```

Ce seed synchronise uniquement les rôles système et met à jour notamment :

```text
name
description
permissions
status
```

Les rôles personnalisés ne sont pas modifiés par ce seed.

Ne pas éditer manuellement MongoDB pour ce type d'évolution normale de preset.

### Point RBAC à ne pas oublier avant clôture D-018

Le preset `Administrateur de la Plateforme` possède actuellement notamment :

```text
platform:roles:create
platform:roles:update
platform:roles:archive
```

mais la policy métier `assertCanGovernCustomPlatformRoles()` réserve la gouvernance des rôles personnalisés au Fondateur ou au Super administrateur.

Ce décalage a été identifié pendant la conversation. Il n'a **pas** encore été modifié.

Avant de clôturer D-018, décider explicitement si :

```text
A. ces permissions sont retirées du preset Platform Admin
   pour aligner le RBAC sur la capacité réellement utilisable

ou

B. elles restent volontairement comme première barrière de permission,
   avec une policy de gouvernance plus restrictive en défense en profondeur
```

Ne pas changer cette politique implicitement.

---

## 11. État réel des tests automatisés

### Baseline confirmée

Après les mini-lots de synchronisation Platform runtime et de séparation Utilisateurs clients / équipe Platform, l'utilisateur a confirmé :

```text
tout est vert
visuellement conforme
```

### Derniers changements non encore revalidés explicitement dans la conversation

Après cette confirmation, plusieurs commits frontend ont ajouté :

- drawer de détail membre ;
- cycle de vie ;
- action Eye ;
- centralisation des mutations dans `Actions d’administration` ;
- tableau membres rendu strictement consultatif.

Aucune confirmation utilisateur explicite d'une exécution des tests **après le dernier commit `bdea246...`** n'a encore été consignée.

D-018 ne doit donc pas être marqué `VALIDÉ`.

### Tests prioritaires à lancer à la reprise

Depuis `frontend/` :

```bash
npx vitest run src/features/platform/components/platform-team-member-details-drawer.test.jsx src/features/platform/components/platform-team-members-section.test.jsx
```

Puis si vert :

```bash
npx vitest run
npm run build
```

Comme les derniers mini-lots sont frontend-only, aucun changement backend n'a été nécessaire pour le drawer. La baseline backend D-018 reste néanmoins à garder verte avant clôture formelle.

Avant validation finale D-018, exécuter depuis la racine :

```bash
npx vitest run backend/tests/platformInvitation
npx vitest run
```

Contrôles legacy utiles :

```bash
git grep -n "platformRole" -- frontend/src
git grep -n "isPlatformSuperAdmin" -- frontend/src
```

Un résultat textuel n'est pas automatiquement une erreur : vérifier qu'aucune occurrence ne sert encore de **source d'autorité frontend**.

---

## 12. Gate manuel D-018 — état précis

### Déjà validé

#### Invitation réelle

Le flux réel a déjà fonctionné après le correctif transactionnel :

```text
create invitation
→ livraison
→ acceptation
→ création/connexion du nouvel utilisateur
→ visibilité Platform selon rôle
```

#### Suspension runtime

Test manuel validé :

```text
membre Platform connecté
→ Fondateur suspend le membre depuis une autre session
→ requête Platform suivante : accès perdu
→ User global reste actif
```

#### Révocation runtime / synchronisation frontend

Backend : révocation prise en compte immédiatement sur la requête Platform suivante, sans fallback legacy réactivant les droits.

Le défaut de cache frontend découvert à cette occasion a été corrigé via invalidation/refetch de `platformAccess`, puis confirmé visuellement conforme.

#### Protection du Fondateur par HTTP direct

Test Postman avec le vrai `PlatformTeamMember.id` du Fondateur :

```text
PATCH /api/platform/team/members/:memberId/suspend
→ 403

DELETE /api/platform/team/members/:memberId
→ 403

PATCH /api/platform/team/members/:memberId/role
→ 403
```

L'utilisateur a confirmé les trois `403`.

Important : les routes attendent le **top-level `PlatformTeamMember.id`**, pas `user.id`.

### Gate actuellement interrompu / à reprendre exactement ici

Le test suivant visait la gouvernance des rôles personnalisés.

Un `POST /api/platform/team/roles` a renvoyé `403` avec un compte que l'utilisateur pensait être **Super administrateur**.

Ce résultat n'est pas normal si le compte est réellement :

```text
PlatformTeamMember actif
+
PlatformRole.key === super_admin
```

La policy backend autorise explicitement le Fondateur et le Super administrateur à gouverner les rôles personnalisés.

La prochaine conversation doit donc reprendre par le diagnostic suivant avec **la même session / le même compte qui produit le 403** :

```http
GET /api/platform/me
```

Vérifier :

```text
status
source d'autorité
role.key
permissions
notamment platform:roles:create
```

Puis regarder le body exact du `403` du `POST /api/platform/team/roles` :

```text
« Accès plateforme non autorisé »
→ blocage permission/runtime

« Seuls le Fondateur ou un Super administrateur peuvent administrer les rôles personnalisés. »
→ le resolver/policy ne reconnaît pas le compte comme SuperAdmin
```

Ne pas confondre :

```text
Administrateur de la Plateforme
→ platform_admin

Super administrateur
→ super_admin
```

### Gates sensibles encore à terminer

Après résolution du point précédent :

```text
Administrateur de la Plateforme non SuperAdmin
→ gouvernance rôle personnalisé refusée côté backend

Rôle personnalisé
→ permission RESERVED refusée
→ clone exact d'un rôle actif refusé
→ archivage tant qu'assigné à active/suspended refusé

Invitation
→ ancien token après resend inutilisable
→ invitation révoquée inutilisable
→ aucun token brut dans listing/réponse admin/audit
```

Un utilisateur SaaS ordinaire doit également conserver :

```text
GET /api/platform/me sans accès Platform effectif
navigation Workspace normale
```

Les scénarios sensibles doivent être testés par HTTP direct. Un bouton masqué ne prouve jamais la sécurité.

---

## 13. Documentation D-018 encore à aligner après les gates

`docs/DEBT.md` et `docs/contracts/PLATFORM-TEAM.md` ne doivent pas être finalisés prématurément.

État attendu tant que les gates précédents restent ouverts :

```text
D-018 = EN COURS
```

Ne passer D-018 à `VALIDÉ` qu'après :

```text
HEAD courant testé
+
build frontend vert
+
gates manuels sécurité conformes
+
décision explicite sur la cohérence des permissions Platform Admin
+
documentation canonique alignée
```

À ce moment seulement :

1. aligner `docs/DEBT.md` ;
2. aligner `docs/contracts/PLATFORM-TEAM.md` ;
3. passer D-018 à `VALIDÉ` ;
4. rafraîchir `REPRISE-CURRENT.md` ;
5. enregistrer/cadrer D-019.

---

## 14. D-019 — prochaine dette Core avant D-015

Après clôture D-018, enregistrer formellement dans `docs/DEBT.md` :

```text
D-019 — Moteur sécurisé de rétention et purge des données Core
```

D-019 n'est pas D-006.

```text
D-006
→ politique juridique / produit : quoi conserver, combien de temps et pourquoi

D-019
→ moteur générique sécurisé appliquant une policy déjà configurée
```

Cible de cadrage avant code :

- policy de rétention explicite ;
- éligibilité calculée backend ;
- aucun cutoff arbitraire fourni par le client ;
- aucune route de suppression générique ;
- autorité Platform fortement restreinte ;
- preview avant purge ;
- confirmation explicite ;
- traitement par lots ;
- audit durable indépendant du contenu purgé ;
- protection contre deux exécutions concurrentes ;
- scheduler compatible multi-instance ;
- lock distribué MongoDB privilégié avant Redis si suffisant ;
- indexes vérifiés ;
- tests sécurité / concurrence / idempotence.

D-019 doit être cadrée et documentée **avant d'écrire son code**.

---

## 15. D-015, D-016, audit final et D-017

### D-015

Versionnement / provenance / migrations / release :

- SemVer ;
- tags ;
- release notes ;
- changelog si retenu ;
- migrations et ordre pre/post-deploy ;
- idempotence ;
- rollback ;
- variables d'environnement ;
- dépendances système ;
- provenance Core machine-readable dans les produits dérivés ;
- procédure d'upgrade.

### D-016

Playwright / E2E Core :

```text
auth/session
Account lifecycle
Workspace lifecycle
isolation tenant
RBAC Workspace
RBAC Platform
subscriptions / entitlements / quotas
administration Platform critique
File si capability active
états interdits
```

### Audit final

Revue architecture / sécurité / qualité avant dérivation pilote.

### D-017

Exercice pilote obligatoire :

```text
release candidate Core
→ clone pilote avec historique Git
→ petit module métier représentatif
→ évolution compatible du Core
→ nouvelle release candidate
→ upgrade depuis upstream-core
→ tests Core + métier + E2E
→ analyse des conflits
```

Toute faiblesse générique découverte doit revenir dans le Core avant `v1.0.0`.

---

## 16. Stratégie canonique de clonage du vrai SaaS métier

Références :

```text
docs/derived-saas/DERIVED-SAAS.md
docs/derived-saas/EXTENSION-POINTS.md
```

Méthode canonique : conserver l'historique Git du Core.

Exemple conceptuel après release stable :

```bash
git clone <URL_SAAS_CORE_API> <nom-du-produit>
cd <nom-du-produit>

git remote rename origin upstream-core
git remote add origin <URL_NOUVEAU_DEPOT_PRODUIT>

git push -u origin main
```

Résultat :

```text
origin
→ dépôt du SaaS métier

upstream-core
→ dépôt maître saas-core-api
```

Le nom réel du nouveau dépôt sera fourni explicitement au moment du clonage.

Variables d'environnement, secrets, base de données et configuration produit doivent être séparés du Core.

---

## 17. Règles permanentes pour les futurs modules métier

### Backend

Structure cible :

```text
backend/modules/<domaine>/
├── routes
├── controller
├── service
├── model
├── validation
└── tests
```

Règles :

- JavaScript uniquement ;
- Zod strict ;
- logique métier dans les services ;
- isolation Workspace ;
- RBAC ;
- entitlement / quotas si nécessaire ;
- audit ;
- transactions lorsque l'invariant l'exige ;
- soft delete si pertinent ;
- aucune logique métier lourde dans routes/controllers.

### Frontend

Structure cible :

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
useState
→ état UI local

Redux Toolkit
→ état client global réel

RTK Query
→ état serveur
```

Réutilisation obligatoire des composants partagés existants. Ne jamais créer un second DataTable, système de toast, drawer générique, confirmation générique ou stratégie RTK Query parallèle.

Avant chaque module métier :

1. cadrage fonctionnel ;
2. règles métier ;
3. rôles et permissions ;
4. capabilities / quotas ;
5. sécurité et validation ;
6. composants réutilisables ;
7. routes / contrats API ;
8. tests ;
9. checklist manuelle ;
10. seulement ensuite implémentation.

---

## 18. Sécurité permanente

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

`sanitizeFilter` reste activé. Les opérateurs MongoDB internes construits par le serveur utilisent `mongoose.trusted()` lorsque nécessaire ; ne jamais neutraliser globalement la protection.

Mutations sensibles : réautorisation transactionnelle lorsque nécessaire, audit, fail-closed, aucune confiance dans une autorité JWT potentiellement obsolète.

---

## 19. Prochaine reprise exacte

La prochaine conversation doit reprendre **D-018**, sans passer à D-019 ni à un module métier.

Ordre recommandé :

```text
1. git pull
2. vérifier le HEAD courant
3. depuis frontend : lancer les 2 tests ciblés drawer/membres
4. frontend global : npx vitest run
5. build : npm run build
6. si nécessaire, npm run seed:platform-roles pour resynchroniser les presets système
7. reprendre le 403 du compte supposé SuperAdmin
8. avec la même session : GET /api/platform/me
9. identifier role.key / status / permissions / source d'autorité
10. rejouer POST /api/platform/team/roles et lire le body exact du 403
11. distinguer SuperAdmin réel de Platform Admin
12. décider explicitement du sort des permissions roles:create/update/archive du preset Platform Admin
13. tester le refus de gouvernance par un Platform Admin non-SuperAdmin
14. tester RESERVED
15. tester clone exact
16. tester archivage rôle assigné
17. terminer ancien token resend / invitation révoquée / absence token brut
18. backend ciblé PlatformInvitation
19. backend global
20. aligner DEBT.md + PLATFORM-TEAM.md si tout est vert
21. passer D-018 VALIDÉ uniquement à ce moment
22. cadrer D-019 avant code
```

Ne pas exécuter plusieurs gates sensibles en parallèle.

---

## 20. Fichiers prioritaires à la prochaine conversation

```text
docs/REPRISE-CURRENT.md
docs/DEBT.md
docs/contracts/PLATFORM-TEAM.md

backend/modules/platformTeam/platformAuthorization.service.js
backend/modules/platformTeam/platformTeam.service.js
backend/modules/platformTeam/platformTeam.routes.js
backend/modules/platformRole/platformRole.policy.js
backend/modules/platformRole/platformRole.service.js
backend/modules/platformRole/platformRole.routes.js
backend/modules/platformRole/platformRole.presets.js
backend/seeds/seedPlatformRoles.js
backend/modules/platformInvitation/*

frontend/src/features/platform/components/platform-team-members-section.jsx
frontend/src/features/platform/components/platform-team-members-section.test.jsx
frontend/src/features/platform/components/platform-team-member-details-drawer.jsx
frontend/src/features/platform/components/platform-team-member-details-drawer.test.jsx
frontend/src/features/platform/components/platform-team-member-read-columns.jsx
frontend/src/features/platform/lib/platform-team-authorization.js
frontend/src/features/platform/lib/platform-navigation.js
frontend/src/features/platform/store/platform-access-sync-middleware.js
frontend/src/components/shared/entity-details-drawer.jsx
frontend/src/components/data-display/data-table.jsx
```

---

## 21. Ce qu'il ne faut pas faire

Ne pas :

- restaurer `PATCH /platform/users/:id/role` ;
- réintroduire `User.platformRole` comme autorité frontend ;
- confondre `User.id` et `PlatformTeamMember.id` ;
- confondre `platform_admin` et `super_admin` ;
- coder la navigation par nom de rôle ;
- rendre les rôles système modifiables depuis l'administration courante ;
- créer librement des permissions depuis l'UI ;
- ajouter des permissions directement sur un User ;
- modifier manuellement MongoDB pour synchroniser un preset système normal : utiliser le seed prévu ;
- supprimer les transactions pour contourner une erreur MongoDB ;
- utiliser `Promise.all()` pour des opérations partageant la même session transactionnelle ;
- remettre les mutations membres directement dans le DataTable ;
- dupliquer `EntityDetailsDrawer` ou `DataTable` ;
- coder une durée juridique universelle de rétention dans le Core ;
- exposer une purge générique avec cutoff ou filtre arbitraire ;
- commencer D-015 avant D-019 ;
- lancer les modules métier réels dans le dépôt Core ;
- déclarer `v1.0.0` avant les gates D-015, D-016, audit final et D-017.

---

## 22. Résumé de reprise en une phrase

D-018 est très avancée : les invitations, le RBAC Platform runtime, la séparation Utilisateurs clients / équipe interne, la protection du Fondateur et la synchronisation frontend des révocations sont en place ; le tableau Membres est désormais consultatif et ouvre un drawer réutilisable contenant le cycle de vie et les actions d'administration, mais les tout derniers tests frontend doivent être rejoués et le prochain gate doit reprendre exactement sur le `403` obtenu avec un compte supposé SuperAdmin afin de vérifier son autorité réelle via `/api/platform/me`, clarifier la cohérence du preset `platform_admin`, terminer les derniers scénarios sécurité puis seulement clôturer D-018 avant de cadrer D-019.