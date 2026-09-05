# SAAS-CORE-API — Index documentaire

**Statut :** index canonique de la documentation du projet  
**Dernière mise à jour :** 2026-09-05

## 1. Objet

Ce fichier est la porte d'entrée de la documentation interne de `saas-core-api`.

Le développement fonctionnel reste temporairement suspendu avant la reprise de F10.6 afin de terminer la consolidation documentaire.

La documentation structurante est centralisée progressivement sous `docs/` à la racine. Le dossier historique `frontend/docs/` reste présent pendant la migration, mais ne constitue plus un second silo documentaire durable.

Aucun document existant n'est supprimé tant que son contenu utile n'a pas été vérifié, consolidé puis que sa suppression n'a pas été explicitement autorisée.

---

## 2. Hiérarchie d'autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés validés ;
3. contrats canoniques actifs ;
4. architecture, sécurité et conventions canoniques ;
5. registre des dettes actives ;
6. documentation opérationnelle ;
7. documentation historique ;
8. `REPRISE-CURRENT.md`.

Une synthèse de reprise, une checklist ou un rapport d'implémentation ne peut jamais redéfinir le comportement réel du Core.

---

## 3. Documents canoniques actifs

### Gouvernance

```text
docs/README.md
→ index documentaire et tableau de migration

docs/DEBT.md
→ registre unique des dettes actives

docs/REPRISE-CURRENT.md
→ reprise temporaire unique pendant le développement
```

### Contrats

```text
docs/contracts/CORE-CONTRACT.md
→ contrat HTTP et fonctionnel transversal du Core

docs/contracts/COMMERCIAL.md
→ Plan, baseline, Subscription, trial, entitlement, quotas et overrides

docs/contracts/CAPABILITIES.md
→ Capability Registry et extension par les applications dérivées
```

Décisions importantes déjà corrigées contre le code courant :

- la clé technique d'un nouveau Plan est générée par le backend ;
- elle n'est pas exposée dans le catalogue public ;
- la baseline est identifiée par `systemRole = baseline` / `isBaseline`, pas par son nom commercial ;
- la vue Workspace expose les features et limites effectives après overrides actifs ;
- `ACTIVE_PLAN_CAPABILITY_REGISTRY` reste l'autorité runtime des capabilities.

### Architecture

```text
docs/architecture/ARCHITECTURE.md
→ responsabilités globales du Core, contextes Account / Workspace / Platform et frontière Core / métier

docs/architecture/BACKEND.md
→ architecture Node/Express/Mongoose, modules, responsabilités des couches, jobs, migrations et tests

docs/architecture/FRONTEND.md
→ architecture React par features, composants, routing, state management, RTK Query et extension métier
```

Les documents d'architecture utilisent les versions réellement installées comme référence. Au 2026-09-05, le frontend courant est notamment React 19 / React Router 8 / Vite 8 ; les anciens cadrages citant des versions antérieures ne sont plus normatifs.

### Sécurité

```text
docs/security/SECURITY.md
→ défense en profondeur, Auth/AuthSession, validation, multi-tenant, RBAC, Platform,
  entitlements, quotas, transactions, Files, AuditLog, HTTP, secrets et frontend
```

Décisions structurantes :

- le JWT n'est jamais l'unique autorité : le User est rechargé depuis MongoDB ;
- le refresh token brut n'est jamais persisté et reste dans un cookie HttpOnly ;
- un User authentifié n'acquiert aucun accès automatique à un Workspace ;
- permission, entitlement et quota restent trois contrôles distincts ;
- les quotas sensibles utilisent des réservations atomiques ;
- le pipeline File valide le contenu avant persistance et relit l'entitlement dans la transaction ;
- le frontend améliore l'UX mais n'est jamais une frontière d'autorisation suffisante.

### Guidelines frontend

```text
docs/frontend/FRONTEND-GUIDELINES.md
→ règles pratiques UI/UX, composants réutilisables, state, RTK Query,
  navigation, formulaires, feedback, accessibilité, responsive, performance et tests
```

Règles frontend désormais canoniques :

- même intention UI → même famille de composants ;
- `DataTable` est obligatoire pour les tableaux compatibles avec sa primitive ;
- drawers, confirmations, formulaires et composants transverses existants sont réutilisés lorsque leur contrat convient ;
- server state → RTK Query ; navigation partageable → URL ; form state → React Hook Form ; état local → React ; Redux global uniquement si justifié ;
- les entrées de navigation et actions sont filtrées par permissions et capabilities lorsque celles-ci sont applicables ;
- une feature absente ne doit pas polluer inutilement l'interface avec des blocs permanents indisponibles ;
- l'absence d'une capability d'écriture ne signifie cependant pas automatiquement que toute surface de lecture doit disparaître ;
- le frontend ne reconstruit pas les règles commerciales ni les données métier non fournies par le backend ;
- Playwright reste la cible E2E mais n'est pas présenté comme installé tant qu'il n'apparaît pas dans les dépendances du projet.

---

## 4. Structure documentaire cible

```text
docs/
├── README.md
├── DEBT.md
├── REPRISE-CURRENT.md
│
├── architecture/
│   ├── ARCHITECTURE.md
│   ├── BACKEND.md
│   └── FRONTEND.md
│
├── contracts/
│   ├── CORE-CONTRACT.md
│   ├── COMMERCIAL.md
│   └── CAPABILITIES.md
│
├── frontend/
│   └── FRONTEND-GUIDELINES.md
│
├── security/
│   └── SECURITY.md
│
├── derived-saas/
│   └── DERIVED-SAAS.md
│
├── compliance/
│   ├── COMPLIANCE.md
│   └── rgpd-data-tracker-inventory.md
│
└── operations/
    └── OPERATIONS.md
```

Cette arborescence pourra être simplifiée si un document distinct n'apporte pas de valeur réelle.

Le `README.md` racine du dépôt sera créé en fin de chantier afin de pointer vers des chemins stabilisés.

---

## 5. Classification de la documentation existante

### A. Reprises et jalons historiques

Documents destinés à devenir candidats à suppression après vérification finale :

- `SAAS-CORE-API-Synthese-de-reprise-2026-09-02-F8-finalisation-avant-F8-AUDIT.md` ;
- `SAAS-CORE-API-Synthese-de-reprise-2026-09-02-F8-finalise-avant-F9.md` ;
- `SAAS-CORE-API-Synthese-de-reprise-2026-09-02-F8.6.3-Drawer-F8.7.md` ;
- `backend-core-v1-ready-for-frontend.md` ;
- rapports `frontend-f*-implementation-report.md` ;
- anciennes checklists de jalons ;
- rapports d'audit de maintenance terminés.

Git conserve l'historique ; ces documents n'ont pas vocation à constituer une archive permanente du dépôt.

### B. Anciens contrats absorbés par DOC-2

Leur contenu normatif utile est désormais consolidé dans `docs/contracts/` :

- `frontend-backend-integration-contract.md` ;
- `frontend-backend-account-security-contract.md` ;
- `frontend-backend-roles-permissions-contract.md` ;
- `frontend-backend-subscription-contract.md` ;
- `frontend-platform-admin-contract.md` ;
- `commercial-configuration-contract.md` ;
- `commercial-plans-entitlements-platform-admin.md` ;
- `application-capability-registry-contract.md`.

Ils restent physiquement présents jusqu'à autorisation explicite de suppression.

### C. Anciennes sources frontend absorbées par DOC-3, DOC-4 et DOC-5

Le contenu encore valide des anciennes policies frontend a maintenant été réparti entre :

```text
docs/architecture/FRONTEND.md
→ structure et responsabilités

docs/security/SECURITY.md
→ règles de sécurité transversales

docs/frontend/FRONTEND-GUIDELINES.md
→ règles pratiques de développement UI/UX
```

Sont notamment absorbés comme sources historiques :

- `frontend-architecture-security-principles.md` ;
- `frontend-decisions-consolidation.md` ;
- `frontend-design-system-components-policy.md` ;
- `frontend-state-management-policy.md` ;
- `frontend-routing-navigation-policy.md` ;
- `frontend-auth-session-policy.md` ;
- `frontend-auth-forms-ux-policy.md` ;
- `frontend-feedback-errors-policy.md` ;
- `frontend-onboarding-workspace-policy.md` ;
- `frontend-performance-loading-policy.md` ;
- `frontend-ux-experience-policy.md` ;
- `frontend-dashboard-activity-panel-policy.md` ;
- `frontend-subscription-navigation-ux-policy.md` ;
- `frontend-final-foundations-policy.md` ;
- `frontend-data-table-contract.md` ;
- `frontend-toast-feedback-contract.md` ;
- les checklists associées.

Les documents suivants restent à vérifier pendant les lots ultérieurs car ils touchent également la frontière dashboards/commercial/Platform ou la maintenance :

- `platform-overview-dashboard-contract.md` ;
- `dashboard-workspace-platform-boundary.md` ;
- `core-plan-navigation-ui-conventions.md`.

Aucun de ces fichiers n'est supprimé avant le lot DOC-10 et l'autorisation explicite.

### D. Dette

`DEBT.md` est l'unique source du statut des dettes.

Les anciens documents `functional-debt-*` et `core-deferred-work-for-derived-saas.md` restent temporairement des annexes de cadrage jusqu'aux lots correspondants.

### E. Conformité

Sources à consolider dans `compliance/COMPLIANCE.md` :

- `rgpd-cookies-privacy-technical-cadrage.md` ;
- `functional-debt-privacy-cookies-rgpd.md` ;
- `functional-debt-rgpd-cookies-privacy-legal.md`.

`rgpd-data-tracker-inventory.md` reste un inventaire vivant distinct.

### F. SaaS dérivés et opérations

Les règles restantes seront regroupées dans :

- `derived-saas/DERIVED-SAAS.md` pour création, extension, versionnement et mise à niveau d'un SaaS dérivé ;
- `operations/OPERATIONS.md` pour environnement, seeds, migrations, jobs, stockage, antivirus et opérations de développement/production.

---

## 6. Règle frontend / backend

La centralisation documentaire ne supprime pas la séparation des responsabilités.

Le backend et le frontend gardent leurs architectures propres, mais une même règle structurante ou un même contrat ne doit pas être documenté dans deux versions concurrentes.

Un contrat d'API appartient à la frontière frontend/backend et n'est documenté qu'une seule fois sous `docs/contracts/`.

Une documentation strictement locale à un module pourra exceptionnellement rester près du code lorsqu'elle ne définit aucune règle globale.

---

## 7. Tableau de migration

| Lot | Objet | État |
|---|---|---|
| DOC-0 | Gouvernance des dettes et reprise unique | terminé |
| DOC-1 | Inventaire, classification et index documentaire | terminé |
| DOC-2 | Contrats Core / commercial / capabilities | terminé |
| DOC-3 | Architecture globale, backend et frontend | terminé |
| DOC-4 | Sécurité | terminé |
| DOC-5 | Guidelines frontend et composants réutilisables | terminé |
| DOC-6 | SaaS dérivés et maintenance du Core | prochain lot |
| DOC-7 | Conformité / RGPD | à faire |
| DOC-8 | Opérations | à faire |
| DOC-9 | Consolidation finale de la dette | à faire |
| DOC-10 | Propositions de suppression et nettoyage validé | à faire |
| DOC-11 | README racine et audit documentaire final | à faire |

---

## 8. Règle de suppression

Aucun fichier n'est supprimé automatiquement.

Pour chaque lot de nettoyage :

1. vérifier le contenu utile ;
2. l'intégrer dans le document canonique concerné ;
3. vérifier la cohérence avec le code et les tests ;
4. présenter la liste exacte des fichiers devenus inutiles ;
5. obtenir une validation explicite ;
6. seulement ensuite effectuer la suppression.

---

## 9. Prochaine étape

Le prochain lot est **DOC-6 — SaaS dérivés et maintenance du Core**.

Il formalisera la création d'une application métier à partir du Core, les frontières à respecter, le versionnement du socle, l'identification de la version utilisée par chaque produit, la stratégie de mise à niveau contrôlée, les migrations, les tests de non-régression et la place éventuelle de GitHub Template dans une stratégie plus large de maintenance.
