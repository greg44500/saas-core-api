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
→ registre unique des dettes actives et distinction Core 1.0 / production dérivée

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

### SaaS dérivés et maintenance du Core

```text
docs/derived-saas/DERIVED-SAAS.md
→ création d'un produit dérivé, frontière Core/métier, versionnement,
  stratégie Git, upgrades, migrations, tests et points d'extension
```

Décisions désormais canoniques :

- un produit qui doit recevoir les futures mises à jour du Core conserve l'historique Git du Core ;
- GitHub Template reste éventuellement utile pour un démarrage indépendant, mais n'est pas la stratégie canonique de maintenance ;
- le futur produit possède son propre dépôt `origin` et conserve le dépôt Core comme `upstream-core` ;
- le Core doit être versionné à partir d'une vraie release `v1.0.0` avant diffusion comme socle finalisé ;
- chaque produit doit tracer séparément sa propre version et la version Core intégrée ;
- une mise à niveau Core passe par une branche dédiée, revue des release notes/migrations/configuration, tests puis Pull Request ;
- les capabilities et la navigation Workspace possèdent déjà des points de composition ;
- les permissions métier, le routing backend/frontend, la traçabilité de version Core et le release process doivent encore être finalisés avant 1.0 ;
- l'extraction du Core en packages séparés n'est pas retenue pour la V1 et sera réévaluée après plusieurs produits réels.

### Conformité / RGPD

```text
docs/compliance/COMPLIANCE.md
→ cadre canonique RGPD, cookies/traceurs, information, rétention,
  droits, sous-traitants, transferts, AIPD, violations et gate pré-production

docs/compliance/rgpd-data-tracker-inventory.md
→ inventaire technique vivant des données, stockages, traceurs, prestataires et points de collecte
```

Décisions désormais canoniques :

- conformité technique, documentation juridique et exploitation sont trois responsabilités complémentaires ;
- le Core prépare des mécanismes génériques mais chaque SaaS dérivé doit qualifier ses traitements réels ;
- l'inventaire technique ne remplace pas le registre des activités de traitement ;
- aucun consentement ne doit être demandé pour une finalité fictive ;
- le Core actuel possède un cookie `refreshToken` d'authentification et une préférence de thème en `localStorage`, mais aucun SDK analytics/publicitaire ni script tiers de tracking identifié ;
- une bannière cookies générale n'est donc pas imposée aujourd'hui ; un Consent Manager ne devient nécessaire que si des traceurs soumis au consentement sont réellement ajoutés ;
- les durées techniques ne sont pas automatiquement des durées réglementaires ;
- responsable de traitement et sous-traitant doivent être qualifiés traitement par traitement ;
- transferts hors UE/EEE, AIPD et procédure de violation de données font partie de la revue pré-production.

### Opérations

```text
docs/operations/OPERATIONS.md
→ installation, environnement, MongoDB, démarrage, seeds, migrations,
  jobs, stockage, antivirus, health checks, déploiement et rollback
```

Décisions opérationnelles désormais canoniques :

- l'environnement est validé en fail-fast et applique des garde-fous supplémentaires en production ;
- MongoDB est une dépendance indispensable au démarrage et doit supporter les transactions utilisées par le Core ;
- `autoIndex` est désactivé en production : les indexes doivent être gérés par migrations ;
- seeds, migrations, jobs et opérations destructives de développement sont quatre mécanismes distincts ;
- les jobs sont des processus autonomes ; leur fréquence et leur supervision appartiennent au déploiement réel ;
- le provider File courant est uniquement `local`, malgré une abstraction préparée pour de futurs providers ;
- ClamAV applique une politique fail-closed, mais sa disponibilité n'est pas encore contrôlée par une readiness de démarrage ;
- `/api/health` est actuellement un liveness HTTP et non une readiness complète ;
- le rollback du code ne constitue jamais un rollback automatique des données.

### Dette consolidée — DOC-9

`docs/DEBT.md` distingue désormais explicitement :

```text
Core 1.0 finalisé
≠
SaaS dérivé prêt pour la production
```

Blockers Core 1.0 actuellement identifiés :

```text
D-001 fermeture de compte / cycle de vie Workspace
D-014 points d'extension RBAC + routing backend/frontend
D-015 versionnement / provenance / release process / migrations
D-016 E2E Core Playwright
D-017 dérivation + upgrade réel d'un SaaS pilote
```

Les sujets Billing, conformité finale, observabilité, rétention réglementaire, stockage production et infrastructure restent des blockers du produit dérivé lorsqu'ils sont applicables, mais ne sont plus présentés comme des conditions universelles pour stabiliser le socle générique.

DOC-9 ne remplace pas l'audit fonctionnel post-documentation : la reprise F10.6 et l'audit code/tests devront encore confirmer la roadmap complète de clôture.

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

Le `README.md` racine du dépôt sera créé en fin de chantier afin de pointer vers des chemins stabilisés.

---

## 5. Classification de la documentation existante

### A. Reprises et jalons historiques

Documents candidats au nettoyage après vérification finale :

- `SAAS-CORE-API-Synthese-de-reprise-2026-09-02-F8-finalisation-avant-F8-AUDIT.md` ;
- `SAAS-CORE-API-Synthese-de-reprise-2026-09-02-F8-finalise-avant-F9.md` ;
- `SAAS-CORE-API-Synthese-de-reprise-2026-09-02-F8.6.3-Drawer-F8.7.md` ;
- `backend-core-v1-ready-for-frontend.md` ;
- rapports `frontend-f*-implementation-report.md` ;
- anciennes checklists de jalons ;
- rapports d'audit de maintenance terminés.

Git conserve l'historique ; ces documents n'ont pas vocation à constituer une archive permanente du dépôt.

### B. Anciens contrats absorbés par DOC-2

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

Les documents suivants restent à vérifier pendant DOC-10 car ils touchent plusieurs frontières :

- `platform-overview-dashboard-contract.md` ;
- `dashboard-workspace-platform-boundary.md` ;
- `core-plan-navigation-ui-conventions.md`.

### D. Dette et conformité

`DEBT.md` est l'unique source du statut des dettes.

Les anciens `functional-debt-*`, `core-deferred-work-for-derived-saas.md`, cadrages RGPD et ancien inventaire restent physiquement présents uniquement en attente de DOC-10.

Références actives de conformité :

```text
docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md
```

### E. Opérations

Référence active :

```text
docs/operations/OPERATIONS.md
```

Les fragments opérationnels des anciennes checklists ne deviennent pas des sources concurrentes.

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
| DOC-6 | SaaS dérivés et maintenance du Core | terminé |
| DOC-7 | Conformité / RGPD | terminé |
| DOC-8 | Opérations | terminé |
| DOC-9 | Consolidation finale de la dette | terminé |
| DOC-10 | Propositions de suppression et nettoyage validé | prochain lot |
| DOC-11 | README racine et audit documentaire final | à faire |

---

## 8. Règle de suppression

Aucun fichier n'est supprimé automatiquement.

Pour DOC-10 :

1. vérifier que le contenu utile est réellement absorbé ;
2. vérifier les références internes restantes ;
3. présenter la liste exacte des fichiers devenus inutiles ;
4. obtenir une validation explicite ;
5. seulement ensuite effectuer les suppressions autorisées.

---

## 9. Prochaine étape

Le prochain lot est **DOC-10 — Propositions de suppression et nettoyage validé**.

DOC-10 ne supprimera rien sans autorisation explicite. Il produira d'abord une liste exacte, classée et justifiée des fichiers historiques/redondants devenus candidats à suppression, ainsi que des éventuels chemins à conserver.