# SAAS-CORE-API — Synthèse de reprise

**Date de consolidation : 2 septembre 2026**  
**Checkpoint : F8 frontend Core finalisé + F8-AUDIT validé + politique Toasts appliquée**  
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
- le point de départ exact de F9 Platform Admin.

La règle de reprise est simple : **ne pas rouvrir F8 sauf régression démontrée**. Le prochain travail productif doit commencer par l’audit du contrat backend Platform puis l’implémentation de F9.

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

Baseline de code validée avant création de ce document :

```text
114c334b26c5e43b9a22f0e0dcd415209b10ecf4
```

Dernier commit de code à cette baseline :

```text
test(frontend): keep role delete failure contextual
```

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

## 5. Architecture backend cible

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

Chaque module métier doit séparer :

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

## 7. Décisions commerciales, Plans, Trial et CommercialAccount

Décisions déjà figées :

### Plans

Plans envisagés :

- Free ;
- Premium : 79 € HT/mois ;
- IA : prix à définir.

Limite de workspaces :

- Free : 1 workspace ;
- Premium : 5 workspaces.

Les plans portent :

- `features` : capacités activées ;
- `limits` : quotas numériques.

Ne jamais mélanger feature et limite.

### Trial

- Free n’a pas de trial ;
- un plan payant peut définir `trialEnabled` et `trialDurationDays` ;
- aucun moyen de paiement requis pendant le trial ;
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

### CommercialAccount

Concept figé : capsule commerciale/payeur regroupant la Subscription et les workspaces financés par la même personne/organisation.

Exemple cible : un Premium à 79 € peut couvrir plusieurs workspaces dans sa limite commerciale.

Ce concept doit rester distinct des permissions opérationnelles d’administration d’un workspace.

### Exceptions commerciales futures

Le `super_admin` devra pouvoir activer/désactiver certaines fonctionnalités de manière exceptionnelle pour un compte, sans casser le modèle Plan standard.

Ce sujet est prévu plus tard via `EntitlementOverride` Workspace-scoped / Platform, pas dans F9 initial si le contrat backend n’est pas déjà exposé.

---

## 8. Frontend terminé avant F9

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

Les messages de succès après changement/reset de mot de passe restent volontairement sur la page Login lorsqu’une reconnexion est nécessaire. Ils ne doivent pas être dupliqués par un toast.

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

L’API Roles est maintenant propriétaire de ses endpoints dans :

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

## 9. F8-AUDIT — maintenabilité frontend

Checkpoint obligatoire désormais terminé.

Corrections structurantes validées :

- purge du cache de session centralisée ;
- documentation des invariants non évidents ;
- suppression du code mort Auth ;
- suppression des wrappers Platform placeholders inutilisés ;
- ownership de l’API Roles corrigé ;
- import résiduel `useListWorkspaceRolesQuery` corrigé dans Workspace Ownership après détection par le build ;
- pagination partagée ;
- confirmation partagée ;
- tests associés ;
- build production validé.

Le build a joué son rôle de gate : une dépendance résiduelle vers l’ancien module Roles avait été détectée et corrigée avant clôture.

---

## 10. Primitives frontend partagées obligatoires

### DataTable

Référence :

```text
frontend/src/components/data-display/data-table.jsx
```

Avec :

```text
frontend/src/components/data-display/data-table-styles.js
```

Tous les futurs tableaux Platform et métier compatibles doivent l’utiliser par défaut.

Ne pas recréer localement une structure `<table>/<thead>/<tbody>/<tr>/<td>` si `DataTable` couvre le besoin.

### DataPagination

Référence :

```text
frontend/src/components/data-display/data-pagination.jsx
```

Utilisée notamment par :

- Membres ;
- Fichiers ;
- Audit ;
- sélection de membres lors d’un transfert d’ownership.

### EntityDetailsDrawer

Référence :

```text
frontend/src/components/shared/entity-details-drawer.jsx
```

Comportement :

- ouverture/fermeture animée ;
- voile de fond ;
- conservation du contenu pendant la sortie ;
- focus ;
- Escape ;
- verrouillage du scroll ;
- restauration du focus.

Les drawers sont pertinents pour des détails riches, historiques, permissions ou données secondaires consultées sans quitter l’écran.

### ConfirmationDialog

Référence :

```text
frontend/src/components/shared/confirmation-dialog.jsx
```

Responsabilité : mécanique transversale de confirmation accessible.

La feature reste propriétaire :

- du texte métier ;
- des conséquences ;
- des validations ;
- du type d’action ;
- du traitement serveur.

### DatePicker

Référence :

```text
frontend/src/components/forms/date-picker.jsx
```

Règles :

- affichage `jj/mm/aaaa` ;
- calendrier français ;
- valeur technique `YYYY-MM-DD` ;
- pas de nouveau calendrier local sans besoin réellement différent.

### Tooltip

Composant partagé corrigé pour fonctionner au clavier sans rester affiché de manière indésirable après activation d’un bouton ouvrant un Drawer.

### ToastProvider

Référence :

```text
frontend/src/components/shared/toast-provider.jsx
```

Provider global enregistré dans `AppProviders`.

---

## 11. Politique Toasts — décision UX figée

Le système de Toast a été ajouté après F8-AUDIT car il faisait partie des demandes UX antérieures et devait être présent avant F9.

Comportement :

- durée par défaut : 5 secondes ;
- fermeture automatique ;
- fermeture manuelle par croix ;
- variantes `success`, `error`, `warning`, `info` ;
- `status` accessible pour succès/info ;
- `alert` accessible pour erreurs.

Contrat :

```text
docs/frontend-toast-feedback-contract.md
```

### Règle centrale

**Toast = résultat global d’une action serveur durable.**

**Inline = information nécessaire pour corriger/comprendre dans le contexte local.**

Une même information ne doit pas être affichée à la fois inline et en toast sans justification UX forte.

### Mutations Core migrées vers Toasts

#### Workspace

- changement du nom : succès + erreur opérationnelle en toast ;
- transfert d’ownership : succès en toast après navigation ; erreur mot de passe/contrainte reste inline.

#### Profil

- succès en toast ;
- erreur opérationnelle en toast ;
- validation de champ reste inline.

#### Fichiers

- upload réussi : toast ;
- retrait réussi : toast ;
- erreur de téléchargement : toast ;
- erreur upload : reste dans le dialogue ;
- erreur suppression : reste dans la confirmation ;
- pas de toast « téléchargement réussi » inutile.

#### Rôles

- création : toast ;
- modification : toast ;
- suppression réussie : toast ;
- échec de suppression : reste visible dans le bloc de confirmation.

#### Membres / Invitations

- invitation envoyée : toast ;
- invitation renvoyée : toast ;
- changement de rôle : toast ;
- suspension réussie : toast ;
- retrait réussi : toast ;
- révocation réussie : toast ;
- refus d’une action confirmée : reste dans la confirmation.

#### Subscription / Trial

- démarrage d’essai : toast ;
- changement de plan pendant essai : toast ;
- retour Free réussi : toast ;
- refus du retour Free : reste dans la confirmation.

#### Cycle commercial

- programmation résiliation : toast ;
- révocation résiliation : toast ;
- programmation downgrade : toast ;
- révocation downgrade : toast ;
- erreurs serveur : restent dans le dialogue commercial permettant de comprendre/réessayer.

### Pas de toast volontairement

- validation Zod/RHF ;
- navigation ;
- pagination ;
- filtres ;
- ouverture/fermeture Drawer ;
- refetch réussi ;
- chargement de page en erreur ;
- création initiale d’un workspace, qui possède déjà un écran de succès complet ;
- acceptation d’une invitation, qui possède déjà un écran de succès complet ;
- logout/login lorsque la navigation ou le message Login explicite déjà le résultat.

---

## 12. Règles UX figées importantes

- interface Core en français ;
- clés API/permissions restent techniques en interne ;
- formatters de présentation pour les statuts ;
- Sidebar Workspace rétractable ;
- tooltips en mode compact ;
- Topbar avec profil et logout ;
- Administration affichée selon contexte/rôle ;
- drawers pour informations riches secondaires ;
- confirmation explicite pour actions destructives ;
- toasts uniquement lorsque pertinents ;
- éviter badges et libellés techniques répétitifs sans valeur décisionnelle ;
- pas de fonctionnalité affichée si le backend ne la supporte pas réellement.

---

## 13. Dettes et limites à ne pas oublier

### Files

- vraie vue Corbeille ;
- restauration avant purge ;
- réservation atomique de stockage lors d’une restauration ;
- permission/politique de restauration.

### Billing / paiement

- provider réel non intégré ;
- données bancaires et changement de moyen de paiement à cadrer avec le provider ;
- audit fort requis sur ces opérations.

### Email utilisateur

- changement d’adresse email non encore exposé ;
- futur workflow de vérification obligatoire.

### Auth / ownership

- cas Google-only pour opérations nécessitant un mot de passe courant : dette connue, ne pas contourner côté frontend.

### Privacy / conformité

Dette future déjà identifiée :

- consentement cookies lorsqu’applicable ;
- RGPD ;
- conservation des données ;
- suppression/export ;
- politique de non-commercialisation ;
- articulation frontend + backend + juridique.

### Dashboard

Le dashboard Core reste volontairement technique et provisoire jusqu’aux modules métier.

### EntitlementOverride

Prévu après F9 dans le planning actuel :

```text
F10 — EntitlementOverride Workspace-scoped + Platform
```

Ne pas anticiper ce bloc dans F9 sans besoin backend explicitement vérifié.

---

## 14. État Platform au moment de la reprise

### Backend Platform existant

Le backend possède :

```text
backend/modules/platform/
  users/
  workspaces/
  plans/
  subscriptions/
  auditLogs/
  platform.routes.js
```

`platform.routes.js` applique une authentification commune puis délègue les autorisations aux sous-routeurs.

Routes Platform Users vérifiées :

```text
GET    /platform/users
GET    /platform/users/:userId
PATCH  /platform/users/:userId/disable
PATCH  /platform/users/:userId/enable
POST   /platform/users/:userId/revoke-sessions
PATCH  /platform/users/:userId/role
```

Ces routes passent par :

```text
authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN)
```

et par les validations appropriées.

Important : pour `workspaces`, `plans`, `subscriptions` et `audit-logs`, **ne pas inventer le contrat à partir du nom des dossiers**. La première action de F9 doit être de lire les routes/controllers/services/validations/tests backend réels avant de concevoir les écrans.

### Frontend Platform actuel

Le dossier existe :

```text
frontend/src/features/platform/
  components/
  constants/
  pages/
```

Les pages restent volontairement placeholders :

```text
platform-overview-placeholder-page.jsx
platform-section-placeholder-page.jsx
```

Ce n’est pas une dette oubliée : c’est le point de départ intentionnel de F9.

Le guard Platform existant est une protection UX. La vraie autorité reste le backend `super_admin`.

---

## 15. Ordre de production restant

Ordre figé :

```text
F8.5      Files frontend                              TERMINÉ
F8.6      Subscription / Plan / Trial                 TERMINÉ
F8.7      Workspace Settings / Ownership              TERMINÉ
F8.8      Audit / Dashboard Core                      TERMINÉ
F8.9      Account / Security                          TERMINÉ
F8-AUDIT  Maintenabilité + composants partagés        TERMINÉ
F8-UX     ToastProvider + rollout Core                TERMINÉ / VALIDÉ LOCALEMENT
F9.x      Platform Admin frontend réel                PROCHAIN BLOC
F10       EntitlementOverride Workspace-scoped        À VENIR
F11       Consolidation frontend + E2E                À VENIR
Modules métier                                         APRÈS GATE CORE
```

Aucun module métier ne doit commencer avant la consolidation Core et les E2E prévus.

---

## 16. Plan exact de reprise — F9 Platform Admin

### Étape F9.0 — Audit sécurité/contrat backend

Avant de coder :

1. lire `backend/modules/platform/platform.routes.js` ;
2. auditer successivement :
   - `platform/users` ;
   - `platform/workspaces` ;
   - `platform/plans` ;
   - `platform/subscriptions` ;
   - `platform/auditLogs` ;
3. relever pour chaque endpoint :
   - méthode + URL ;
   - validation Zod ;
   - rôle requis ;
   - shape request ;
   - shape response ;
   - pagination/filtres ;
   - mutations disponibles ;
   - audit logs générés ;
   - invariants métier ;
   - tests backend existants ;
4. identifier les besoins frontend réellement supportés ;
5. signaler explicitement toute action souhaitée par l’UI mais absente du backend ;
6. ne pas bricoler un contournement frontend.

### Étape F9.1 — Contrat RTK Query Platform

Créer/compléter une feature API Platform en restant sur le `baseApi` unique.

Ne pas créer une seconde instance RTK Query.

Prévoir des tags cohérents par ressource après audit réel du backend.

### Étape F9.2 — Users Platform

Candidat recommandé pour le premier vrai écran, car le contrat Users est déjà clairement exposé.

Attentes probables à confirmer par audit du backend :

- liste paginée ;
- détail utilisateur ;
- disable / enable ;
- révocation des sessions ;
- modification du rôle plateforme.

UX :

- `DataTable` obligatoire si compatible ;
- `DataPagination` obligatoire ;
- Drawer pour détails riches ;
- `ConfirmationDialog` pour actions sensibles ;
- Toast succès après mutation ;
- erreur dans la confirmation si le dialogue reste ouvert et permet un retry ;
- backend seul responsable de l’autorisation.

### Étapes F9 suivantes

Après Users, traiter seulement après audit :

- Workspaces Platform ;
- Plans Platform ;
- Subscriptions Platform ;
- Audit Logs Platform ;
- Overview Platform réel.

L’Overview doit être construit à partir de données réellement exposées, sans inventer des KPI inexistants.

---

## 17. Tests exigés pour F9

Pour chaque sous-lot :

### Unitaires / composants

- affichage loading/error/empty/data ;
- permissions UX ;
- rendu DataTable/Drawer/Confirmation ;
- Toast selon le contrat ;
- formatters.

### Intégration frontend

- appels RTK Query ;
- invalidations ;
- pagination ;
- mutations ;
- refus backend ;
- navigation éventuelle.

### Backend

Si F9 révèle un manque de sécurité ou de contrat backend, corriger le backend d’abord avec tests ciblés Supertest/Vitest avant raccordement frontend.

### Validation de fin de lot

Toujours :

1. tests ciblés ;
2. suite frontend globale si le lot touche des primitives/routes partagées ;
3. `npm run build` ;
4. validation manuelle pertinente ;
5. mise à jour de la checklist ;
6. documentation des décisions/dettes.

---

## 18. Garde-fous de développement à respecter

- JavaScript uniquement ;
- pas de TypeScript ;
- aucune approximation sur les endpoints ;
- sécurité backend prioritaire ;
- pas de logique métier lourde dans les pages ;
- pas de duplication de composants partagés ;
- pas de refactor hors périmètre ;
- ne pas modifier les espacements des tables localement ;
- ne pas recréer pagination/confirmation/drawer/toast/date picker si le besoin est déjà couvert ;
- ne pas inventer de permissions frontend ;
- ne pas considérer un masquage UX comme une sécurité ;
- garder les messages serveur utiles lorsqu’ils expliquent un refus métier ;
- commenter le pourquoi, pas le quoi ;
- JSDoc seulement lorsqu’il clarifie un contrat non trivial ;
- préserver les invariants commerciaux Trial/Plan/Subscription ;
- ne pas introduire EntitlementOverride prématurément ;
- conserver les synthèses et checklists vivantes.

---

## 19. Documents de référence à relire au besoin

Priorité frontend :

```text
docs/frontend-implementation-checklist.md
docs/frontend-maintenance-audit.md
docs/frontend-maintenance-audit-report.md
docs/frontend-data-table-contract.md
docs/frontend-toast-feedback-contract.md
```

Contrats/cadrage projet à conserver :

```text
SAAS-CORE-API — Contrat d’intégration frontend-backend
SAAS-CORE-API — Synthèse de cadrage consolidée
SAAS-CORE-API — Synthèse d’architecture consolidée User/Auth
Ordre conseillé d’implémentation
Checklist d’implémentation backend
Dette fonctionnelle Plan et Subscription
```

Pour F9, la source de vérité immédiate est néanmoins le code backend actuel de `backend/modules/platform/` et ses tests.

---

## 20. Phrase de reprise recommandée pour la nouvelle conversation

> Reprendre le projet SAAS-CORE-API à partir de la synthèse `SAAS-CORE-API-Synthese-de-reprise-2026-09-02-F8-finalise-avant-F9.md`. F8, F8-AUDIT et le rollout Toast Core sont terminés et validés localement. Le prochain bloc est F9 Platform Admin. Commencer par auditer exhaustivement le backend `backend/modules/platform/` et ses tests, confirmer les contrats et gardes `super_admin`, puis proposer le découpage F9 avant toute implémentation frontend. Ne modifier aucun élément hors périmètre et réutiliser obligatoirement les primitives DataTable, DataPagination, EntityDetailsDrawer, ConfirmationDialog, DatePicker, Tooltip et ToastProvider lorsqu’elles couvrent le besoin.

---

## 21. État final de cette reprise

Le Core frontend n’est plus en phase de rattrapage structurel.

Les blocs F8 sont fonctionnels, audités et validés. Le design system fonctionnel comprend désormais les primitives nécessaires pour construire l’administration Platform sans duplication. Le système de feedback global Toast est en place avec une politique anti-bruit claire et testée.

**Le prochain travail est F9 Platform Admin, en commençant impérativement par la vérification du backend Platform existant avant de créer les écrans réels.**
