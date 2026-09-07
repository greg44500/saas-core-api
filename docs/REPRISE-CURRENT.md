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

HEAD connu au moment de cette synthèse :

```text
14cad2399712fba579e391c6f26fec5bd923b1cc
test: align platform invitation tooltip labels
```

Commit utilisateur immédiatement précédent :

```text
04ada82ceaa919afca2697a7435b5a52604c4ee4
fix: shorten platform invitation tooltips
```

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

Ordre actuellement figé :

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
→ identité / authentification

PlatformTeamMember
→ appartenance à l'équipe interne

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
- rôles système immuables ;
- rôles personnalisés ;
- registre de permissions Platform code-owned ;
- niveaux de sensibilité ;
- anti-escalade ;
- gouvernance Fondateur / Super administrateur ;
- interdiction des permissions RESERVED dans les rôles personnalisés ;
- interdiction du clone exact d'un rôle actif ;
- archivage d'un rôle custom interdit lorsqu'il est encore assigné ;
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

### Correctif transactionnel découvert pendant le gate manuel

Un test manuel d'envoi d'invitation avec MongoDB Atlas a révélé l'erreur runtime :

```text
Only servers in a sharded cluster can start a new transaction at the active transaction number
```

La cause identifiée dans le code D-018 était l'utilisation de `Promise.all()` avec plusieurs requêtes partageant **la même session MongoDB transactionnelle**.

Le correctif a sérialisé les lectures dans :

```text
création d'invitation
renvoi d'invitation
acceptation d'invitation
```

Les transactions ont été conservées ; aucune sécurité transactionnelle n'a été supprimée.

Tests de régression ajoutés pour protéger l'ordre séquentiel des opérations.

Services Platform adjacents audités : les `Promise.all()` restant autorisés concernent des lectures hors transaction.

---

## 7. D-018 — frontend implémenté

### Autorité et navigation

Source runtime :

```text
GET /api/platform/me
→ platformAccess
```

Le frontend ne doit pas décider l'accès Platform à partir de `User.platformRole`.

La policy partagée :

```text
frontend/src/features/platform/lib/platform-navigation.js
```

centralise les destinations visibles et la première route réellement autorisée.

Un rôle sans `platform:overview:read` n'est pas forcé vers `/platform/overview`.

### Équipe de la Plateforme

Routes UI :

```text
/platform/team/members
/platform/team/invitations
/platform/team/roles
```

Composants réutilisables obligatoires conservés : `DataTable`, `DataPagination`, `DataTableActions`, drawers partagés, confirmations, boutons d'action, formulaires et badges.

### Ajustements UX du 2026-09-07

#### Colonne « Qualité »

Le rendu est dérivé des vraies données :

```text
member.isFounder === true
→ Fondateur

member.isFounder === false
→ Membre plateforme
```

Il n'existe pas de liste métier statique de qualités.

Le rendu est centralisé dans :

```text
frontend/src/features/platform/components/platform-team-member-read-columns.jsx
```

Les largeurs compactes ont été rééquilibrées afin de préserver le drawer de détail de l'équipe.

#### Drawer User courant

Dans :

```text
frontend/src/features/platform/components/platform-user-details-drawer.jsx
```

lorsque `user.id === currentUserId`, la section complète `Actions d’administration` n'est plus rendue.

Le frontend ne se contente donc plus de masquer les boutons en laissant un bloc et un texte inutiles.

Pour un autre User administrable, la section reste disponible selon le workflow existant.

#### Tableau des invitations

Le tableau réutilise toujours `DataTable` mais utilise les options existantes de composition :

```text
density="compact"
scrollable={false}
tableClassName="table-fixed"
```

Les colonnes sont contraintes et les contenus longs peuvent se replier proprement afin d'éviter le scroll horizontal en vue desktop normale.

Aucune variante de DataTable parallèle n'a été créée.

#### Tooltips invitations

Choix final utilisateur :

```text
Renvoyer
Révoquer
```

Les `aria-label` accessibles restent détaillés et contextualisés avec le destinataire.

Le test UX a été réaligné au commit `14cad239...` après le commit utilisateur `04ada82c...`.

---

## 8. État réel de validation D-018

### Baseline confirmée avant les derniers correctifs

L'utilisateur a confirmé auparavant :

```text
tests globaux backend/frontend verts
build frontend OK
```

Cette confirmation était antérieure :

- au correctif transactionnel PlatformInvitation ;
- aux derniers ajustements UI du 2026-09-07 ;
- au dernier alignement du test des tooltips.

### Important

**Il n'existe pas encore dans cette conversation de confirmation utilisateur d'une baseline globale exécutée sur le HEAD actuel `14cad239...`.**

D-018 ne doit donc pas être marqué `VALIDÉ` à partir des anciennes exécutions.

### Tests à reprendre au prochain démarrage

Depuis la racine :

```bash
npx vitest run backend/tests/platformInvitation
```

Puis :

```bash
npx vitest run
```

Depuis `frontend/` :

```bash
npx vitest run src/features/platform/components/platform-team-member-read-columns.test.jsx
npx vitest run src/features/platform/components/platform-user-details-drawer.test.jsx
npx vitest run src/features/platform/components/platform-team-invitations-section.test.jsx
npx vitest run src/features/platform/components/platform-team-invitations-ux.test.jsx
npx vitest run src/features/platform/components/platform-team-members-section.test.jsx
```

Puis :

```bash
npx vitest run
npm run build
```

Contrôles legacy utiles :

```bash
git grep -n "platformRole" -- frontend/src
git grep -n "isPlatformSuperAdmin" -- frontend/src
```

Un résultat textuel n'est pas automatiquement une erreur : vérifier qu'aucune occurrence ne sert encore de **source d'autorité frontend**.

---

## 9. Gate manuel D-018 restant

Un utilisateur SaaS ordinaire a déjà été observé comme incapable de rester sur une route frontend Platform et renvoyé vers l'application normale.

Attention :

```text
/platform/me
= n'est pas une route React

/api/platform/me
= endpoint backend à vérifier
```

Le test manuel d'invitation avait échoué avant le correctif transactionnel. Il doit être rejoué après récupération du HEAD courant et redémarrage du backend.

Checklist minimale encore à valider / consigner :

```text
Utilisateur SaaS ordinaire
→ GET /api/platform/me sans accès Platform effectif
→ navigation Workspace normale

Membre Platform actif
→ uniquement les sections autorisées

Membre suspendu puis connecté
→ perte des permissions Platform à la requête suivante
→ User global reste actif

Membre révoqué
→ perte des permissions Platform
→ pas de fallback legacy réactivant les droits

Fondateur
→ tentative API directe suspend/revoke/change-role refusée

Administrateur de la Plateforme non SuperAdmin
→ gouvernance rôles personnalisés refusée côté backend

Rôle personnalisé
→ RESERVED refusée
→ clone exact refusé
→ archivage pendant affectation refusé

Invitation
→ create / resend / revoke / accept
→ ancien token de resend inutilisable
→ invitation révoquée inutilisable
→ aucun token brut dans listing/réponse admin
```

Les scénarios sensibles doivent inclure des tentatives HTTP directes ; masquer un bouton n'est jamais une barrière de sécurité.

---

## 10. Documentation D-018 encore à aligner après le gate

`docs/DEBT.md` et `docs/contracts/PLATFORM-TEAM.md` ne reflètent pas encore totalement l'état d'implémentation actuel.

Exemples connus :

```text
DEBT.md
→ D-018 encore EN COURS
→ ancien découpage A3/A4/A5/A6 encore marqué À FAIRE

PLATFORM-TEAM.md
→ statut encore « implémentation avancée »
→ découpage final encore partiellement provisoire
```

Ne pas les passer artificiellement à `VALIDÉ` avant :

```text
HEAD courant testé
+
gate manuel sécurité conforme
+
documentation alignée
```

Une fois ces trois conditions réunies :

1. aligner `docs/DEBT.md` ;
2. aligner `docs/contracts/PLATFORM-TEAM.md` ;
3. passer D-018 à `VALIDÉ` ;
4. conserver `REPRISE-CURRENT.md` comme synthèse temporaire actualisée.

---

## 11. D-019 — prochaine dette Core avant D-015

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

## 12. D-015, D-016, audit final et D-017

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

## 13. Stratégie canonique de clonage du vrai SaaS métier

Référence :

```text
docs/derived-saas/DERIVED-SAAS.md
docs/derived-saas/EXTENSION-POINTS.md
```

Le clone destiné à être maintenu ne doit pas être créé comme simple GitHub Template indépendant.

Méthode canonique : **conserver l'historique Git du Core**.

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

## 14. Règles pour les futurs modules métier

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

Règles permanentes :

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

## 15. Sécurité permanente

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

## 16. Prochaine reprise exacte

La prochaine conversation doit commencer par **revalider puis clôturer D-018**, pas par coder immédiatement un module métier réel.

Ordre :

```text
1. git pull
2. vérifier HEAD attendu : 14cad2399712fba579e391c6f26fec5bd923b1cc
3. tests ciblés PlatformInvitation backend
4. tests backend globaux
5. tests frontend ciblés D-018/UI
6. tests frontend globaux
7. build Vite
8. redémarrer backend
9. rejouer invitation réelle via environnement de test/Mailtrap
10. terminer le gate manuel sécurité D-018
11. aligner DEBT.md + PLATFORM-TEAM.md
12. passer D-018 VALIDÉ si tout concorde
13. enregistrer et cadrer D-019
14. implémenter/valider D-019
15. D-015
16. D-016
17. audit final
18. D-017 clone pilote + upgrade
19. release v1.0.0
20. clone du vrai SaaS métier
21. cadrage des modules métier avant code
```

Ne pas exécuter plusieurs gates en parallèle.

---

## 17. Fichiers prioritaires à la prochaine conversation

```text
docs/REPRISE-CURRENT.md
docs/DEBT.md
docs/contracts/PLATFORM-TEAM.md
docs/derived-saas/DERIVED-SAAS.md
docs/derived-saas/EXTENSION-POINTS.md

backend/modules/platformInvitation/*
backend/modules/platformTeam/*
backend/modules/platformRole/*
backend/modules/platform/currentContext/*
backend/config/applicationPlatformPermission.registry.js

frontend/src/features/platform/components/platform-team-invitations-section.jsx
frontend/src/features/platform/components/platform-team-invitations-ux.test.jsx
frontend/src/features/platform/components/platform-team-member-read-columns.jsx
frontend/src/features/platform/components/platform-user-details-drawer.jsx
frontend/src/features/platform/lib/platform-navigation.js
frontend/src/components/data-display/data-table.jsx
```

---

## 18. Ce qu'il ne faut pas faire

Ne pas :

- restaurer `PATCH /platform/users/:id/role` ;
- réintroduire `User.platformRole` comme autorité frontend ;
- coder la navigation par nom de rôle ;
- rendre les rôles système modifiables ;
- créer librement des permissions depuis l'UI ;
- ajouter des permissions directement sur un User ;
- supprimer les transactions pour contourner une erreur MongoDB ;
- utiliser `Promise.all()` pour des opérations partageant la même session transactionnelle ;
- coder une durée juridique universelle de rétention dans le Core ;
- exposer une purge générique avec cutoff ou filtre arbitraire ;
- commencer D-015 avant D-019 ;
- lancer les modules métier réels dans le dépôt Core ;
- dupliquer les composants frontend partagés ;
- déclarer `v1.0.0` avant les gates D-015, D-016, audit final et D-017.

---

## 19. Résumé de reprise en une phrase

D-018 est fonctionnellement très avancée et ses derniers correctifs concernent la sécurité transactionnelle des invitations ainsi que plusieurs finitions UX ; la prochaine conversation doit revalider le HEAD courant, terminer le gate manuel et clôturer formellement D-018, puis traiter D-019, D-015, D-016, l'audit final et la dérivation pilote D-017 avant de publier `v1.0.0`, cloner le véritable SaaS métier avec historique Git conservé et commencer les modules métier via les points d'extension déjà validés.
