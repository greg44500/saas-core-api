# SAAS-CORE-API — Synthèse de reprise

**Date :** 2 septembre 2026  
**Projet :** `greg44500/saas-core-api`  
**Branche de production suivie :** `main`  
**Point de reprise :** finalisation et validation de F8 avant le checkpoint obligatoire `F8-AUDIT`

---

## 1. Objet de cette synthèse

Cette fiche doit permettre de reprendre le développement dans une nouvelle conversation sans réinterpréter l’historique du projet.

Le travail fonctionnel du Core frontend F8 est désormais pratiquement terminé. Les derniers lots F8.8.2 et F8.9 sont implémentés, ainsi que plusieurs correctifs UX transversaux demandés pendant la vérification visuelle.

**Ils ne doivent toutefois pas encore être marqués TERMINÉS** : les derniers tests ciblés, les régressions globales et le build Vite restent à confirmer après les toutes dernières corrections.

Le prochain bloc de développement réel n’est pas F9 directement : **F8-AUDIT est obligatoire avant F9 Platform**.

---

## 2. Stack et règles immuables du projet

### Frontend

- React + Vite ;
- JavaScript uniquement ;
- Tailwind CSS ;
- base de composants de type shadcn/ui ;
- Redux Toolkit ;
- RTK Query ;
- React Router ;
- Vitest + React Testing Library ;
- Playwright prévu pour les validations E2E ultérieures.

### Backend

- Node.js ;
- Express ;
- MongoDB / Mongoose ;
- Zod ;
- Vitest + Supertest.

### Règles de conception

- le backend reste toujours l’autorité de sécurité ;
- `useState` = état strictement local ;
- Redux Toolkit = véritable état client global ;
- RTK Query = état provenant du serveur ;
- pas de duplication d’une donnée serveur dans Redux ;
- architecture frontend par fonctionnalités ;
- architecture backend par modules métier ;
- logique métier dans les services backend ;
- pas de logique métier lourde dans les controllers/routes/pages React ;
- validation stricte obligatoire ;
- commentaires uniquement pour expliquer le pourquoi ;
- JSDoc uniquement lorsque le contrat de maintenance le justifie ;
- aucune fonctionnalité marquée TERMINÉE avant tests ciblés + régression globale + build lorsque le lot les exige.

---

## 3. État général du Core avant reprise

### Lots validés

- F8.5 Files frontend : TERMINÉ ;
- F8.6.1 Subscription / Plan / Trial lecture : TERMINÉ ;
- F8.6.2 Trial / changement de plan : TERMINÉ ;
- F8.6.3 Résiliation / downgrade : TERMINÉ ;
- Drawer partagé : TERMINÉ et visuellement validé ;
- F8.7 Workspace Settings / Ownership : TERMINÉ ;
- F8.8.1 Audit Workspace frontend : TERMINÉ.

### Lots implémentés mais à valider après les derniers changements

- F8.8.2 Dashboard Core ;
- F8.9 Account / Security ;
- DatePicker français partagé ;
- retour depuis l’espace Compte ;
- workflow « mot de passe actuel oublié » ;
- correction du Tooltip persistant ;
- centralisation des espacements des tableaux Core.

---

## 4. Décision structurante sur le Dashboard Workspace

Le Dashboard Workspace actuel est un **prototype Core temporaire**.

Il agrège actuellement des informations techniques du socle :

- statut du workspace ;
- rôle courant ;
- membres ;
- invitations ;
- fichiers ;
- abonnement ;
- activité récente.

Cette implémentation a servi à valider l’architecture RTK Query, les permissions et la composition multi-source.

### Décision figée

**Ne plus enrichir le Dashboard Workspace avec des informations Core.**

Lorsque les premiers modules métier seront cadrés, le Dashboard Workspace sera refondu pour mettre en avant les données à forte valeur utilisateur : produits, fournisseurs, prix, alertes, analyses, historiques, etc. Les informations Core deviendront secondaires.

Le Dashboard Workspace ne doit donc pas être repris avant le cadrage d’un premier domaine métier.

Référence : `docs/dashboard-workspace-platform-boundary.md`.

---

## 5. F8.8.2 — Dashboard Core actuel

Implémenté avec les contrats backend existants, sans nouvelle API.

Principes :

- RTK Query pour toutes les données serveur ;
- requêtes conditionnées par les permissions effectives ;
- `skip` lorsqu’une permission manque ;
- compteurs Membres/Fichiers/Invitations via `limit=1` et `meta.total` ;
- activité récente limitée aux cinq derniers événements ;
- abonnement lu depuis `effectiveEntitlement` ;
- aucune reconstruction frontend d’un entitlement ;
- `storage_bytes` et `file_uploads_monthly` non affichés car aucune route de lecture utilisateur ne fournit leur valeur courante.

### Statut

**VALIDATION EN COURS.**

Après tests verts, F8.8.2 pourra être clôturé mais le Dashboard sera ensuite gelé jusqu’aux modules métier.

---

## 6. F8.9 — Account / Security

### Backend ajouté

Endpoint :

```text
PATCH /api/users/me
```

Contrat :

- route authentifiée ;
- body strict et partiel ;
- accepte uniquement `firstName` et/ou `lastName` ;
- refuse email, statut, rôle Platform et propriétés internes ;
- transaction MongoDB ;
- `updatedBy` positionné sur l’utilisateur courant ;
- AuditLog `USER_PROFILE_UPDATED` ;
- audit global avec `workspace = null` ;
- metadata limitée à `changedFields` ;
- aucune ancienne/nouvelle donnée personnelle du profil stockée dans metadata.

L’email reste volontairement en lecture seule tant qu’un workflow de changement + vérification de nouvelle adresse n’existe pas.

### Frontend Account

Routes :

```text
/account/profile
/account/security
```

Le compte est global et indépendant d’un workspace particulier.

#### Profil

- lecture via `GET /api/auth/me` ;
- modification prénom/nom uniquement ;
- mutation via RTK Query ;
- invalidation du tag `CurrentUser` ;
- email affiché en lecture seule.

#### Sécurité

- changement de mot de passe ;
- confirmation du nouveau mot de passe uniquement côté UI ;
- envoi backend uniquement de `currentPassword` et `newPassword` ;
- reconnexion obligatoire après succès ;
- `logout-all` avec confirmation ;
- si `logout-all` échoue côté backend, l’UI n’annonce pas une révocation réussie et ne redirige pas artificiellement vers Login.

### Mot de passe actuel oublié

La page Sécurité contient maintenant :

```text
Mot de passe actuel oublié ?
```

Ce lien **ne contourne jamais** la demande de mot de passe actuel.

Il redirige vers le workflow sécurisé déjà existant :

```text
POST /api/auth/forgot-password
→ email de récupération
→ /reset-password?token=...
→ POST /api/auth/reset-password
```

L’adresse email du compte courant est préremplie lorsque le parcours vient de Sécurité.

### Retour depuis l’espace Compte

Le layout Account ne réplique pas la Sidebar Workspace car Account est global au compte.

Le menu utilisateur mémorise la page qui a ouvert les paramètres.

Le layout expose maintenant un bouton explicite :

```text
← Retour à l’application
```

Comportement :

- depuis un Workspace → retour exact à la route Workspace d’origine ;
- depuis Platform → retour exact à Platform ;
- navigation Profil ↔ Sécurité conserve la destination ;
- le détour Sécurité → Mot de passe oublié → Sécurité conserve également cette destination ;
- accès direct sans origine connue : `/workspaces` pour un utilisateur standard, `/platform/overview` pour un super_admin.

Référence : `docs/frontend-backend-account-security-contract.md`.

### Statut

**IMPLÉMENTÉ — VALIDATION FINALE REQUISE.**

---

## 7. Composant DatePicker français partagé

Une décision globale est maintenant figée : **aucune page ne recrée son propre calendrier**.

Primitive :

```text
frontend/src/components/forms/date-picker.jsx
```

Contrat UX :

- placeholder `jj/mm/aaaa` ;
- saisie manuelle française ;
- jours/mois et navigation en français ;
- boutons `Aujourd’hui` et `Effacer` ;
- validation réelle des dates calendaires ;
- affichage utilisateur en `jj/mm/aaaa` ;
- valeur fournie aux features en `YYYY-MM-DD`.

Exemple :

```text
Utilisateur : 02/09/2026
Feature/API : 2026-09-02
```

Les filtres Audit ont déjà été migrés depuis les `input type="date"` natifs vers ce composant.

Règle pour les futurs modules métier : enrichir cette primitive si un nouveau besoin apparaît ; ne pas créer un nouveau calendrier dans une feature.

---

## 8. Espacements des tableaux — point de réglage unique

Avant ce correctif, chaque tableau contenait directement des classes du type :

```text
px-5 py-3
px-5 py-4
gap-2
```

Les espacements des tableaux Core principaux sont désormais centralisés dans :

```text
frontend/src/components/data-display/data-table-styles.js
```

Contenu actuel :

```js
const DATA_TABLE_STYLES = Object.freeze({
  headerCell: 'px-5 py-3',
  bodyCell: 'px-5 py-4',
  actionGroup: 'gap-2',
});
```

### Pour modifier la densité globale

Exemple plus compact :

```js
headerCell: 'px-4 py-2.5',
bodyCell: 'px-4 py-3',
actionGroup: 'gap-1.5',
```

Tableaux actuellement raccordés à cette primitive :

- Rôles ;
- Membres ;
- Fichiers ;
- Audit Workspace.

Les futurs tableaux Platform doivent réutiliser la même primitive, sauf besoin UX explicitement différent.

---

## 9. Correctif Tooltip persistant lors de l’ouverture d’un Drawer

### Symptôme observé

Dans les tableaux, après survol puis clic sur l’icône `Voir`, le libellé du tooltip restait visible pendant l’ouverture du Drawer.

### Cause

Le composant partagé utilisait :

```text
group-focus-within:opacity-100
```

Après un clic, le bouton conservait le focus. Le tooltip restait donc visible même lorsque le Drawer était ouvert.

### Correction

Fichier :

```text
frontend/src/components/shared/tooltip.jsx
```

Le Tooltip gère maintenant explicitement :

- survol pointeur ;
- sortie du pointeur ;
- focus clavier ;
- blur ;
- activation/clic.

Après activation d’une action, le tooltip est immédiatement masqué même si le bouton conserve son focus.

L’accessibilité clavier reste conservée : le tooltip peut toujours apparaître lorsque l’utilisateur atteint le contrôle au clavier.

Test ajouté :

```text
frontend/src/components/shared/tooltip.test.jsx
```

---

## 10. Checklist frontend vivante

Référence :

```text
docs/frontend-implementation-checklist.md
```

La checklist a été synchronisée avec :

- F8.8.2 en validation ;
- F8.9 implémenté / validation en cours ;
- DatePicker partagé ;
- navigation de retour Account ;
- workflow mot de passe oublié depuis Sécurité ;
- centralisation de la densité des tables ;
- correction Tooltip ;
- décision de geler le Dashboard Workspace avant les modules métier.

---

## 11. Point de reprise EXACT dans la prochaine conversation

### Étape 1 — synchroniser le dépôt local

Depuis la racine du projet :

```bash
git pull
```

### Étape 2 — valider le backend F8.9

Depuis la racine :

```powershell
npx vitest run backend/tests/users/user.validation.test.js backend/tests/users/user.service.test.js backend/tests/users/user.controller.test.js backend/tests/users/user.routes.test.js backend/tests/auditLog/auditActions.constants.test.js backend/tests/auth/publicUser.dto.test.js
```

Si vert :

```bash
npm test
```

Ne pas considérer le backend F8.9 validé avant ces deux étapes.

### Étape 3 — tests frontend ciblés de finalisation F8

```bash
cd frontend
```

Puis, sur une seule ligne PowerShell :

```powershell
npm test -- src/components/forms/date-picker.test.jsx src/components/shared/tooltip.test.jsx src/features/audit-log/components/audit-log-filters.test.jsx src/features/audit-log/lib/audit-log-presentation.test.js src/features/workspace-roles/pages/workspace-roles-page.test.jsx src/features/workspace-members/pages/workspace-members-page.test.jsx src/features/files/pages/workspace-files-page.test.jsx src/features/workspace/hooks/use-workspace-dashboard-data.test.js src/features/workspace/pages/workspace-dashboard-page.test.jsx src/features/workspace/lib/workspace-presentation.test.js src/features/account/validation/account-schemas.test.js src/features/account/pages/profile-page.test.jsx src/features/account/pages/security-page.test.jsx src/features/auth/validation/auth-schemas.test.js src/features/auth/pages/password-recovery-pages.test.jsx src/features/auth/components/user-menu.test.jsx src/app/layouts/account-layout.test.jsx src/app/router.test.jsx
```

Important sous PowerShell : ne pas utiliser `\` comme continuation de ligne Unix.

### Étape 4 — régression frontend et build

Si les tests ciblés sont verts :

```bash
npm test
npm run build
```

### Étape 5 — vérification visuelle minimale

Vérifier :

1. `Rôles et permissions` → survol `Voir` → clic → le tooltip disparaît dès l’ouverture du Drawer ;
2. même comportement dans Membres et autres actions utilisant `ActionIconButton` ;
3. modification de `DATA_TABLE_STYLES.bodyCell` localement si souhaitée pour vérifier que la densité évolue de manière cohérente dans les tables raccordées ;
4. Activité → dates affichées/saisies en `jj/mm/aaaa` avec calendrier français ;
5. Workspace → menu utilisateur → Sécurité → `Retour à l’application` revient exactement au Workspace d’origine ;
6. Sécurité → `Mot de passe actuel oublié ?` → email prérempli → possibilité de revenir à Sécurité ;
7. Profil → modification prénom/nom → menu utilisateur reflète les nouvelles données après invalidation RTK Query ;
8. changement de mot de passe → reconnexion obligatoire ;
9. logout-all → confirmation obligatoire.

### Étape 6 — si TOUT est vert

Alors seulement :

1. marquer F8.8.2 TERMINÉ ;
2. marquer F8.9 TERMINÉ ;
3. clôturer les correctifs UX transversaux ;
4. mettre à jour `docs/frontend-implementation-checklist.md` ;
5. lancer immédiatement `F8-AUDIT`.

**Ne pas commencer F9 avant F8-AUDIT.**

---

## 12. F8-AUDIT — prochain bloc obligatoire

Référence :

```text
docs/frontend-maintenance-audit.md
```

Objectif : relire transversalement tout le frontend Core avant de construire Platform.

Audit minimum :

- responsabilités des fichiers ;
- commentaires « pourquoi » ;
- JSDoc utile ;
- absence de commentaires inutiles ;
- permissions et sécurité ;
- caches/invalidation RTK Query ;
- cohérence des états locaux/globaux/serveur ;
- chaînes françaises ;
- primitives partagées ;
- DatePicker unique ;
- densité des tables centralisée ;
- Tooltip partagé ;
- Drawers ;
- navigation ;
- cohérence des contrats backend ;
- suppression de code mort ;
- tests ciblés ;
- suite globale ;
- build Vite.

Le but n’est pas de refaire l’UI ni d’ajouter des fonctionnalités, mais de rendre le Core maintenable et cohérent avant F9.

---

## 13. F9 — Platform doit ensuite être construit complètement

Le frontend Platform actuel est encore largement placeholder.

Le backend dispose déjà de domaines Platform pour :

- utilisateurs ;
- workspaces ;
- plans ;
- subscriptions ;
- audit logs globaux.

L’audit global super_admin existe déjà côté backend et est protégé `SUPER_ADMIN`.

### F9 doit produire une vraie console Platform

Routes prévues :

```text
/platform/overview
/platform/users
/platform/workspaces
/platform/plans
/platform/subscriptions
/platform/audit-logs
```

Chaque domaine devra comporter selon le contrat serveur disponible :

- RTK Query ;
- tables réelles ;
- pagination ;
- filtres ;
- recherche lorsqu’elle est supportée ;
- Drawers de détail lorsque pertinent ;
- actions super_admin ;
- confirmations fortes pour les opérations sensibles ;
- états loading/error/empty/data ;
- libellés français ;
- tests.

### Dashboard Platform

Contrairement au Dashboard Workspace, le Dashboard Platform est une vraie surface de pilotage du SaaS.

Aucun KPI ne doit être inventé depuis des listes frontend. Si des agrégats Platform nécessaires n’existent pas côté backend, il faudra d’abord ajouter un contrat serveur dédié.

### Audit Platform

Doit consommer le contrat global existant et permettre une lecture transverse des événements Platform/Core/Workspace selon le contrat sécurisé.

---

## 14. Modules métier et valeur finale du Core

Aucun module métier ne doit être lancé pendant la finalisation F8/F8-AUDIT/F9.

Le Core est conçu pour fournir aux futurs domaines métier :

```text
Authentification
→ multi-tenant Workspace
→ RBAC
→ plans / entitlements
→ quotas
→ fichiers
→ AuditLog
→ administration Platform
→ modules métier
```

Le futur Dashboard Workspace devra être alimenté prioritairement par les données métier.

Les actions métier sensibles devront à terme enrichir le registre AuditLog avec leurs propres actions et types d’entité sans casser le Core générique.

---

## 15. Décisions et dettes à ne pas oublier

- Dashboard Workspace Core : gelé jusqu’au cadrage métier ;
- Dashboard Platform : à construire réellement en F9 ;
- Platform Audit frontend : à construire en F9, backend déjà présent ;
- changement d’email : non implémenté tant qu’il n’existe pas de workflow de vérification ;
- sessions individuelles/appareils : non listés en Core V1 ; `logout-all` seulement ;
- MFA/passkeys : hors F8.9 ;
- Billing/Payment réel : dette provider, taxes, facturation, webhooks, `past_due` ;
- Corbeille/restauration Files : dette documentée ;
- fermeture/suppression complète compte/workspace : dette documentée ;
- RGPD/cookies/privacy : dette future backend/frontend/legal UX ;
- transfert ownership Workspace : possible mais exceptionnel et fortement audité ;
- compte Google-only et confirmation forte ownership : dette OAuth reauth existante ;
- `EntitlementOverride` Workspace-scoped + administration Platform : prévu après Platform selon l’ordre retenu ;
- F11 : consolidation frontend + E2E.

---

## 16. Commits repères des derniers correctifs UX

Les commits suivants permettent d’identifier les changements de fin de F8 :

- `6247c991...` — centralisation initiale des espacements de tables ;
- `14f4e58a...` — correction du Tooltip persistant ;
- `bc3cd68c...` — table Rôles raccordée aux espacements partagés ;
- `e1548708...` — table Fichiers raccordée ;
- `7ede4777...` — table Audit raccordée ;
- `84fff275...` — table Membres raccordée ;
- `2e2513d7...` — tests Tooltip ;
- `e1f200e0...` — checklist frontend synchronisée.

Les commits précédents de F8.9 et du DatePicker sont déjà intégrés à `main` et sont décrits dans cette synthèse et les documents de référence.

---

## 17. Résumé opérationnel en une phrase

**À la reprise : `git pull` → tests backend F8.9 → tests frontend ciblés F8 → suite globale + build → validation visuelle Tooltip/DatePicker/Account → si tout est vert, clôturer F8 et lancer F8-AUDIT ; ne pas enrichir le Dashboard Workspace et ne pas commencer Platform avant cet audit.**
