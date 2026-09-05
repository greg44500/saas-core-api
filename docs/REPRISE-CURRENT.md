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

## 6. Rétention et conformité : ce qui reste ouvert

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

## 7. Multi-workspace et vocabulaire métier — décision clarifiée

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

## 8. D-004 Billing — décisions déjà figées mais non codées

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

## 9. Règles permanentes de développement

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

## 10. Prochaine reprise exacte

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

Avant de coder :

1. auditer les points d'extension existants du HEAD ;
2. vérifier `docs/derived-saas/DERIVED-SAAS.md`, `CAPABILITIES.md` et D-014 ;
3. proposer le contrat minimal de composition ;
4. coder backend et frontend en mini-lots testables ;
5. valider les tests avant de poursuivre.
