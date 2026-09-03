# SAAS-CORE-API — Synthèse de reprise

**Date de consolidation : 3 septembre 2026**  
**Checkpoint : F8 frontend Core finalisé + F8-AUDIT validé + contrat commercial générique aligné**  
**Prochain bloc : F9 — Platform Admin frontend réel**

---

## 1. Objectif de cette synthèse

Ce document permet de reprendre le développement dans une nouvelle conversation sans reconstruire l’historique du projet.

Il fige :

- l’architecture technique et les règles de développement ;
- l’état backend déjà disponible ;
- l’état frontend réellement terminé ;
- les décisions UX/RBAC/Subscription/Trial déjà validées ;
- les primitives partagées obligatoires ;
- la politique de feedback Toast/inline ;
- les dettes connues ;
- le point de départ exact de F9 Platform Admin ;
- la règle de réutilisabilité commerciale du Core.

La règle de reprise est simple : **ne pas rouvrir F8 sauf régression démontrée**. Le prochain travail productif doit commencer par l’audit du contrat backend Platform puis l’implémentation de F9.

Références commerciales actives :

```text
docs/commercial-configuration-contract.md
docs/commercial-plans-entitlements-platform-admin.md
```

Toute mention historique incompatible de `Premium = 5 workspaces`, `CommercialAccount` obligatoire ou d’un prix particulier considéré comme invariant est supplantée.

---

## 2. Dépôt et état Git de référence

Dépôt :

```text
greg44500/saas-core-api
```

Branche :

```text
main
```

Baseline de code fonctionnelle validée avant les mises à jour documentaires du 3 septembre 2026 :

```text
114c334b26c5e43b9a22f0e0dcd415209b10ecf4
```

Dernier commit de code à cette baseline :

```text
test(frontend): keep role delete failure contextual
```

Les commits du 3 septembre 2026 ayant uniquement modifié la documentation commerciale n'impliquent pas de nouvelle validation fonctionnelle du code.

La branche `main` n’est pas protégée et aucun statut CI obligatoire n’est configuré. Il ne faut donc jamais déduire qu’un lot est vert à partir de GitHub seul.

Validation finale signalée localement par l’utilisateur le 2 septembre 2026 :

- tests ciblés Toast/Core : verts ;
- suite frontend globale : verte ;
- build Vite production : vert ;
- vérification manuelle du système de Toast : fonctionnelle.

Workflow habituel après modifications du dépôt :

```powershell
git pull
cd frontend
npm test
npm run build
```

Les tests ciblés doivent rester la première étape lorsqu’un lot précis est modifié.

---

## 3. Stack technique figée

### Frontend

- React avec Vite ;
- JavaScript uniquement ;
- Tailwind CSS ;
- shadcn/ui comme base du design system ;
- Redux Toolkit pour le véritable état global client ;
- RTK Query pour tout état serveur ;
- React Router ;
- React Hook Form + Zod pour les formulaires ;
- Vitest + React Testing Library ;
- Playwright prévu pour les E2E.

### Backend

- Node.js ;
- Express.js ;
- MongoDB ;
- Mongoose ;
- Zod ;
- Vitest ;
- Supertest.

### Règle d’état

- `useState` : état local de composant ;
- Redux Toolkit : état global client uniquement lorsque plusieurs zones applicatives doivent réellement le partager ;
- RTK Query : données serveur, cache, invalidations et mutations.

Ne pas introduire un second système de cache serveur.

---

## 4. Architecture frontend cible

Structure de référence :

```text
frontend/src/
  app/
  components/
    ui/
    shared/
    forms/
    data-display/
  features/
  services/api/
  store/
  hooks/
  lib/
  utils/
```

Règles :

- les pages assemblent les composants ;
- les pages ne doivent pas porter de logique métier lourde ;
- les appels API passent par RTK Query ;
- `components/ui` contient les primitives de design system ;
- `components/shared` contient les assemblages transversaux ;
- `features/<feature>/components` contient les composants propres à un domaine ;
- composition plutôt que gros composants monolithiques ;
- aucun snippet isolé ou duplication volontaire sans justification ;
- ne pas créer un dossier global `hooks/` vide uniquement pour respecter une arborescence théorique.

Analogie figée :

- `components/ui` = briques Lego de base ;
- `components/shared` = assemblages réutilisables dans plusieurs pièces ;
- `features/<feature>/components` = éléments propres à une pièce fonctionnelle.

---

## 5. Architecture backend cible et réutilisabilité

Structure de référence :

```text
backend/
  config/
  modules/
  middlewares/
  shared/
  jobs/
  tests/
```

Chaque module doit séparer :

- routes ;
- controller ;
- service ;
- model ;
- validation ;
- tests.

Règles :

- les routes définissent les endpoints et middlewares ;
- les controllers adaptent HTTP ;
- les services portent la logique métier ;
- les models portent les schémas Mongoose ;
- Zod protège les entrées ;
- aucune logique métier lourde dans route/controller ;
- le backend reste toujours l’autorité de sécurité.

Le frontend peut masquer une action pour améliorer l’UX, mais ce masquage n’est jamais une autorisation.

### Règle de dérivation du Core

`saas-core-api` est un socle SaaS générique clonable.

Flow cible :

```text
clone/copie du Core
→ nouveau dépôt
→ configuration .env technique et secrets
→ initialisation base/seeds Core
→ validation des tests Core
→ configuration du catalogue commercial
→ extension permissions/capabilities/métriques
→ ajout des modules métier
→ interfaces métier
```

La dépendance doit rester :

```text
MODULE MÉTIER
      ↓
     CORE
```

Le Core ne doit jamais importer un module métier d’une application dérivée.

---

## 6. Socle sécurité backend déjà établi

Le Core backend comprend notamment :

- authentification register/login/logout/logout-all/me ;
- changement de mot de passe ;
- forgot/reset password ;
- sessions et rotation de refresh ;
- rôles/permissions Workspace ;
- rôles plateforme, dont `super_admin` ;
- workspaces multi-tenant ;
- memberships et invitations ;
- Plans / Subscription / Trial ;
- quotas et métriques ;
- fichiers avec pipeline sécurisé ;
- audit logs ;
- administration Platform backend.

Principes sécurité déjà figés :

- mots de passe Argon2id ;
- JWT access ;
- refresh session en cookie HttpOnly ;
- rotation stricte ;
- validation Zod ;
- CORS credentials ;
- Helmet ;
- rate limiting ;
- sanitation des filtres Mongo ;
- statuts utilisateurs gérés côté backend ;
- contrôles de permissions backend avant action ;
- audit des actions sensibles.

Fichiers :

- upload temporaire ;
- contrôle antivirus ;
- vérification du type réel ;
- checksum ;
- stockage final après validation ;
- quotas ;
- soft delete puis purge ;
- pas de « corbeille » utilisateur tant que listing/restauration ne sont pas réellement disponibles.

---

## 7. Décisions commerciales, Plans et Trial

### Principe supérieur

Le Core fournit le **moteur commercial générique** ; l’application dérivée fournit le **catalogue commercial réel**.

Ne pas transformer les valeurs actuelles de travail en constantes universelles.

### Plans

Le catalogue de travail actuel utilise notamment :

- Free ;
- Premium ;
- IA.

La référence historique Premium à `79 € HT/mois` n’est pas un invariant du Core.

Chaque application dérivée doit pouvoir définir :

- ses plans ;
- ses prix ;
- sa devise ;
- ses features ;
- ses limits ;
- son trial ;
- ses métriques métier.

Les plans portent :

- `features` : capacités activées ;
- `limits` : quotas numériques.

Ne jamais mélanger feature et limite.

Ne jamais autoriser une fonctionnalité via `plan.key === "premium"`.

### Free

Dans le Core V1, Free reste la baseline du Workspace.

- Free a un prix nul ;
- Free n’a pas de trial ;
- ses features et limits sont paramétrables ;
- le Core ne doit pas supposer une liste fixe de capacités ou quotas Free.

Une éventuelle architecture future sans baseline Free nécessiterait une décision explicite, car le fallback d’entitlement actuel repose sur cette baseline.

### Trial

- Free n’a pas de trial ;
- un plan payant peut définir `trialEnabled` et `trialDurationDays` ;
- la durée n’est pas globale : elle est paramétrable par Plan ;
- aucun moyen de paiement requis pendant le trial dans le mécanisme V1 actuel ;
- changer de plan pendant un trial ne réinitialise jamais `trialEndsAt` ;
- revenir volontairement à Free met fin immédiatement et définitivement au trial ;
- l’éligibilité trial reste consommée ;
- supprimer/recréer un compte ne doit pas recréer artificiellement une éligibilité ;
- transfert de propriétaire du workspace ne redémarre pas le trial ;
- le nouveau propriétaire hérite de l’état commercial du workspace.

### Expiration

À l’expiration d’un trial payant sans paiement valide :

- la Subscription commerciale peut devenir expirée ;
- le Workspace reste existant ;
- les droits effectifs sont calculés par le backend ;
- le frontend ne reconstruit jamais lui-même le fallback d’entitlement.

### Paiement

- données de paiement : owner/payant uniquement ;
- un admin Workspace n’accède pas automatiquement aux données bancaires ;
- le provider de paiement réel n’est pas encore intégré ;
- Billing/Payment reste hors périmètre du bloc actuel.

### CommercialAccount — décision supplantée

L’ancienne architecture suivante est abandonnée pour le Core V1 :

```text
CommercialAccount obligatoire
1 abonnement Premium couvre plusieurs workspaces
Premium = 5 workspaces
scope commercial_account
```

Le modèle actif conserve :

```text
Subscription.workspace
UsageMetric.workspace
```

La capacité technique multi-workspace d’un User ne définit pas automatiquement une politique commerciale multi-workspace.

### Exceptions commerciales futures

Le `super_admin` devra pouvoir activer/désactiver certaines fonctionnalités de manière exceptionnelle sans modifier le Plan catalogue partagé.

Ce sujet est prévu via `EntitlementOverride` Workspace-scoped / Platform.

---

## 8. Configuration technique vs configuration commerciale

### `.env`

Réservé aux secrets et paramètres techniques, par exemple :

```text
DATABASE_URL
JWT_ACCESS_SECRET
TRIAL_IDENTITY_SECRET
CLIENT_URL
SMTP_*
clés provider de paiement futures
paramètres infrastructure
```

### Base / seeds / Platform Admin

Pour les données commerciales :

```text
plans
prix
devise
trialEnabled
trialDurationDays
features
limits
ordre d’affichage
activation / archivage
```

Ne pas utiliser `.env` comme catalogue commercial ordinaire.

---

## 9. Frontend terminé avant F9

### F1 à F4

Socle Vite, design system, routing, layouts, session frontend, store, RTK Query et reauth sont en place.

`baseQueryWithReauth` utilise un mutex pour éviter plusieurs refresh simultanés.

La fin de session purge le cache RTK Query depuis le store : ce comportement a été centralisé pendant F8-AUDIT.

### Auth

- login ;
- register ;
- forgot password ;
- reset password ;
- logout ;
- logout-all ;
- redirections ;
- garde de session ;
- messages de retour Auth.

### Workspace

- onboarding ;
- liste des workspaces ;
- dashboard Core ;
- navigation Workspace ;
- paramètres généraux ;
- changement de nom ;
- transfert d’ownership.

### Membres / Invitations

- listing paginé ;
- invitation ;
- renvoi ;
- révocation ;
- changement de rôle ;
- suspension ;
- retrait ;
- drawers de détails et permissions ;
- respect strict des permissions effectives.

### Rôles / Permissions

- listing ;
- consultation ;
- création de rôle personnalisé ;
- modification ;
- suppression selon contraintes serveur ;
- prévention UX d’escalade de permissions ;
- backend restant l’autorité.

L’API Roles est propriétaire de ses endpoints dans :

```text
frontend/src/features/workspace-roles/api/workspace-roles-api.js
```

Ne pas réintroduire `useListWorkspaceRolesQuery` dans `workspace-members/api`.

### Files — F8.5

- lecture ;
- pagination ;
- téléchargement ;
- upload ;
- validation frontend des métadonnées ;
- confirmation de soft delete ;
- feedback cohérent avec le backend ;
- pas de fausse restauration/corbeille.

### Subscription / Plan / Trial — F8.6

- lecture de l’abonnement ;
- lecture de l’entitlement effectif ;
- affichage des capabilities et limites exposées ;
- trial progress ;
- démarrage/changement de trial owner-only ;
- retour Free irréversible ;
- programmation/révocation de résiliation ;
- programmation/révocation de downgrade ;
- dates effectives affichées ;
- actions commerciales owner-only.

Le frontend doit afficher le catalogue fourni par le backend et ne doit jamais supposer qu’un nom de plan, un prix ou une liste de features est universel.

### Workspace Settings / Ownership — F8.7

- modification du nom ;
- transfert de propriété ;
- mot de passe courant requis ;
- nouveau owner choisi parmi membres actifs non-owner ;
- rôle de remplacement de l’ancien owner ;
- redirection après succès pour recalculer le contexte de permissions.

### Audit Workspace — F8.8.1

- historique paginé ;
- filtres ;
- dates françaises ;
- query params URL ;
- formatters de présentation ;
- aucune exposition d’IP/user-agent/metadata sensible ;
- pas de filtre acteur tant qu’un contrat autonome adapté n’existe pas.

### Dashboard Core — F8.8.2

Dashboard technique de synthèse, construit uniquement avec les contrats backend existants et les permissions disponibles.

Décision figée : ce dashboard est provisoire. Le futur dashboard Workspace sera repensé avec les modules métier. Ne pas enrichir le dashboard Core avant ce cadrage.

### Account / Security — F8.9

- Profil ;
- prénom/nom modifiables ;
- email en lecture seule tant que le workflow de changement d’email n’existe pas ;
- Sécurité ;
- changement de mot de passe ;
- logout-all ;
- retour vers le contexte Workspace/Platform d’origine.

---

## 10. F8-AUDIT — maintenabilité frontend

Checkpoint obligatoire terminé.

Corrections structurantes validées :

- purge du cache de session centralisée ;
- documentation des invariants non évidents ;
- suppression du code mort Auth ;
- suppression des wrappers Platform placeholders inutilisés ;
- ownership de l’API Roles corrigé ;
- import résiduel `useListWorkspaceRolesQuery` corrigé ;
- pagination partagée ;
- confirmation partagée ;
- tests associés ;
- build production validé.

---

## 11. Primitives frontend partagées obligatoires

### DataTable

```text
frontend/src/components/data-display/data-table.jsx
frontend/src/components/data-display/data-table-styles.js
```

Tous les futurs tableaux Platform et métier compatibles doivent l’utiliser par défaut.

### DataPagination

```text
frontend/src/components/data-display/data-pagination.jsx
```

### EntityDetailsDrawer

```text
frontend/src/components/shared/entity-details-drawer.jsx
```

### ConfirmationDialog

```text
frontend/src/components/shared/confirmation-dialog.jsx
```

### DatePicker

```text
frontend/src/components/forms/date-picker.jsx
```

Les composants partagés doivent rester la référence avant toute création de variante locale.

---

## 12. Prochain bloc F9 — Platform Admin frontend réel

Avant de coder F9 :

1. auditer les routes Platform réellement disponibles côté backend ;
2. vérifier les DTO observables ;
3. utiliser les composants partagés existants ;
4. ne pas inventer de données ou capacités Platform non exposées ;
5. maintenir l’isolation Platform / Workspace ;
6. respecter le contrat commercial générique : les écrans Plans doivent être pilotés par les données, pas par des hypothèses `Free/Premium/IA` codées en dur ;
7. ne pas réintroduire `CommercialAccount` dans F9 ;
8. différer `EntitlementOverride` si le contrat backend nécessaire n’existe pas encore.

---

## 13. Documents de référence à maintenir ensemble

```text
docs/commercial-configuration-contract.md
docs/commercial-plans-entitlements-platform-admin.md
docs/frontend-backend-subscription-contract.md
docs/frontend-backend-integration-contract.md
docs/frontend-backend-roles-permissions-contract.md
docs/backend-implementation-checklist.md
```

Ordre logique :

```text
commercial-configuration-contract
→ généricité du Core et paramétrage commercial

commercial-plans-entitlements-platform-admin
→ architecture commerciale V1 active

frontend-backend-*-contract
→ comportement HTTP observable

backend-implementation-checklist
→ état réel d’implémentation
```

---

## 14. Invariant de reprise

À partir du 3 septembre 2026 :

```text
saas-core-api
= socle générique clonable

Core
= mécanismes + sécurité + points d’extension

Application dérivée
= métier + catalogue commercial réel + prix + capabilities/métriques métier
```

Aucun développement futur du Core ne doit transformer une configuration commerciale particulière en invariant structurel sans décision d’architecture explicite.