# SAAS-CORE-API — Index documentaire

**Statut :** index canonique de la documentation du projet  
**Dernière consolidation :** 2026-09-05  
**Chantier documentaire DOC-0 → DOC-11 :** terminé

## 1. Objet

Ce fichier est la porte d'entrée de la documentation interne de `saas-core-api`.

Le README racine fournit désormais l'orientation générale du dépôt. Le présent index reste la référence pour naviguer dans les contrats, l'architecture, la sécurité, les guidelines, la conformité, les opérations, les SaaS dérivés et les dettes actives.

Le chantier documentaire DOC-0 à DOC-11 est terminé. La prochaine étape du projet redevient la reprise fonctionnelle de **F10.6**, puis l'audit code/tests permettant d'établir la roadmap réelle de clôture du Core.

---

## 2. Hiérarchie d'autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés validés ;
3. contrats canoniques actifs ;
4. architecture, sécurité et conventions canoniques ;
5. registre des dettes actives ;
6. documentation opérationnelle ;
7. documents de travail historiques encore temporairement conservés ;
8. `REPRISE-CURRENT.md`.

Une checklist, un ancien contrat, un rapport d'implémentation ou une synthèse de reprise ne peut jamais redéfinir le comportement réel du Core.

---

## 3. Porte d'entrée du dépôt

```text
README.md
→ présentation du Core
→ prérequis
→ installation
→ démarrage
→ tests
→ documentation
→ stratégie de SaaS dérivé
→ limites avant production / v1.0
```

Le README racine ne duplique pas les contrats détaillés.

---

## 4. Documents canoniques actifs

### Gouvernance

```text
docs/README.md
→ index documentaire

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

Décisions structurantes :

- la clé technique d'un nouveau Plan est générée par le backend et n'est pas exposée dans le catalogue public ;
- la baseline est identifiée structurellement par `systemRole = baseline` / `isBaseline`, pas par son nom commercial ;
- la vue Workspace expose les features et limites effectives après overrides actifs ;
- `ACTIVE_PLAN_CAPABILITY_REGISTRY` reste l'autorité runtime des capabilities ;
- entitlement commercial, permission RBAC et quota sont trois contrôles distincts.

### Architecture

```text
docs/architecture/ARCHITECTURE.md
→ responsabilités globales du Core, contextes Account / Workspace / Platform et frontière Core / métier

docs/architecture/BACKEND.md
→ architecture Node/Express/Mongoose, modules, responsabilités des couches, jobs, migrations et tests

docs/architecture/FRONTEND.md
→ architecture React par features, composants, routing, state management, RTK Query et extension métier
```

### Sécurité

```text
docs/security/SECURITY.md
→ défense en profondeur, Auth/AuthSession, validation, multi-tenant, RBAC, Platform,
  entitlements, quotas, transactions, Files, AuditLog, HTTP, secrets et frontend
```

Le backend reste l'autorité de sécurité. Les guards, masquages et contrôles frontend améliorent l'UX mais ne remplacent jamais les autorisations serveur.

### Guidelines frontend

```text
docs/frontend/FRONTEND-GUIDELINES.md
→ règles pratiques UI/UX, composants réutilisables, state, RTK Query,
  navigation, formulaires, feedback, accessibilité, responsive, performance et tests
```

Règles centrales :

- même intention UI → même famille de composants ;
- `DataTable` est obligatoire pour les tableaux compatibles ;
- drawers, confirmations, formulaires et primitives transverses sont réutilisés lorsque leur contrat convient ;
- server state → RTK Query ; navigation partageable → URL ; form state → React Hook Form ; état local → React ; Redux global uniquement si justifié ;
- les fonctionnalités absentes ne doivent pas polluer inutilement l'interface ;
- masquer une action reste une règle UX, jamais une sécurité suffisante ;
- Playwright reste à intégrer pour les E2E Core avant la release 1.0.

### SaaS dérivés et maintenance du Core

```text
docs/derived-saas/DERIVED-SAAS.md
→ création d'un produit dérivé, frontière Core/métier, versionnement,
  stratégie Git, upgrades, migrations, tests et points d'extension
```

Le produit dérivé conserve l'historique Git du Core, possède son propre `origin` et conserve le Core comme `upstream-core`. La stratégie devra être validée par un exercice réel de dérivation + upgrade avant la release 1.0.

### Conformité / RGPD

```text
docs/compliance/COMPLIANCE.md
→ cadre canonique RGPD, cookies/traceurs, information, rétention,
  droits, sous-traitants, transferts, AIPD, violations et gate pré-production

docs/compliance/rgpd-data-tracker-inventory.md
→ inventaire technique vivant des données, stockages, traceurs, prestataires et points de collecte
```

La conformité technique du Core ne rend pas automatiquement un SaaS dérivé juridiquement conforme.

### Opérations

```text
docs/operations/OPERATIONS.md
→ installation, environnement, MongoDB, démarrage, seeds, migrations,
  jobs, stockage, antivirus, health checks, déploiement et rollback

docs/development-trial-reset.md
→ opération spécialisée et strictement réservée au développement
```

---

## 5. Dette consolidée

`docs/DEBT.md` distingue explicitement :

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

Cette liste est celle démontrée par l'audit documentaire. La reprise F10.6 puis l'audit fonctionnel code/tests pourront encore la compléter ou la reclasser.

---

## 6. Structure documentaire canonique

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

`docs/development-trial-reset.md` reste volontairement à la racine de `docs/` comme guide opérationnel spécialisé existant ; aucun déplacement n'est nécessaire pour la seule esthétique documentaire.

---

## 7. Documents de travail temporairement conservés

Les fichiers suivants ne sont **pas canoniques** :

```text
docs/backend-implementation-checklist.md
docs/frontend-implementation-checklist.md
docs/frontend-platform-admin-contract.md
docs/platform-overview-dashboard-contract.md
docs/dashboard-workspace-platform-boundary.md
```

Ils sont conservés uniquement comme mémoire de progression pour F10.6 et l'audit fonctionnel qui suivra.

Important : ces documents sont chronologiques. Ils peuvent donc contenir des intitulés de lots, des formulations ou des références vers d'anciens documents qui décrivent l'état du projet au moment de leur rédaction. Ces références historiques ne sont pas des dépendances documentaires actives.

Pour tout contrat courant, utiliser les documents canoniques de la section 4.

Après reprise F10.6 et audit fonctionnel, ces cinq fichiers devront être réévalués : soit leur information utile sera absorbée dans la reprise/roadmap courante, soit leur suppression pourra être proposée avec validation explicite.

---

## 8. Audit DOC-11

DOC-11 a vérifié notamment :

- présence d'un README racine ;
- mise à jour de `frontend/README.md`, anciennement figé au jalon F1 ;
- cohérence des versions avec les `package.json` actuels ;
- cohérence de la base API frontend `/api` et du proxy Vite ;
- présence des chemins canoniques référencés par le README ;
- absence de dépendance canonique vers l'ancien silo `frontend/docs/` supprimé en DOC-10 ;
- absence de dépendance canonique vers les anciens contrats/fiches de dette supprimés ;
- correction du vocabulaire `baseline Free` dans le guide de reset Trial ;
- maintien explicite des documents historiques comme non canoniques ;
- maintien de `0.1.0` comme état de développement : aucune déclaration prématurée de `v1.0.0` ou de production-readiness.

Aucun changement applicatif backend/frontend n'a été réalisé pendant DOC-11.

---

## 9. Historique du chantier documentaire

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
| DOC-10 | Nettoyage documentaire validé | terminé |
| DOC-11 | README racine et audit documentaire final | terminé |

DOC-10 a supprimé, après validation explicite, 50 fichiers historiques/redondants. Git conserve leur historique.

---

## 10. Règle de suppression

Aucun autre fichier ne doit être supprimé automatiquement.

Toute future suppression documentaire suit la même règle : contenu utile vérifié, remplacement identifié si nécessaire, liste exacte présentée, validation explicite, puis suppression des seuls chemins autorisés.

---

## 11. Prochaine étape

Le chantier documentaire est clos.

Séquence de reprise :

```text
F10.6
↓
audit fonctionnel réel code + tests + contrats
↓
roadmap de clôture du Core
↓
blockers Core 1.0
↓
audit sécurité / tests / E2E
↓
dérivation + upgrade pilote
↓
release Core stable
```

`REPRISE-CURRENT.md` reste l'unique document temporaire de reprise tant que le Core n'est pas finalisé.
