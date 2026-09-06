# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il n'est pas normatif et doit suivre l'état réel du code. Il sera supprimé uniquement lorsque le Core sera finalisé et que sa suppression aura été explicitement validée.
>
> **Dernière mise à jour : 2026-09-06**

---

## 1. Hiérarchie d'autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. présent fichier de reprise.

Le présent fichier décrit l'état de travail et les décisions récentes. Il ne doit pas devenir une source concurrente des contrats canoniques.

**Attention documentaire actuelle :** `docs/contracts/PLATFORM-TEAM.md` et la section D-018 de `docs/DEBT.md` contiennent encore des statuts d'implémentation datant du cadrage A1/A2. Le code a avancé bien au-delà. Ils devront être réalignés lors de la prochaine consolidation documentaire, sans utiliser leurs anciens statuts pour annuler le code et les tests plus récents.

---

## 2. État général du projet

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement production-ready.

Roadmap Core actuellement pertinente :

```text
CORE-FIN-1  reprise et clôture F10.6                         ✅
CORE-FIN-2  audit fonctionnel complet                       ✅
CORE-FIN-3  corrections révélées par l'audit                ✅
CORE-FIN-4  D-001 fermeture Account / Workspace             ✅
CORE-FIN-5  D-014 points d'extension métier                 ✅
D-018       Équipe de la Plateforme / RBAC / invitations    EN COURS
D-015       versionnement / migrations / release            PLANIFIÉ
D-016       Playwright / E2E Core                            PLANIFIÉ
Audit final architecture / sécurité / qualité               À VENIR
D-017       dérivation pilote + upgrade Core                PLANIFIÉ
Release v1.0.0                                               À VENIR
```

La couverture E2E Playwright reste une dette distincte D-016.

---

## 3. Dernière baseline globale réellement validée

Avant les derniers ajouts A5.8 et Audit Metadata, l'utilisateur a confirmé :

```text
backend : tests ciblés / fonctionnels concernés verts
frontend : tests ciblés verts
frontend : tests globaux verts
frontend : build Vite OK
```

Cette baseline validait notamment D-014 et l'essentiel de D-018 jusqu'à A5.7 avant les micro-ajustements UX ultérieurs.

**Important :** plusieurs changements plus récents sont présents sur `main` mais n'ont pas encore reçu une confirmation de validation globale après leur ajout. Ils sont listés explicitement plus bas.

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

Aucune autodécouverte dynamique ou système de plugins implicite n'a été ajouté. La composition reste explicite, auditable et testable.

---

## 5. D-018 — Architecture Équipe de la Plateforme

Modèle actif :

```text
User
→ identité / authentification

PlatformTeamMember
→ appartenance interne à l'équipe de la Plateforme

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

### Invariants Fondateur

```text
exactement un Fondateur actif
Fondateur → toujours Super administrateur
Super administrateur → pas nécessairement Fondateur
```

Le Fondateur ne peut pas être rétrogradé, suspendu, révoqué ou fermé via l'administration ordinaire.

Un futur transfert de la qualité de Fondateur devra être un workflow dédié, fortement sécurisé et audité. Ne jamais simuler ce transfert par une modification de rôle.

### Super administrateur

Plusieurs Super administrateurs sont supportés.

Le rôle système `super_admin` reçoit toutes les permissions actives du registre Platform, y compris les permissions applicatives ajoutées ultérieurement.

Le système protège l'invariant d'au moins un Super administrateur actif.

### Runtime authorization

Les permissions Platform sensibles sont résolues depuis l'état DB courant et non depuis un rôle embarqué dans le JWT.

```text
requête sensible
→ resolvePlatformAuthorization()
→ PlatformTeamMember courant
→ PlatformRole courant
→ permissions effectives courantes
```

Une suspension/révocation prend donc effet sans attendre l'expiration d'un access token.

Le fallback legacy `User.platformRole === super_admin` ne concerne que les utilisateurs n'ayant jamais eu de membership Platform et reste transitoire.

Un membership historique `REVOKED` ne doit jamais retomber sur ce fallback.

---

## 6. D-018 backend — état implémenté et validé

### A2 — Registre permissions / rôles système

Implémenté :

- registre de permissions Platform ;
- niveaux `DELEGABLE`, `SENSITIVE`, `RESERVED` ;
- presets système :
  - Super administrateur ;
  - Administrateur de la Plateforme ;
  - Support technique ;
  - Support commercial ;
  - Support client ;
- `authorizePlatformPermission` ;
- seed des rôles Platform ;
- extension applicative des permissions Platform ;
- Super administrateur = toutes les permissions actives.

### A3 — Invitations Platform sécurisées

Implémenté et validé :

- `PlatformInvitation` séparée des invitations Workspace ;
- token aléatoire 32 bytes / 64 hex ;
- stockage SHA-256 uniquement ;
- email canonique exact ;
- expiration ;
- resend avec rotation du token ;
- revoke ;
- acceptance ;
- utilisateur existant : authentification requise + email exact ;
- nouvel utilisateur : identité issue de l'invitation, saisie du mot de passe uniquement ;
- `emailVerifiedAt` renseigné à l'acceptation ;
- aucune session implicite après création ;
- `CLIENT_URL` de confiance ;
- HTML échappé ;
- aucun token brut dans l'audit ;
- mutations transactionnelles ;
- rate limit public ;
- revalidation de l'invitant, du rôle et de l'assignabilité dans la transaction.

### A4 — Cycle de vie des membres Platform

Endpoints disponibles :

```text
GET    /api/platform/team/members
PATCH  /api/platform/team/members/:memberId/role
PATCH  /api/platform/team/members/:memberId/suspend
PATCH  /api/platform/team/members/:memberId/reactivate
DELETE /api/platform/team/members/:memberId
```

Protections :

- permissions exactes ;
- re-résolution de l'acteur dans la transaction ;
- protection Fondateur ;
- pas d'auto-changement de rôle/statut ;
- politique de stricte sous-puissance pour les acteurs ordinaires ;
- cible Super administrateur soumise à `platform:super_admins:manage` ;
- invariant dernier Super administrateur actif ;
- audit des mutations.

### A4.1 — Current Platform Context

Endpoint :

```text
GET /api/platform/me
```

Le frontend distingue correctement :

```text
Fondateur
Rôle : Super administrateur
```

La qualité de Fondateur n'est jamais déduite de `User.platformRole`.

### A4.2 — rôles personnalisés backend

Endpoints disponibles :

```text
GET   /api/platform/team/roles
GET   /api/platform/team/roles/permissions
GET   /api/platform/team/roles/:roleId
POST  /api/platform/team/roles
PATCH /api/platform/team/roles/:roleId
PATCH /api/platform/team/roles/:roleId/archive
```

État actuel du backend :

- clé technique opaque `custom_<UUID>` générée uniquement par le backend ;
- système / archived protégés ;
- permissions inconnues refusées ;
- permissions réservées refusées dans les rôles personnalisés ;
- anti-escalade ;
- archive refusée lorsqu'un membre ACTIVE/SUSPENDED utilise encore le rôle ;
- audit create/update/archive ;
- validation Zod stricte.

**Voir section 9 : de nouvelles règles de gouvernance ont été validées le 2026-09-06 et doivent encore durcir cette implémentation.**

### Route legacy supprimée côté backend

La mutation historique :

```text
PATCH /api/platform/users/:id/role
```

n'existe plus côté backend.

**Ne jamais la restaurer.**

---

## 7. D-018 frontend — état actuel

### A5.1 — structure Équipe de la Plateforme — VALIDÉ

Zone unique :

```text
Administration de la Plateforme
→ Équipe de la Plateforme
```

Navigation par vraies URLs :

```text
/platform/team/members
/platform/team/invitations
/platform/team/roles
```

Composant partagé : `SectionTabs`.

Le parent « Équipe de la Plateforme » reste actif sur ses routes enfants.

Les onglets sont filtrés par permissions runtime.

### A5.2 — Membres consultation — VALIDÉ

- RTK Query ;
- `DataTable` partagé ;
- pagination serveur ;
- badge Fondateur réutilisable ;
- statut actif/suspendu ;
- email retiré de la table Membres lorsque sans action métier utile ;
- table du Drawer adaptée à la largeur, sans scroll horizontal.

### A5.3 — actions membres — VALIDÉ

Actions conditionnelles :

- modifier le rôle ;
- suspendre ;
- réactiver ;
- révoquer.

Composants partagés utilisés :

- `DataTableActions` ;
- `ActionIconButton` ;
- `ConfirmationDialog` ;
- `SelectField` ;
- toasts.

Le frontend applique la policy UX, mais le backend reste l'autorité finale.

### A5.4 — Team Snapshot Dashboard — VALIDÉ

Backend : endpoint agrégé dédié, sans dériver les KPI depuis une page paginée de membres.

Snapshot :

```text
total
active
suspended
founderCount
byRole[]
```

La répartition expose également son pourcentage côté backend.

Frontend :

- section Dashboard « Organisation interne » ;
- `CollapsibleCard` ;
- `DistributionBarChart` ;
- `EntityDetailsDrawer` ;
- liste membres chargée uniquement à l'ouverture du Drawer ;
- aucune donnée d'équipe demandée sans `platform:team:read`.

### A5.5 — Vue d'ensemble permission-aware — VALIDÉ

Le Dashboard Platform n'est pas codé en dur par nom de rôle.

Principe :

```text
même Vue d'ensemble
→ sections composées par permissions runtime
```

Le backend expose `availableSections` et filtre réellement le cockpit avant réponse.

Le frontend suit cette projection et reste fail-closed.

Un rôle sans accès Audit ne reçoit pas les données Audit, y compris via des compteurs globaux permettant d'inférer des informations cachées.

### A5.6 — Invitations UI — couvert par la baseline frontend globale

UI disponible :

- liste des invitations actives ;
- rôle prévu ;
- informations d'envoi / expiration existantes selon DTO ;
- formulaire d'invitation dans Drawer ;
- Zod frontend ;
- choix du rôle ;
- resend ;
- revoke ;
- permissions runtime ;
- RTK Query.

Un point UX supplémentaire sur l'âge de l'invitation est encore à traiter, voir section 11.

### A5.7 — Rôles et permissions — baseline VALIDÉE

UI disponible :

- liste rôles système + personnalisés ;
- Drawer de détail ;
- catalogue permissions ;
- création / modification de rôle personnalisé ;
- archivage ;
- rôles système en lecture seule ;
- `CheckboxField` accessible ;
- `Textarea` réutilisable ;
- permissions non assignables absentes du formulaire ;
- anti-escalade UX.

Derniers ajustements UX implémentés après cette baseline :

- tableau `Rôles et permissions` sans scroll horizontal ;
- description retirée de la cellule et déplacée dans `InfoTooltip` ;
- action œil : tooltip visuel court `Voir` ;
- `ActionIconButton` sépare désormais `label` (ARIA précis) et `tooltipLabel` (texte visuel court).

**Validation ciblée du tout dernier correctif `ActionIconButton` à reconfirmer**, car le premier test interrogeait le tooltip alors qu'il était `aria-hidden`; le test a été corrigé pour le faire apparaître au focus clavier.

### A5.8 — Acceptation invitation côté destinataire — IMPLÉMENTÉ, VALIDATION ENCORE À CONFIRMER

Flux implémenté :

```text
/platform-invitations/accept?token=...
```

Utilisateur existant :

```text
lien
→ login si nécessaire
→ retour au lien
→ acceptation authentifiée
→ email exact revérifié backend
→ CurrentPlatformContext invalidé
→ redirection vers première destination réellement autorisée
```

Nouvel utilisateur :

```text
lien
→ mot de passe + confirmation uniquement
→ identité issue de l'invitation
→ création + acceptation
→ aucune session implicite
→ retour Login
```

Le token n'est pas stocké dans `localStorage`.

Tests ciblés A5.8 et build doivent encore être confirmés après pull.

---

## 8. Audit Metadata Contract — IMPLÉMENTÉ, VALIDATION ENCORE À CONFIRMER

Un défaut architectural a été identifié le 2026-09-06 : le frontend conservait des listes statiques de confort pour les actions, ressources et statuts Audit.

Cela provoquait une divergence visible :

```text
backend : EntitlementOverride
frontend : catalogue absent
→ affichage technique anglais
→ filtre Ressource incomplet
```

Décision :

```text
BACKEND = unique source de vérité du vocabulaire Audit
FRONTEND = présentation uniquement
```

### Registre canonique backend

`backend/constants/auditActions.constants.js` contient désormais des registres enrichis dont sont dérivées les anciennes constantes techniques utilisées par le modèle et Zod.

Une entrée définit à la fois :

```text
key technique
value technique stable
label français
```

Les identifiants existants sont conservés pour la compatibilité des AuditLogs historiques.

### Metadata API

Deux contextes sécurisés exposent le même registre canonique :

```text
GET /api/platform/audit-logs/metadata
GET /api/workspaces/:workspaceId/audit-logs/metadata
```

La route Platform utilise `platform:audit_logs:read`.

La route Workspace conserve la chaîne de sécurité de lecture Audit Workspace : auth, contexte Workspace, permission `audit:read`, feature `audit_logs`.

### Frontend dynamique

Les listes statiques frontend suivantes ont été supprimées :

```text
AUDIT_ACTION_OPTIONS
AUDIT_ENTITY_TYPE_OPTIONS
AUDIT_STATUS_OPTIONS
```

Les filtres, libellés du tableau et la validation des filtres URL utilisent désormais les metadata reçues du backend.

Invariant attendu :

```text
nouvelle ressource ajoutée au registre backend
→ validation backend
→ metadata API
→ RTK Query
→ filtre frontend
→ libellé DataTable
```

sans ajout d'une table métier parallèle dans React.

Le fallback frontend est volontairement neutre :

```text
Action inconnue
Ressource inconnue
Statut inconnu
```

Il ne transforme plus une valeur technique anglaise en pseudo-libellé utilisateur.

Vocabulaire visible corrigé sur la page Platform :

```text
Audit logs            → Journaux d'audit
Événements Platform   → Événements de la Plateforme
Workspace             → Espace de travail
metadata              → métadonnées
EntitlementOverride   → Dérogation via metadata backend
```

### Validation à faire en priorité à la reprise

Depuis la racine :

```bash
npx vitest run backend/tests/auditLog backend/tests/platform/auditLogs
```

Depuis `frontend/` :

```bash
npx vitest run src/features/audit-log/api/audit-log-api.test.js src/features/audit-log/lib/audit-log-presentation.test.js src/features/audit-log/lib/audit-log-query-state.test.js src/features/audit-log/components/audit-log-filters.test.jsx src/features/audit-log/pages/workspace-audit-log-page.test.jsx src/features/platform/api/platform-audit-logs-api.test.js src/features/platform/pages/platform-audit-logs-page.test.jsx src/features/platform/pages/platform-audit-logs-route.test.jsx
```

Puis :

```bash
npm run build
```

Validation manuelle attendue :

```text
Journaux d'audit
→ action « Dérogation révoquée »
→ ressource « Dérogation »
→ filtre Ressource contient « Dérogation »
→ aucun « Entitlementoverride » visible
```

---

## 9. Décisions RBAC validées le 2026-09-06 — À INTÉGRER AU CONTRAT ET AU CODE

Ces décisions ont été explicitement approuvées mais ne sont pas encore toutes implémentées.

### 9.1 Permissions = code-owned uniquement

Une permission n'est jamais créée librement depuis l'UI ou directement en base.

```text
permission
→ déclarée dans le code / registre actif
→ protège une capacité réellement implémentée
```

Le frontend peut sélectionner des permissions existantes pour composer un rôle ; il ne peut pas inventer une clé.

### 9.2 Rôles système immuables

Les presets suivants restent stables :

```text
Super administrateur
Administrateur de la Plateforme
Support technique
Support commercial
Support client
```

Ils sont :

- non supprimables ;
- non archivables ;
- non modifiables depuis l'administration courante.

Une organisation ayant besoin d'une variante crée un rôle personnalisé au lieu d'altérer le preset Core.

### 9.3 Gouvernance des rôles personnalisés à durcir

Cible validée :

```text
Fondateur
OU
Super administrateur
→ créer / modifier / archiver les rôles personnalisés

Tous les autres rôles
→ jamais
```

Ce contrôle doit être imposé côté backend en plus des permissions runtime ordinaires.

Un rôle personnalisé :

- utilise uniquement des permissions du registre actif ;
- ne reçoit jamais de permission RESERVED ;
- reste soumis à l'anti-escalade ;
- conserve une description / justification métier explicite ;
- ne doit pas dupliquer exactement le jeu de permissions d'un rôle actif existant ;
- peut être archivé, jamais supprimé physiquement par le workflow courant.

### 9.4 Pas de permissions directement sur un utilisateur

À conserver :

```text
PlatformTeamMember
→ un rôle
→ permissions dérivées du rôle
```

Ne pas ajouter de `+permission` ou `-permission` spécifique à une personne.

### 9.5 Multi-rôles non retenu pour l'instant

Le Core reste :

```text
1 membre Platform
→ 1 rôle Platform
```

Un besoin hybride commercial + technique utilise un rôle personnalisé documenté.

Le multi-rôles ne devra être envisagé que si l'usage réel produit une explosion de rôles combinatoires.

### 9.6 Dérogation commerciale future

Ne pas donner automatiquement au Support commercial le moteur générique complet des `EntitlementOverride`.

Le besoin commercial identifié est plutôt une future capacité bornée, par exemple :

```text
Découverte commerciale
→ feature allowlistée
→ durée max
→ expiration obligatoire
→ motif
→ audit
→ permission dédiée
```

Ce mécanisme appartient à un futur lot métier/commercial séparé. **Ne pas l'implémenter dans D-018 sans cadrage dédié.**

---

## 10. Reliquat frontend legacy confirmé

`frontend/src/features/platform/api/platform-users-api.js` contient encore :

```text
updatePlatformUserRole
PATCH /platform/users/:userId/role
```

La route backend correspondante a été supprimée.

Ce reliquat frontend doit être retiré lors de la consolidation D-018.

**Ne jamais restaurer la route backend pour satisfaire ce code frontend obsolète.**

Vérifier également les pages/tests Platform Users qui pourraient encore importer cette mutation legacy.

---

## 11. Point UX Invitations encore à traiter

Besoin exprimé mais pas encore finalisé : rendre l'ancienneté d'une invitation réellement utile à la décision.

À cadrer après les validations prioritaires :

```text
date d'envoi
âge de l'invitation
expiration / temps restant
éventuellement nombre / date de renvoi si le backend l'expose
```

Objectif UX : aider un administrateur à décider s'il faut :

- attendre ;
- renvoyer ;
- révoquer ;
- vérifier une éventuelle erreur d'adresse.

Règle permanente : le frontend ne doit inventer aucun âge, historique de renvoi ou donnée temporelle non fournie par le backend. Les durées d'affichage peuvent être calculées à partir de timestamps réels exposés par l'API, mais l'historique métier doit rester backend-owned.

---

## 12. Composants frontend réutilisables à préserver

Réutilisabilité obligatoire :

- `DataTable` pour les tableaux compatibles ;
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

Pages : assemblage uniquement ; pas de logique métier lourde.

State :

```text
useState        → état local UI
Redux Toolkit   → vrai état global client
RTK Query       → server state
```

Ne pas créer de tableaux, drawers, confirmations ou formulaires parallèles lorsqu'un composant partagé peut être composé.

---

## 13. Règles permanentes de sécurité

Invariant :

```text
ne jamais faire confiance à l'utilisateur
ne jamais faire dépendre la sécurité du frontend
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
- vocabulaire métier exposé par les registres lorsqu'il constitue un contrat backend.

Validation Zod stricte obligatoire.

MongoDB :

- `sanitizeFilter` reste activé ;
- ne jamais le contourner ;
- les filtres Mongo internes contenant `$in`, `$gt`, `$lte`, etc. utilisent `mongoose.trusted()` selon la convention du projet.

Mutations sensibles :

- réautorisation dans la transaction lorsque nécessaire ;
- audit ;
- fail-closed ;
- pas de confiance dans un rôle JWT obsolète.

---

## 14. Tests — conventions de reprise

### Backend

Depuis la racine du projet.

Les tests peuvent être regroupés par fonctionnalité complète.

Éviter les commandes Bash multi-lignes avec `\` sous Windows.

### Frontend

L'utilisateur entre lui-même dans :

```bash
cd frontend
```

Ensuite utiliser :

```bash
npx vitest run ...
```

**Ne pas utiliser `npm --prefix frontend` dans les commandes frontend.**

Après un lot significatif :

```bash
npx vitest run
npm run build
```

---

## 15. Prochaine reprise exacte

La prochaine discussion doit repartir dans cet ordre, sans lancer immédiatement une nouvelle fonctionnalité.

### Étape 1 — synchroniser

```bash
git pull
```

### Étape 2 — valider Audit Metadata Contract

Backend :

```bash
npx vitest run backend/tests/auditLog backend/tests/platform/auditLogs
```

Frontend depuis `frontend/` :

```bash
npx vitest run src/features/audit-log/api/audit-log-api.test.js src/features/audit-log/lib/audit-log-presentation.test.js src/features/audit-log/lib/audit-log-query-state.test.js src/features/audit-log/components/audit-log-filters.test.jsx src/features/audit-log/pages/workspace-audit-log-page.test.jsx src/features/platform/api/platform-audit-logs-api.test.js src/features/platform/pages/platform-audit-logs-page.test.jsx src/features/platform/pages/platform-audit-logs-route.test.jsx
```

Puis :

```bash
npm run build
```

Faire ensuite la vérification visuelle « Dérogation » décrite en section 8.

### Étape 3 — valider les derniers micro-ajustements A5.7

Depuis `frontend/` :

```bash
npx vitest run src/components/shared/action-icon-button.test.jsx src/features/platform/components/platform-roles-section.test.jsx
```

### Étape 4 — valider A5.8 invitation acceptance

Depuis `frontend/` :

```bash
npx vitest run src/features/platform-invitation/api/platform-invitation-acceptance-api.test.js src/features/platform-invitation/validation/platform-invitation-schemas.test.js src/features/platform-invitation/pages/accept-platform-invitation-page.test.jsx src/features/auth/pages/login-page.destination.test.js src/app/platform-invitation-route.test.js
```

Puis refaire au minimum :

```bash
npx vitest run
npm run build
```

### Étape 5 — mettre à jour le contrat D-018 avant de durcir les rôles

Aligner `docs/contracts/PLATFORM-TEAM.md` sur les décisions de la section 9 :

- permissions code-owned ;
- rôles système immuables ;
- rôles personnalisés Founder/Superadmin uniquement ;
- pas de clone exact de permissions ;
- justification métier ;
- mono-rôle conservé.

Mettre ensuite à jour `docs/DEBT.md` pour ne plus indiquer A3/A4/A5 comme « à faire ».

### Étape 6 — implémenter le durcissement RBAC des rôles personnalisés

Backend d'abord :

- policy Founder/Superadmin ;
- interdiction clone exact ;
- validation de la justification métier retenue ;
- tests unitaires/service/routes ;
- aucun relâchement de l'anti-escalade actuelle.

Frontend ensuite :

- actions créer/modifier/archiver uniquement pour Founder/Superadmin ;
- aucun bouton indisponible affiché inutilement ;
- backend reste autorité finale.

### Étape 7 — traiter l'UX temporelle Invitations

Cadrer les timestamps backend disponibles puis afficher uniquement des informations réelles : date d'envoi, âge, expiration restante, et si pertinent historique de resend exposé par l'API.

### Étape 8 — consolidation D-018

- supprimer `updatePlatformUserRole` frontend legacy et ses usages ;
- rechercher les autres reliquats `User.platformRole` servant encore d'autorité frontend ;
- régression backend/frontend ;
- build ;
- checklist manuelle du cycle complet ;
- audit sécurité final D-018 ;
- mettre à jour les documents canoniques ;
- seulement ensuite décider si D-018 peut passer `VALIDÉ`.

---

## 16. Ce qu'il ne faut pas faire à la reprise

Ne pas :

- restaurer `PATCH /platform/users/:id/role` ;
- rendre les rôles système modifiables ;
- permettre la création libre de permissions depuis l'UI ;
- coder un Dashboard différent par nom de rôle ;
- dériver Founder de `User.platformRole` ;
- ajouter des permissions directement sur un User ;
- passer au multi-rôles sans preuve d'un besoin réel ;
- donner au Support commercial le moteur générique complet de dérogations pour résoudre le besoin de découverte commerciale ;
- réintroduire des catalogues métier statiques frontend lorsqu'ils doivent venir du backend ;
- créer un composant de tableau/drawer/confirmation dupliqué ;
- déclarer D-018 terminé avant les validations et la consolidation listées ci-dessus.

---

## 17. Fichiers de référence prioritaires pour la prochaine discussion

```text
docs/REPRISE-CURRENT.md
docs/DEBT.md
docs/contracts/PLATFORM-TEAM.md

backend/constants/auditActions.constants.js
backend/modules/auditLog/auditLogMetadata.service.js
backend/modules/auditLog/*
backend/modules/platform/auditLogs/*

backend/modules/platformTeam/*
backend/modules/platformRole/*
backend/modules/platformInvitation/*
backend/config/applicationPlatformPermission.registry.js

frontend/src/features/platform/*
frontend/src/features/platform-invitation/*
frontend/src/features/audit-log/*
frontend/src/components/data-display/data-table.jsx
frontend/src/components/shared/entity-details-drawer.jsx
frontend/src/components/shared/action-icon-button.jsx
frontend/src/components/shared/info-tooltip.jsx
```

---

## 18. Résumé de reprise en une phrase

Le Core a terminé D-014 et possède désormais l'essentiel du modèle Équipe de la Plateforme / RBAC / invitations de D-018 ; avant toute nouvelle fonctionnalité, il faut valider les derniers changements A5.8 + Audit Metadata, aligner les contrats canoniques sur les décisions RBAC du 2026-09-06, durcir la gouvernance des rôles personnalisés, finaliser l'UX Invitations puis effectuer la consolidation et la régression finale D-018.
