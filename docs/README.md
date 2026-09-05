# SAAS-CORE-API — Index documentaire

**Statut :** index canonique de la documentation du projet  
**Dernière mise à jour :** 2026-09-05

## 1. Objet

Ce fichier est la porte d'entrée de la documentation interne de `saas-core-api`.

Le projet est en cours de consolidation documentaire avant la reprise du développement fonctionnel à partir de F10.6.

La documentation structurante doit être centralisée sous `docs/` à la racine. Le dossier historique `frontend/docs/` reste présent pendant la migration, mais il ne doit plus devenir un second silo documentaire durable.

Aucun document existant ne doit être supprimé tant que son contenu utile n'a pas été vérifié, consolidé dans la documentation canonique correspondante et que la suppression n'a pas été explicitement validée.

---

## 2. Hiérarchie d'autorité

En cas de contradiction, l'ordre de référence est :

1. code actuel et contraintes de base de données ;
2. tests automatisés validés ;
3. contrats canoniques actifs ;
4. architecture, sécurité et conventions canoniques ;
5. registre des dettes actives ;
6. documentation opérationnelle ;
7. documentation historique ;
8. `REPRISE-CURRENT.md`.

Une synthèse de reprise, une checklist ou un rapport d'implémentation ne peut donc jamais redéfinir le comportement réel du Core.

---

## 3. Documents déjà canoniques

### `DEBT.md`

Registre unique des dettes fonctionnelles, techniques, de conformité et de préparation à la production encore actives.

Les anciens fichiers de dette servent uniquement de sources de cadrage tant que leur contenu n'a pas été consolidé.

### `REPRISE-CURRENT.md`

Document temporaire unique de reprise entre deux sessions ou conversations.

Il est mis à jour en place et sera supprimé lorsque le Core sera finalisé et que la documentation canonique sera complète.

### `README.md` du présent dossier

Index documentaire et tableau de migration vers la structure cible.

---

## 4. Structure documentaire cible

La structure cible est la suivante :

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

Cette arborescence pourra être simplifiée si la consolidation montre qu'un document séparé n'apporte pas de valeur suffisante.

Le `README.md` racine du dépôt sera créé en fin de chantier afin de pointer vers des chemins stabilisés.

---

## 5. Classification de la documentation existante

### A. Reprises et jalons historiques

Documents destinés à devenir supprimables après vérification de leur contenu encore utile :

- `SAAS-CORE-API-Synthese-de-reprise-2026-09-02-F8-finalisation-avant-F8-AUDIT.md` ;
- `SAAS-CORE-API-Synthese-de-reprise-2026-09-02-F8-finalise-avant-F9.md` ;
- `SAAS-CORE-API-Synthese-de-reprise-2026-09-02-F8.6.3-Drawer-F8.7.md` ;
- `backend-core-v1-ready-for-frontend.md` ;
- anciens rapports de mise en œuvre `frontend-f*-implementation-report.md` ;
- anciennes checklists de jalons frontend ;
- rapports d'audit de maintenance terminés.

Git conserve l'historique ; ces fichiers n'ont pas vocation à devenir une archive permanente du projet.

### B. Contrats à consolider

Sources à vérifier contre le code et les tests puis à intégrer dans `contracts/CORE-CONTRACT.md`, `contracts/COMMERCIAL.md` ou `contracts/CAPABILITIES.md` :

- `frontend-backend-integration-contract.md` ;
- `frontend-backend-account-security-contract.md` ;
- `frontend-backend-roles-permissions-contract.md` ;
- `frontend-backend-subscription-contract.md` ;
- `frontend-platform-admin-contract.md` ;
- `commercial-configuration-contract.md` ;
- `commercial-plans-entitlements-platform-admin.md` ;
- `application-capability-registry-contract.md` ;
- `frontend-data-table-contract.md` ;
- `frontend-toast-feedback-contract.md` ;
- `platform-overview-dashboard-contract.md` ;
- `dashboard-workspace-platform-boundary.md` ;
- `core-plan-navigation-ui-conventions.md`.

Pendant la migration, ces fichiers restent des sources de travail mais ne doivent pas être considérés comme automatiquement plus fiables que le code actuel.

### C. Architecture, sécurité et frontend à consolider

Le contenu actuellement réparti entre `docs/` et `frontend/docs/` sera vérifié puis réparti dans :

- `architecture/ARCHITECTURE.md` ;
- `architecture/BACKEND.md` ;
- `architecture/FRONTEND.md` ;
- `security/SECURITY.md` ;
- `frontend/FRONTEND-GUIDELINES.md`.

Cela concerne notamment les documents historiques :

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
- les checklists associées.

Règle structurante à préserver : les composants réutilisables sont obligatoires lorsqu'ils sont pertinents ; les tables utilisent le composant partagé de DataTable ; les drawers, confirmations, formulaires et patterns transverses doivent réutiliser les composants communs existants plutôt que créer des variantes dupliquées.

### D. Dette à consolider

`DEBT.md` est déjà l'unique source de statut des dettes.

Les anciens documents suivants restent temporairement des annexes de cadrage :

- `core-deferred-work-for-derived-saas.md` ;
- `functional-debt-account-workspace-closure.md` ;
- `functional-debt-file-trash-restore.md` ;
- `functional-debt-privacy-cookies-rgpd.md` ;
- `functional-debt-rgpd-cookies-privacy-legal.md` ;
- `functional-debt-ui-display-preferences.md`.

Ils ne doivent plus introduire un second statut concurrent d'une dette déjà enregistrée dans `DEBT.md`.

### E. Conformité à consolider

Sources à intégrer dans `compliance/COMPLIANCE.md` :

- `rgpd-cookies-privacy-technical-cadrage.md` ;
- `functional-debt-privacy-cookies-rgpd.md` ;
- `functional-debt-rgpd-cookies-privacy-legal.md`.

`rgpd-data-tracker-inventory.md` reste un inventaire vivant distinct et devra être déplacé vers `docs/compliance/` uniquement après validation de la réorganisation.

### F. SaaS dérivés et opérations à consolider

Les règles encore réparties dans les anciens documents, checklists, scripts et contrats devront être regroupées dans :

- `derived-saas/DERIVED-SAAS.md` pour la création, l'extension, le versionnement et la mise à niveau d'un SaaS dérivé ;
- `operations/OPERATIONS.md` pour configuration, seeds, migrations, jobs, stockage, antivirus et opérations de développement/production.

---

## 6. Règle frontend / backend

La centralisation sous `docs/` ne supprime pas la séparation des responsabilités.

Le backend et le frontend gardent leurs architectures propres, mais les règles structurantes sont documentées dans un espace commun afin d'éviter deux versions concurrentes d'une même décision.

Un contrat d'API appartient à la frontière frontend/backend et doit donc être documenté une seule fois.

Une documentation strictement locale à un module pourra exceptionnellement rester près du code si elle ne décrit que ce module et n'introduit aucune règle globale.

---

## 7. Tableau de migration

| Lot | Objet | État |
|---|---|---|
| DOC-0 | Gouvernance des dettes et reprise unique | terminé |
| DOC-1 | Inventaire, classification et index documentaire | terminé |
| DOC-2 | Contrats Core / commercial / capabilities | à lancer |
| DOC-3 | Architecture globale, backend et frontend | à faire |
| DOC-4 | Sécurité | à faire |
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

Le prochain lot est **DOC-2 — consolidation des contrats**.

Il devra commencer par le code et les tests actuels, puis utiliser les anciens contrats comme sources secondaires afin d'éviter de réintroduire des comportements dépassés dans la documentation canonique.
