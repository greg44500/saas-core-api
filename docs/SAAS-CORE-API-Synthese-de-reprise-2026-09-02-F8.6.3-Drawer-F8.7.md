# SAAS-CORE-API — Synthèse de reprise
## Clôture F8.6.3, Drawer partagé et préparation F8.7

**Date :** 2 septembre 2026  
**Projet :** `greg44500/saas-core-api`  
**Branche :** `main`  
**Référence fonctionnelle avant création de cette synthèse :** `71cf94306073c4f0f2474453f8fe19a9fb51e590`  
**Objectif de reprise :** terminer la validation finale de F8.6.3 après le correctif du Drawer partagé, puis démarrer F8.7 Workspace Settings / Ownership sans modifier hors périmètre.

---

# 1. Point de reprise immédiat

Le frontend Core a progressé jusqu’à **F8.6.3 — cycle de vie commercial**.

Les fonctionnalités de F8.6.3 sont implémentées et les tests du bloc ont été signalés verts avant le dernier correctif UX transversal.

Un correctif a ensuite été demandé sur le composant partagé :

`frontend/src/components/shared/entity-details-drawer.jsx`

Ce correctif est maintenant implémenté dans le composant générique lui-même :

- ouverture fluide depuis la droite ;
- fermeture fluide vers la droite ;
- durée de transition : `300 ms` ;
- fondu synchronisé du voile de fond ;
- maintien du composant monté pendant la transition de fermeture ;
- désactivation des interactions pendant la sortie ;
- `aria-hidden` appliqué pendant la phase fermée ;
- ombre légère partagée `shadow-lg` ;
- prise en compte de `motion-reduce` côté classes de transition ;
- aucun style spécifique ajouté dans Files ou Subscription.

Un test dédié a été ajouté :

`frontend/src/components/shared/entity-details-drawer.test.jsx`

Il vérifie notamment :

- la classe de transition du panneau ;
- la translation droite/gauche ;
- l’ombre générique ;
- le maintien du Drawer dans le DOM pendant les 300 ms de fermeture ;
- le démontage après la transition ;
- le fondu du voile de fond.

---

# 2. Validation à exécuter en premier dans la prochaine conversation

Le dépôt ne possède pas de workflow GitHub Actions exploitable pour lancer automatiquement cette validation depuis l’environnement connecté, et l’environnement d’exécution actuel n’a pas accès au réseau pour cloner le dépôt.

Il ne faut donc pas prétendre que le correctif Drawer est déjà validé par exécution.

Après le `git pull`, exécuter depuis `frontend/` :

```bash
npm test -- src/components/shared/entity-details-drawer.test.jsx
npm test
npm run build
```

Si les trois commandes sont vertes :

1. marquer le correctif Drawer `TERMINÉ` dans `docs/frontend-implementation-checklist.md` ;
2. marquer F8.6.3 `TERMINÉ` ;
3. démarrer F8.7.

Aucune nouvelle fonctionnalité F8.6.3 ne doit être ajoutée avant cette validation.

---

# 3. Commits récents à connaître

Avant le correctif Drawer, la tête du dépôt était :

```text
b7ca6ea4df01aef29ee164c2de8e79295977e7ef
 test(subscription-ui): align lifecycle date formatting
```

Correctif Drawer :

```text
c0f7b5b3002a8ce21e6643aab81b3b494dbf0b9c
 fix(ui): animate shared details drawer
```

Test du Drawer :

```text
0a81093abd75abb87b52c39b0d52ad327c6b521e
 test(ui): cover shared drawer transitions
```

Ajustement de l’ombre :

```text
caaa05e478db34f3d9bd8e7b70bbfaf6326fe841
 style(ui): soften shared drawer shadow
```

Alignement du test :

```text
e8b965ab2560bc19c8ad98533f8655250ce7cba7
 test(ui): align shared drawer shadow
```

Mise à jour de la checklist frontend :

```text
71cf94306073c4f0f2474453f8fe19a9fb51e590
 docs(frontend): record F8.6.3 drawer validation checkpoint
```

---

# 4. État global du Core

Ordre de production actuel :

```text
F8.5      Files frontend                              TERMINÉ
F8.6.1    Subscription / Plan / Trial — lecture       TERMINÉ
F8.6.2    Trial / changement de plan                  TERMINÉ
F8.6.3    Résiliation / downgrade                     VALIDATION FINALE POST-DRAWER
F8.7      Workspace Settings / Ownership frontend     PROCHAIN BLOC
F8.8      Audit / Dashboard Core frontend
F8.9      Account / Security frontend
F8-AUDIT  Maintenabilité + commentaires + JSDoc       OBLIGATOIRE AVANT F9
F9.x      Platform Admin frontend réel
F10       EntitlementOverride Workspace-scoped + Platform
F11       Consolidation frontend + E2E
```

Aucun module métier ne doit commencer avant la fermeture du Gate A.

---

# 5. Principe architectural à conserver

`saas-core-api` reste un socle SaaS générique.

La dépendance doit rester :

```text
Application métier
→ utilise les primitives du Core

Core
→ ne dépend d’aucun domaine métier
```

Le Core connaît notamment :

```text
Auth
User
Workspace
WorkspaceMember
WorkspaceInvitation
Role
Permission
Plan
Subscription
Trial
Entitlement
UsageMetric
Files
AuditLog
Platform Admin
```

Il ne doit pas intégrer des objets métier tels que Product, Supplier, Recipe, TrainingGroup, Project, Stock ou équivalent.

---

# 6. Stack figée

## Frontend

- React + Vite ;
- JavaScript uniquement ;
- Tailwind CSS ;
- shadcn/ui ;
- Lucide ;
- React Router ;
- Redux Toolkit ;
- RTK Query ;
- Vitest ;
- React Testing Library ;
- Playwright pour les E2E.

## Backend

- Node.js ESM ;
- Express.js ;
- MongoDB ;
- Mongoose ;
- Zod ;
- Argon2id ;
- JWT access token ;
- refresh token cookie HttpOnly ;
- Vitest ;
- Supertest.

## Gestion d’état frontend

```text
useState / useReducer
→ état UI local

Redux Toolkit
→ état client global durable

RTK Query
→ données serveur et cache serveur

React Router / URL
→ contexte navigable
```

Ne pas dupliquer les données serveur RTK Query dans Redux.

---

# 7. Architecture frontend à respecter

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
└── utils/
```

Règles :

- pages légères ;
- logique métier hors des pages ;
- RTK Query pour les APIs ;
- composants génériques dans `components/shared` ou `components/ui` ;
- composants propres à une fonctionnalité dans `features/<feature>/components` ;
- aucun contrôle de sécurité réellement confié au frontend ;
- le backend reste l’autorité.

Le Drawer corrigé est volontairement dans `components/shared` car son animation, son ombre et son comportement doivent être identiques partout.

---

# 8. Décisions UX transversales importantes

Les décisions suivantes sont déjà figées :

- Sidebar Workspace rétractable ;
- tooltips lorsque la Sidebar est fermée ;
- transitions visuelles fluides ;
- Topbar avec profil et déconnexion ;
- navigation Administration selon rôle/permissions ;
- tables paginées avec actions conditionnelles ;
- Drawer pour les ensembles de données ou historiques détaillés lorsqu’il évite de surcharger la page ;
- les styles structurants d’un Drawer doivent rester dans le composant partagé ;
- les écrans métier ne doivent pas réimplémenter animation, overlay, ombre ou comportement de fermeture ;
- chaînes visibles utilisateur en français ;
- statuts techniques traduits par une couche de présentation lorsque nécessaire.

---

# 9. Backend Core — état de référence

Le Backend Core V1 est considéré prêt pour le frontend.

Le checkpoint RBAC-EXT a été clôturé après régression globale backend verte le 2 septembre 2026.

Le registre de permissions est maintenant extensible sans inscrire de permissions métier dans le Core.

Architecture RBAC :

```text
User
→ WorkspaceMember
→ Role
→ permissions[]
```

Rôles système :

```text
owner
admin
manager
member
reader
```

Principales permissions Core :

```text
workspace:read
workspace:update
workspace:ownership:transfer

member:read
member:invite
member:update
member:suspend
member:remove

role:read
role:create
role:update
role:delete

subscription:read
audit:read

file:read
file:upload
file:delete
```

Invariant anti-escalade :

```text
permissions(targetRole)
⊆
permissions(actorRole)
```

`workspace:ownership:transfer` reste une permission réservée au workflow owner et non délégable à un rôle personnalisé.

---

# 10. Workspace et multi-tenant

Le Workspace reste la frontière tenant fondamentale.

La création d’un Workspace orchestre notamment :

```text
Workspace
+
rôles système
+
WorkspaceMember owner
+
Subscription Free baseline
+
UsageMetric initiales
+
AuditLog
```

Un User peut structurellement appartenir à plusieurs Workspaces par ses memberships.

Le frontend ne doit donc pas supposer qu’un User ne possède qu’un Workspace.

En revanche, la politique commerciale permettant la création libre de plusieurs Workspaces par une même identité n’est pas à inventer dans le frontend.

---

# 11. Décision commerciale majeure — ne pas revenir en arrière

L’ancienne architecture suivante est abandonnée pour la V1 :

```text
Free = 1 workspace inclus
Premium = 5 workspaces inclus
1 abonnement Premium couvre plusieurs workspaces
CommercialAccount obligatoire
UsageMetric scope commercial_account
metricKey = workspaces
Subscription déplacée au-dessus du Workspace
```

Ne pas réintroduire ces hypothèses.

Architecture V1 active :

```text
Workspace
├── Subscription
├── Plan
├── UsageMetric
├── WorkspaceMember
├── Role
├── Files
└── AuditLog
```

`Subscription` et `UsageMetric` restent Workspace-scoped.

---

# 12. Plans / Subscription / Trial — règles figées

## Plan

Séparation obligatoire :

```text
feature
→ capacité disponible ou non

limit
→ quantité autorisée
```

Ne jamais coder une fonctionnalité avec :

```js
if (plan.key === 'premium')
```

Utiliser les capabilities et limites.

Familles de plans envisagées :

```text
Free
Premium
IA
```

La référence historique `Premium = 79 € HT / mois` existe, mais la signification « 79 € pour 5 Workspaces » est abandonnée.

Les valeurs commerciales définitives devront être confirmées avant Billing réel.

## Trial

Règles :

- Free sans trial ;
- trial possible sur plan payant selon le Plan ;
- aucun moyen de paiement requis actuellement pour démarrer le trial ;
- TrialEligibility empêche la répétition abusive ;
- changement de plan pendant trial sans reset de `trialEndsAt` ;
- retour volontaire vers Free met fin définitivement au trial et consomme l’éligibilité ;
- transfert d’ownership ne recrée jamais le trial ;
- frontend ne reconstruit jamais lui-même l’entitlement.

---

# 13. F8.5 — Files frontend

F8.5 est terminé :

- listing paginé ;
- lecture ;
- téléchargement via `baseQueryWithReauth` ;
- upload `FormData` sécurisé ;
- validation frontend Zod des métadonnées ;
- backend autorité pour MIME réel, antivirus, quota, permission et entitlement ;
- soft delete ;
- cache `WorkspaceFiles` invalidé après mutations ;
- permissions `file:read`, `file:upload`, `file:delete` prises en compte dans l’UX.

Cycle backend :

```text
active
→ deleted
→ purged
```

Le soft delete conserve physiquement le fichier jusqu’à purge, mais libère le quota `storage_bytes` immédiatement.

## Dette Corbeille

Une vraie Corbeille de type Google Drive reste différée :

- listing des fichiers `deleted` ;
- restauration avant purge ;
- permission de restauration ;
- nouvelle réservation atomique de `storage_bytes` ;
- gestion du manque de quota au moment de restaurer ;
- affichage du délai avant purge ;
- audit dédié.

Référence : `docs/functional-debt-file-trash-restore.md`.

Ne pas ajouter implicitement cette fonctionnalité dans un autre lot.

---

# 14. F8.6.1 — Lecture Subscription

Terminé :

- feature `frontend/src/features/subscription/` ;
- lecture consolidée `GET /workspaces/:workspaceId/subscription` ;
- accès via `subscription:read` ;
- navigation Abonnement ;
- affichage de `effectiveEntitlement` ;
- affichage du mode `normal` / `remediation` ;
- affichage des limites réellement fournies par le backend ;
- progression de trial seulement si le serveur confirme un trial commercial effectif ;
- catalogue public des plans ;
- lecture owner/admin ;
- commandes commerciales owner-only.

---

# 15. F8.6.2 — Trial et changement de plan

Terminé :

- `trialEnabled` et `trialDurationDays` exposés par le catalogue backend ;
- `trialEligibility.consumed` exposé sans donnée sensible de fingerprint ;
- démarrage/changement de trial owner-only ;
- changement de plan sans reset de la date de fin ;
- retour vers Free avec confirmation explicite ;
- mensualité/annualité choisie explicitement ;
- invalidation de `WorkspaceSubscription` après mutation ;
- outil `dev:reset-trial` de développement avec garde-fous stricts.

---

# 16. F8.6.3 — Cycle de vie commercial

Implémentation fonctionnelle terminée.

RTK Query expose maintenant les mutations :

```text
scheduleWorkspaceCancellation
revokeWorkspaceCancellation
scheduleWorkspaceDowngrade
revokeWorkspaceDowngrade
```

Contrats utilisés :

```text
POST   /workspaces/:workspaceId/subscription/:subscriptionId/cancellation
DELETE /workspaces/:workspaceId/subscription/:subscriptionId/cancellation

POST   /workspaces/:workspaceId/subscription/:subscriptionId/downgrade
DELETE /workspaces/:workspaceId/subscription/:subscriptionId/downgrade
```

Principes :

- actions commerciales réservées à l’owner dans l’UX ;
- backend reste autorité ;
- confirmation avant programmation ;
- dates effectives affichées ;
- motif de résiliation validé côté frontend lorsque fourni ;
- actions incompatibles filtrées/masquées pour éviter des parcours incohérents ;
- aucune règle de sécurité dépend de ce masquage ;
- chaque mutation invalide `WorkspaceSubscription` ;
- le frontend refetch ensuite la vérité serveur ;
- pas de reconstruction locale de l’entitlement ou de la transition commerciale ;
- Billing/Payment réel reste hors périmètre.

Composants importants :

```text
frontend/src/features/subscription/components/commercial-action-dialog.jsx
frontend/src/features/subscription/components/commercial-lifecycle-section.jsx
frontend/src/features/subscription/components/commercial-lifecycle-section.test.jsx
```

API :

```text
frontend/src/features/subscription/api/subscription-api.js
```

---

# 17. Correctif Drawer partagé — décision figée

Fichier :

```text
frontend/src/components/shared/entity-details-drawer.jsx
```

Le Drawer partagé doit être la source unique du comportement visuel commun.

Il gère maintenant :

```text
open=false
→ isVisible=false
→ translate-x-full
→ overlay opacity-0
→ maintien DOM 300 ms
→ démontage
```

À l’ouverture :

```text
montage
→ première frame hors écran
→ translate-x-0
→ overlay opacity-100
```

Le composant conserve également :

- fermeture Escape ;
- fermeture via overlay ;
- bouton de fermeture ;
- gestion du focus ;
- blocage du scroll de fond quand ouvert ;
- rôle `dialog` ;
- `aria-modal` ;
- labels/descriptions accessibles.

La fermeture passe le wrapper en `pointer-events-none` pendant la transition de sortie pour éviter les interactions avec un panneau déjà fonctionnellement fermé.

Cette logique ne doit pas être recopiée dans les features.

---

# 18. F8.7 — prochain bloc : Workspace Settings / Ownership

Ne pas coder immédiatement une UI à partir d’hypothèses.

Commencer F8.7 par un audit précis du backend déjà présent :

1. routes Workspace de lecture/mise à jour ;
2. validations Zod ;
3. permissions requises ;
4. contrat DTO de mise à jour ;
5. workflow réel de transfert d’ownership ;
6. confirmation renforcée du mot de passe ;
7. rôle de remplacement de l’ancien owner ;
8. invariants exactement un owner actif ;
9. AuditLog ;
10. erreurs backend à présenter côté frontend.

Le backend possède déjà un workflow de transfert de propriété sécurisé. Le frontend doit s’y conformer et ne pas inventer une variante simplifiée.

## Objectif UX F8.7

Prévoir au minimum une page ou section Settings du Workspace pour :

- afficher les informations du Workspace ;
- permettre les modifications autorisées par `workspace:update` ;
- distinguer les fonctions d’administration ordinaires du workflow ownership ;
- réserver le transfert d’ownership au propriétaire ;
- demander une confirmation renforcée ;
- rendre très explicites les conséquences du transfert ;
- refetch la vérité serveur après mutation.

Le transfert d’ownership doit rester une opération exceptionnelle et sensible, pas une action banale de profil.

## Tests attendus

Avant fermeture F8.7 :

- tests unitaires helpers/validation si nécessaires ;
- tests composants ;
- tests de permissions ;
- test owner vs admin ;
- test de confirmation ownership ;
- test d’erreur backend ;
- régression frontend globale ;
- build Vite ;
- checklist mise à jour.

---

# 19. Dette et travaux différés à conserver

## Files

`docs/functional-debt-file-trash-restore.md`

- Corbeille ;
- restauration ;
- quota à restaurer atomiquement ;
- politique de permission.

## Privacy / RGPD / cookies

`docs/functional-debt-privacy-cookies-rgpd.md`

À traiter avant production réelle selon l’architecture finale :

- politique de confidentialité ;
- conservation des données ;
- droits RGPD ;
- cookies et consentement lorsque nécessaires ;
- responsabilités frontend/backend selon la nature du traitement.

## Fermeture compte / Workspace

`docs/functional-debt-account-workspace-closure.md`

Ne pas confondre cette dette avec le soft delete des fichiers.

## Billing réel

Toujours différé :

- provider de paiement ;
- moyens de paiement ;
- taxes/TVA ;
- factures ;
- webhooks ;
- `past_due` définitif ;
- changements de coordonnées de paiement ;
- audits associés.

## EntitlementOverride

Prévu plus tard en F10.

Target retenue :

```text
Workspace
```

Pas `CommercialAccount`, pas permission individuelle utilisateur arbitraire.

---

# 20. Documents de référence prioritaires

À consulter avant toute décision contradictoire :

```text
docs/backend-implementation-checklist.md
docs/frontend-implementation-checklist.md
docs/frontend-backend-integration-contract.md
docs/frontend-backend-subscription-contract.md
docs/frontend-backend-roles-permissions-contract.md
docs/commercial-plans-entitlements-platform-admin.md
docs/frontend-maintenance-audit.md
docs/functional-debt-file-trash-restore.md
docs/functional-debt-account-workspace-closure.md
docs/functional-debt-privacy-cookies-rgpd.md
```

Le document `commercial-plans-entitlements-platform-admin.md` contient la correction de septembre 2026 qui supplante l’ancienne architecture CommercialAccount / 5 Workspaces.

---

# 21. Règles de production à continuer d’appliquer

Toujours :

1. auditer le contrat backend avant de coder une nouvelle vue sensible ;
2. signaler explicitement si un besoin frontend nécessite une modification backend ;
3. conserver le backend comme autorité de sécurité ;
4. utiliser RTK Query pour les données serveur ;
5. utiliser `useState` pour l’état UI local ;
6. ne créer de Redux global que pour un vrai état client global ;
7. utiliser les composants partagés plutôt que dupliquer le rendu ;
8. ne pas modifier hors périmètre ;
9. écrire les tests du lot ;
10. exécuter tests ciblés, régression et build ;
11. mettre à jour la checklist ;
12. documenter toute dette volontairement différée.

---

# 22. Ce qu’il ne faut pas faire à la reprise

Ne pas :

- démarrer un module métier ;
- réintroduire `CommercialAccount` ;
- déplacer Subscription au-dessus du Workspace ;
- coder `Free = 1 workspace / Premium = 5 workspaces` ;
- ajouter un quota `workspaces` sans nouvelle décision explicite ;
- ajouter une vraie Corbeille dans F8.7 ;
- intégrer Stripe ou un autre provider de paiement dans F8.7 ;
- simplifier le transfert d’ownership en simple changement de rôle ;
- dupliquer le style du Drawer dans une feature ;
- marquer F8.6.3 TERMINÉ avant validation post-Drawer.

---

# 23. Critère de sortie immédiat

La prochaine conversation doit commencer par :

```bash
git pull
cd frontend
npm test -- src/components/shared/entity-details-drawer.test.jsx
npm test
npm run build
```

Si tout est vert :

```text
F8.6.3 → TERMINÉ
Drawer partagé → TERMINÉ
F8.7 → DÉMARRAGE
```

Puis auditer le contrat backend Workspace/Ownership avant toute implémentation frontend.

---

# 24. Résumé court

Le Core générique est toujours la priorité.

F8.5, F8.6.1 et F8.6.2 sont clôturés.

F8.6.3 est fonctionnellement implémenté : résiliation et downgrade programmés/révocables, dates effectives, confirmations, restrictions UX owner-only et refetch RTK Query après mutation.

Le dernier correctif transversal rend `EntityDetailsDrawer` réellement réutilisable avec le même mouvement fluide et la même séparation visuelle dans toutes les vues.

La seule étape manquante avant de déclarer F8.6.3 totalement terminé est la validation locale post-Drawer : test ciblé, régression frontend et build.

Après validation, le prochain travail est **F8.7 Workspace Settings / Ownership**, en commençant impérativement par l’audit du contrat backend existant.
