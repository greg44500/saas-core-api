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

### C. Anciennes sources d'architecture absorbées ou encore utilisées

DOC-3 a consolidé les règles structurelles encore valides issues notamment de :

- `frontend-architecture-security-principles.md` ;
- `frontend-decisions-consolidation.md` ;
- état réel de `frontend/src/` ;
- état réel de `backend/` ;
- `package.json` backend et frontend ;
- contrats DOC-2.

Les anciens documents frontend restent cependant nécessaires comme sources pour DOC-4 Sécurité et DOC-5 Guidelines frontend avant de devenir candidats à suppression.

Documents principalement UI/UX encore à absorber :

- `frontend-data-table-contract.md` ;
- `frontend-toast-feedback-contract.md` ;
- `platform-overview-dashboard-contract.md` ;
- `dashboard-workspace-platform-boundary.md` ;
- `core-plan-navigation-ui-conventions.md` ;
- policies et checklists de `frontend/docs/`.

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
| DOC-4 | Sécurité | prochain lot |
| DOC-5 | Guidelines frontend et composants réutilisables | à faire |
| DOC-6 | SaaS dérivés et maintenance du Core | à faire |
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

Le prochain lot est **DOC-4 — Sécurité**.

Il consolidera notamment : authentification et sessions, isolation tenant, validation stricte, RBAC, Platform permissions, entitlement, quotas, transactions, audit, sécurité des fichiers, erreurs/logging, secrets et garde-fous frontend/backend.

La documentation de sécurité devra compléter l'architecture sans dupliquer les contrats HTTP déjà consolidés.
