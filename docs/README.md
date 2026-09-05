# SAAS-CORE-API — Index documentaire

**Statut :** index canonique de la documentation du projet  
**Dernière mise à jour :** 2026-09-05

## 1. Objet

Ce fichier est la porte d'entrée de la documentation interne de `saas-core-api`.

Le développement fonctionnel reste temporairement suspendu avant la reprise de **F10.6** afin de terminer la consolidation documentaire.

Depuis DOC-10, la documentation structurante est centralisée sous `docs/`. L'ancien silo `frontend/docs/` a été supprimé après consolidation de son contenu utile dans les documents canoniques.

Les documents historiques supprimés restent accessibles dans l'historique Git, mais ils ne doivent plus être utilisés comme sources normatives.

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

Une synthèse de reprise, une checklist ou un rapport d'implémentation ne peut jamais redéfinir le comportement réel du Core.

---

## 3. Documents canoniques actifs

### Gouvernance

```text
docs/README.md
→ index documentaire

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

Décisions structurantes déjà consolidées contre le code courant :

- la clé technique d'un nouveau Plan est générée par le backend et n'est pas exposée dans le catalogue public ;
- la baseline est identifiée par `systemRole = baseline` / `isBaseline`, pas par son nom commercial ;
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

Les documents d'architecture utilisent les versions réellement installées comme référence. Au 2026-09-05, le frontend courant est notamment React 19 / React Router 8 / Vite 8.

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

Règles frontend canoniques :

- même intention UI → même famille de composants ;
- `DataTable` est obligatoire pour les tableaux compatibles avec sa primitive ;
- drawers, confirmations, formulaires et autres primitives transverses existantes sont réutilisés lorsque leur contrat convient ;
- server state → RTK Query ; navigation partageable → URL ; form state → React Hook Form ; état local → React ; Redux global uniquement si justifié ;
- les entrées de navigation et actions sont filtrées par permissions et capabilities lorsque celles-ci sont applicables ;
- une feature absente ne doit pas polluer inutilement l'interface avec des blocs permanents indisponibles ;
- l'absence d'une capability d'écriture ne signifie pas automatiquement qu'une surface de lecture doit disparaître ;
- le frontend ne reconstruit pas les règles commerciales ni les données métier non fournies par le backend ;
- Playwright reste la cible E2E Core à finaliser avant la release 1.0.

### SaaS dérivés et maintenance du Core

```text
docs/derived-saas/DERIVED-SAAS.md
→ création d'un produit dérivé, frontière Core/métier, versionnement,
  stratégie Git, upgrades, migrations, tests et points d'extension
```

Décisions canoniques :

- un produit destiné à recevoir les futures mises à jour du Core conserve l'historique Git du Core ;
- le produit possède son propre `origin` et conserve le Core comme `upstream-core` ;
- le Core doit disposer d'une vraie release versionnée avant diffusion comme socle finalisé ;
- une mise à niveau Core passe par une branche dédiée, revue des release notes/migrations/configuration, tests puis Pull Request ;
- l'extraction du Core en packages séparés n'est pas retenue pour la V1.

### Conformité / RGPD

```text
docs/compliance/COMPLIANCE.md
→ cadre canonique RGPD, cookies/traceurs, information, rétention,
  droits, sous-traitants, transferts, AIPD, violations et gate pré-production

docs/compliance/rgpd-data-tracker-inventory.md
→ inventaire technique vivant des données, stockages, traceurs, prestataires et points de collecte
```

La conformité technique du Core ne rend pas automatiquement un SaaS dérivé juridiquement conforme : les traitements, finalités, durées, sous-traitants et transferts doivent être qualifiés pour chaque produit réel.

### Opérations

```text
docs/operations/OPERATIONS.md
→ installation, environnement, MongoDB, démarrage, seeds, migrations,
  jobs, stockage, antivirus, health checks, déploiement et rollback
```

Le provider File courant reste `local`; ClamAV applique une politique fail-closed; `/api/health` est actuellement un liveness et non une readiness complète; l'infrastructure de production reste à qualifier pour chaque produit dérivé.

### Dette consolidée

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

DOC-9 ne remplace pas l'audit fonctionnel post-documentation : la reprise F10.6 et l'audit code/tests devront encore confirmer la roadmap complète de clôture.

---

## 4. Structure documentaire canonique

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

Le `README.md` racine du dépôt sera créé pendant DOC-11 afin de pointer vers ces chemins stabilisés.

---

## 5. Documents de travail temporairement conservés

Les fichiers suivants ne sont **pas canoniques**, mais sont volontairement conservés jusqu'à la reprise de F10.6 et à l'audit fonctionnel réel :

```text
docs/backend-implementation-checklist.md
docs/frontend-implementation-checklist.md
docs/frontend-platform-admin-contract.md
docs/platform-overview-dashboard-contract.md
docs/dashboard-workspace-platform-boundary.md
```

Ils servent uniquement de mémoire de progression et de contrôle de reprise. En cas de divergence avec le code, les tests ou les documents canoniques, ils perdent autorité.

Le guide suivant reste conservé comme documentation opérationnelle spécialisée :

```text
docs/development-trial-reset.md
```

`frontend/README.md` reste également présent jusqu'à DOC-11, où il devra être réévalué car son état historique F1 ne reflète plus la stack frontend complète actuelle.

---

## 6. Nettoyage DOC-10

DOC-10 a été exécuté après validation explicite de la liste de suppressions.

Résultat :

```text
50 fichiers historiques/redondants supprimés
= 24 fichiers sous docs/
+ 26 fichiers sous frontend/docs/
```

Ont notamment été retirés :

- synthèses de reprise datées devenues obsolètes ;
- anciens contrats frontend/backend absorbés par `docs/contracts/` ;
- anciennes policies frontend absorbées par `docs/architecture/`, `docs/security/` et `docs/frontend/FRONTEND-GUIDELINES.md` ;
- rapports F1 à F6 et checklists historiques du silo `frontend/docs/` ;
- anciennes fiches de dette désormais consolidées dans `docs/DEBT.md` ;
- anciens cadrages RGPD et ancien inventaire remplacés par `docs/compliance/`.

L'historique Git reste disponible pour consulter ces anciens documents si un besoin d'archéologie apparaît.

---

## 7. Règle frontend / backend

La centralisation documentaire ne supprime pas la séparation des responsabilités.

Le backend et le frontend gardent leurs architectures propres, mais une même règle structurante ou un même contrat ne doit pas être documenté dans deux versions concurrentes.

Un contrat d'API appartient à la frontière frontend/backend et est documenté sous `docs/contracts/`.

Une documentation strictement locale à un module peut exceptionnellement rester près du code lorsqu'elle ne définit aucune règle globale.

---

## 8. Tableau de migration

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
| DOC-11 | README racine et audit documentaire final | prochain lot |

---

## 9. Règle de suppression

Aucun autre fichier ne doit être supprimé automatiquement.

Toute future suppression documentaire doit toujours respecter la même règle : contenu utile vérifié, remplacement identifié si nécessaire, liste exacte présentée, puis validation explicite avant suppression.

---

## 10. Prochaine étape

Le prochain lot est **DOC-11 — README racine + audit documentaire final**.

DOC-11 devra :

1. créer ou réécrire le README racine comme porte d'entrée du dépôt ;
2. réévaluer `frontend/README.md` ;
3. auditer les liens et références documentaires restantes ;
4. vérifier l'absence de contradictions majeures entre les documents canoniques ;
5. figer le checkpoint documentaire permettant la reprise de F10.6.
