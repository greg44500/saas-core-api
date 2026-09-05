# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il n'est pas normatif et sera supprimé uniquement lorsque le Core sera finalisé et que sa suppression aura été explicitement validée.

## 1. Hiérarchie d'autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. documents historiques temporairement conservés ;
8. présent fichier.

Le présent fichier décrit uniquement l'état de reprise. Il ne doit jamais conserver une règle métier plus récente qu'un contrat canonique.

---

## 2. État général du projet

Le chantier documentaire **DOC-0 → DOC-11** est terminé.

Les lots de finalisation suivants sont clôturés :

```text
CORE-FIN-1  reprise et clôture F10.6                    ✅
CORE-FIN-2  audit fonctionnel complet                  ✅
CORE-FIN-3  corrections révélées par l'audit           ✅
CORE-FIN-4  D-001 fermeture Account / Workspace        ✅
```

Le dépôt reste en version de développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement production-ready.

Validation CORE-FIN-4 confirmée par l'utilisateur :

```text
backend : tests complets verts
frontend : tests ciblés verts
frontend : tests globaux verts
frontend : build Vite OK
```

Une consolidation UX / Platform / Files a ensuite été réalisée avant CORE-FIN-5. L'utilisateur a confirmé le lot vert, le build frontend OK et la validation visuelle frontend OK.

La couverture E2E Playwright reste une dette distincte D-016.

---

## 3. Roadmap de finalisation Core

Roadmap active :

```text
CORE-FIN-1  reprise et clôture F10.6                    ✅
CORE-FIN-2  audit fonctionnel complet                  ✅
CORE-FIN-3  corrections révélées par l'audit           ✅
CORE-FIN-4  D-001 fermeture Account / Workspace        ✅
CORE-FIN-5  D-014 points d'extension métier            PROCHAIN
CORE-FIN-6  D-015 versionnement / migrations / release
CORE-FIN-7  D-016 Playwright / E2E Core
CORE-FIN-8  audit final architecture / sécurité / qualité
CORE-FIN-9  D-017 dérivation pilote + upgrade Core
CORE-FIN-10 release v1.0.0
```

Avant chaque bloc, vérifier le HEAD réel et les contrats canoniques ; ne pas repartir d'une ancienne checklist historique.

---

## 4. Documentation canonique active

Porte d'entrée :

```text
README.md
```

Index :

```text
docs/README.md
```

Références principales :

```text
docs/DEBT.md

docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md

docs/architecture/ARCHITECTURE.md
docs/architecture/BACKEND.md
docs/architecture/FRONTEND.md

docs/security/SECURITY.md
docs/frontend/FRONTEND-GUIDELINES.md
docs/derived-saas/DERIVED-SAAS.md

docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md

docs/operations/OPERATIONS.md
docs/development-trial-reset.md
```

`frontend/README.md` reste le guide local du frontend.

Aucun ancien document historique ne doit être utilisé pour contredire ces sources canoniques.

---

## 5. CORE-FIN-4 / D-001 — état final validé

### 5.1 Fermeture Account

Endpoints :

```text
GET  /api/users/me/closure-impact
POST /api/users/me/closure
```

Confirmation forte :

```text
currentPassword
confirmationEmail
confirmAccountClosure = true
```

Le backend recalcule toujours la situation réelle depuis MongoDB.

Workflow :

```text
simple membre
→ memberships retirées
→ quota membre libéré
→ Workspaces tiers restent actifs

owner
→ Workspaces encore possédés archivés automatiquement
→ Workspaces transférés auparavant restent actifs
→ memberships du User retirées
→ AuthSessions révoquées
→ User ACTIVE → DELETION_REQUESTED → CLOSED
```

Le frontend place « Fermer mon compte » dans la page Sécurité et affiche l'impact réel fourni par le backend avant confirmation.

Après succès, la session frontend est terminée et le cache RTK Query est purgé.

### 5.2 Archivage Workspace owner

Endpoint :

```text
POST /api/workspaces/:workspaceId/archive
```

Protection :

```text
owner-only backend
+ mot de passe courant
+ confirmation exacte du nom
```

Transition :

```text
ACTIVE → ARCHIVED
```

Effets :

- Subscriptions commerciales closables neutralisées ;
- baseline conservée ;
- invitations pendantes révoquées ;
- AuditLog ;
- données non supprimées physiquement par ce workflow.

Le frontend expose cette action dans les paramètres du Workspace uniquement lorsque le contexte indique le rôle système owner. Cette visibilité reste une règle UX ; le backend revérifie l'ownership.

### 5.3 Fermeture terminale Workspace

```text
PATCH /api/platform/workspaces/:workspaceId/close
```

`CLOSED` reste une décision Platform / administrative et ne doit pas être exposé comme commande owner.

### 5.4 Auth après fermeture

`deletion_requested` et `closed` sont refusés sur :

```text
login
access token / authenticate
refresh token
reset-password
```

`forgot-password` garde une réponse neutre anti-énumération sans permettre une récupération réactivant ces états.

`disabled` reste une suspension administrative distincte : memberships et Workspaces sont conservés et la réactivation reste possible.

---

## 6. Consolidation post-CORE-FIN-4 validée

Cette consolidation a été réalisée avant CORE-FIN-5 afin de ne pas démarrer les points d'extension métier avec des incohérences UX ou Platform connues.

### 6.1 Confirmations / modales

`ConfirmationDialog` reste la primitive partagée des confirmations sensibles.

Son overlay applique désormais un léger flou d'arrière-plan (`backdrop-blur-sm`) afin de renforcer la présence de la modale sans dupliquer ce comportement dans chaque feature.

### 6.2 Navigation Workspace et fichier

Le groupe de navigation contenant `Fichiers` est présenté comme **Ressources**, et non comme « Fonctionnalités ».

Distinction à conserver :

```text
file:read
→ consultation des fichiers existants

file_upload
→ possibilité de nouveaux téléversements
```

Une absence de `file_upload` ne doit donc pas masquer automatiquement la ressource Fichiers si `file:read` reste accordé.

Côté affichage commercial utilisateur, lorsque `file_upload` n'est pas effectif :

```text
Stockage                   —
Téléversements mensuels    —
```

Cette neutralisation est uniquement une règle de présentation. Les valeurs backend ne sont ni supprimées ni falsifiées.

### 6.3 Listing Files scalable

Le listing Files supporte désormais des filtres serveur pour :

```text
category
search
```

La validation est faite côté backend et pagination / total sont calculés sur le résultat filtré. Ne jamais remplacer ce comportement par un filtrage uniquement frontend sur la page courante.

Le tableau Files a été simplifié :

```text
Fichier | Catégorie | Taille | Ajouté le | Actions
```

Décisions UX :

- suppression du MIME visible `application/pdf` dans la liste ;
- suppression de la colonne Type redondante ;
- nom de fichier tronqué lorsque nécessaire, nom complet disponible au survol ;
- largeur des colonnes maîtrisée afin d'éviter une scrollbar horizontale dans le layout desktop normal ;
- catégorie filtrable ;
- recherche par nom serveur-side.

Le MIME reste une donnée de sécurité backend et n'a pas été retiré du modèle ni du contrôle de type réel.

### 6.4 Dérogations Platform

Le backend conserve la séparation :

```text
FEATURE override
≠
LIMIT override
```

L'administration Platform présente désormais plus clairement :

```text
Plan
Dérogation
Effectif
```

pour les limites d'un Workspace et permet d'ajuster une limite sans modifier le Plan catalogue des autres clients.

Les libellés techniques / ambigus ont été corrigés :

```text
Capability
→ Fonctionnalité ou Limite selon le type

Valeur
→ Action appliquée / Valeur appliquée

État
→ Statut de la dérogation
```

Le statut de dérogation reste utile côté Platform car il distingue notamment :

```text
Active
Planifiée
Expirée
Révoquée
```

### 6.5 Liens secondaires compacts

Un composant partagé `InlineIconLink` est disponible pour les actions de navigation secondaires placées à côté d'une entité.

Usage actuel : dans le détail d'une dérogation, le Workspace est affiché ainsi :

```text
Workspace Laetitia BALLAT  ↗
```

avec tooltip « Voir le workspace », au lieu d'un gros bouton sous le nom.

### 6.6 Drawer Workspace Platform

Le détail administratif d'un Workspace n'affiche plus son ObjectId technique.

L'identifiant reste bien entendu disponible et utilisé par le backend, RTK Query et les routes ; il n'est simplement plus exposé dans ce drawer sans besoin UX.

### 6.7 Création / modification des Plans : fonctionnalités + quotas

Création et modification utilisent le même `PlatformPlanForm`.

Fonctionnalités et métriques sont regroupées par les métadonnées de présentation du Capability Registry :

```text
category
categoryLabel
displayOrder
```

Pour une catégorie contenant exactement une fonctionnalité et une ou plusieurs métriques, le switch de la fonctionnalité pilote un dépliage UX des quotas :

```text
OFF
→ quotas repliés

ON
→ quotas dépliés
```

Le dépliage utilise le composant partagé `SmoothCollapse` avec une transition courte et compatible `prefers-reduced-motion`.

Le passage OFF n'efface pas les valeurs déjà configurées. Un OFF → ON restitue donc les paramètres précédents.

Important : ce mécanisme reste une association de présentation, pas une dépendance métier implicite.

Si une catégorie contient plusieurs fonctionnalités, le Core ne doit pas deviner arbitrairement quel switch contrôle quelle métrique. Dans ce cas les métriques restent visibles tant qu'un lien explicite n'est pas déclaré par le futur contrat d'extension D-014.

Ne jamais hardcoder dans React une relation du type :

```text
file_upload → storage_bytes / file_uploads_monthly
```

Le futur mécanisme métier pourra, si nécessaire, déclarer explicitement les métriques associées à une feature.

### 6.8 Validation du lot

L'utilisateur a confirmé après cette consolidation :

```text
tests : verts
frontend build : OK
validation visuelle frontend : OK
```

Aucune dette UX connue de ce lot ne doit bloquer le démarrage de CORE-FIN-5.

---

## 7. Rétention et conformité : ce qui reste ouvert

Invariant :

```text
fermeture fonctionnelle / archivage
≠
purge physique immédiate
```

D-001 est clôturée, mais D-006 reste ouverte pour chaque produit réel :

- durée de conservation ;
- anonymisation / pseudonymisation ;
- purge définitive ;
- sauvegardes ;
- exceptions légales ;
- articulation avec données contractuelles et financières.

Le Core ne doit pas coder une durée juridique universelle.

---

## 8. Multi-workspace et vocabulaire métier — décision clarifiée

Le Core V1 reste techniquement multi-workspace :

```text
User → 0..N Workspaces
```

Il n'impose pas une limite commerciale universelle du nombre de Workspaces par User.

Le modèle commercial V1 reste Workspace-scoped :

```text
Workspace
├── Subscription
├── UsageMetric
└── EntitlementOverride
```

Une application dérivée peut néanmoins :

- fonctionner avec un seul Workspace logique ;
- masquer le mot « Workspace » derrière un vocabulaire métier comme organisation, établissement, cabinet ou espace client ;
- ajouter une ressource métier interne comme `Dossier` ;
- monétiser une métrique métier, par exemple 5 / 10 / illimité dossiers, via le Capability Registry et les limites de Plan ;
- ajouter plus tard une couche commerciale multi-workspace si son modèle produit le justifie.

Ne pas utiliser le nombre de Workspaces pour représenter artificiellement une ressource métier interne au tenant.

---

## 9. D-004 Billing — décisions déjà figées mais non codées

Ces décisions restent à conserver pour D-004 :

```text
incident paiement
→ User reste ACTIVE
→ Subscription porte l'état commercial réel
→ Workspace peut entrer en remediation / future grâce
```

Une future grâce commerciale doit être :

- temporaire ;
- motivée ;
- auditée ;
- permissionnée côté Platform ;
- automatiquement expirante ;
- distincte d'EntitlementOverride.

Un médiateur humain ne doit jamais modifier MongoDB manuellement, forcer artificiellement `Subscription.status` ni manipuler PAN/CVV.

Un paiement externe doit être rapproché par une commande métier dédiée, puis le domaine Billing décide de la conséquence sur Subscription.

---

## 10. Règles permanentes de développement

### Sécurité

```text
ne jamais faire dépendre la cohérence
uniquement de la coopération du frontend ou de l'utilisateur
```

Le backend reste l'autorité sur :

- ownership ;
- memberships ;
- permissions ;
- entitlement ;
- quotas ;
- lifecycle ;
- conséquences des mutations sensibles.

### Frontend

Réutilisabilité obligatoire :

- `DataTable` pour les tableaux compatibles ;
- confirmations partagées ;
- drawers partagés ;
- formulaires réutilisables ;
- `InlineIconLink` pour les liens secondaires compacts lorsque ce pattern est pertinent ;
- `SmoothCollapse` pour les dévoilements progressifs réutilisables ;
- pages légères ;
- RTK Query pour le server state ;
- Redux Toolkit pour le vrai state global client ;
- `useState` pour le state local.

### Fichiers du dépôt

```text
ne supprimer ou déplacer aucun fichier
sans approbation explicite préalable de l'utilisateur
```

---

## 11. Prochaine reprise exacte

Prochain bloc :

```text
CORE-FIN-5 / D-014
Points d'extension métier : RBAC et routing backend/frontend
```

Objectif : permettre à un petit module métier de référence d'enregistrer proprement :

```text
permissions métier
extensions des rôles système
routes backend
routes frontend
navigation / capabilities
```

sans modifier directement de longues listes centrales du Core et sans introduire une architecture plugin complexe prématurée.

Point d'attention issu de la consolidation précédente : le futur contrat d'extension doit également permettre de déclarer proprement les métadonnées UX d'une capability et, lorsque nécessaire, la relation explicite entre une feature et les métriques qui lui sont associées. Le frontend ne doit pas inférer cette relation à partir de clés techniques ou de hardcodes métier.

Avant de coder :

1. auditer les points d'extension existants du HEAD ;
2. vérifier `docs/derived-saas/DERIVED-SAAS.md`, `CAPABILITIES.md` et D-014 ;
3. proposer le contrat minimal de composition ;
4. inclure dans ce contrat les besoins de présentation / association feature-metrics sans transformer le Core en framework de plugins complexe ;
5. coder backend et frontend en mini-lots testables ;
6. valider les tests avant de poursuivre.
