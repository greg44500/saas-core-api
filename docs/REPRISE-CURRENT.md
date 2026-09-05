# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il est mis à jour en place à chaque checkpoint significatif et sera supprimé lorsque le SAAS-CORE-API sera finalisé et que sa documentation canonique sera complète.

## 1. Rôle du document

`REPRISE-CURRENT.md` sert uniquement à reprendre le travail entre deux conversations ou deux sessions de développement.

Il n'est pas une source normative. En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés validés ;
3. contrats canoniques actifs ;
4. architecture, sécurité et conventions actives ;
5. registre de dette actif ;
6. présent document.

Git conserve l'historique de ses versions ; aucune synthèse datée supplémentaire n'est nécessaire.

---

## 2. État de reprise

Le développement fonctionnel reste temporairement suspendu avant la poursuite de **F10.6** afin de finaliser le chantier documentaire du Core.

Aucune logique applicative backend/frontend ne doit être modifiée dans ce chantier documentaire sauf décision explicite séparée si un audit révèle une incohérence de code.

---

## 3. Principes documentaires validés

- centraliser la documentation structurante sous `docs/` ;
- conserver une séparation logique backend/frontend sans deux silos documentaires concurrents ;
- vérifier le code et les tests avant de consolider les anciens documents ;
- ne supprimer aucun fichier sans validation explicite ;
- maintenir un registre unique des dettes ;
- maintenir des contrats canoniques communs frontend/backend ;
- maintenir une documentation dédiée à l'architecture, la sécurité et aux SaaS dérivés ;
- créer le README racine après stabilisation des chemins ;
- utiliser uniquement `REPRISE-CURRENT.md` pour les futures reprises.

---

## 4. Documents canoniques déjà créés

```text
docs/README.md
docs/DEBT.md
docs/REPRISE-CURRENT.md

docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md

docs/architecture/ARCHITECTURE.md
docs/architecture/BACKEND.md
docs/architecture/FRONTEND.md
```

Documents encore à produire :

```text
docs/security/SECURITY.md
docs/frontend/FRONTEND-GUIDELINES.md
docs/derived-saas/DERIVED-SAAS.md
docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md
docs/operations/OPERATIONS.md
README.md racine
```

---

## 5. Checkpoints documentaires

### DOC-0 — terminé

- `docs/DEBT.md` est le registre canonique unique des dettes actives ;
- `docs/REPRISE-CURRENT.md` est l'unique synthèse de reprise temporaire.

### DOC-1 — terminé

- inventaire documentaire réalisé ;
- fragmentation confirmée ;
- `docs/README.md` créé comme index canonique et tableau de migration ;
- centralisation sous `docs/` validée ;
- aucune suppression.

### DOC-2 — terminé

Contrats canoniques créés :

```text
docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md
```

Décisions importantes corrigées contre le code :

- clé technique Plan générée par le backend et non saisie par le SUPER_ADMIN ;
- clé non exposée dans le catalogue public ;
- baseline portée par `systemRole = baseline` / `isBaseline` ;
- entitlement Workspace composé avec les overrides actifs ;
- métadonnées internes d'override réservées à Platform ;
- `team_management` protège membres, invitations et rôles ;
- `audit_logs` protège uniquement la consultation des logs Workspace ;
- politique commerciale V1 Workspace-scoped ;
- `ACTIVE_PLAN_CAPABILITY_REGISTRY` autorité runtime ;
- capabilities métier déclarées par le logiciel, jamais créées librement depuis Platform.

Aucun ancien contrat n'a été supprimé.

### DOC-3 — terminé

Trois documents d'architecture canoniques ont été créés :

```text
docs/architecture/ARCHITECTURE.md
docs/architecture/BACKEND.md
docs/architecture/FRONTEND.md
```

Décisions structurantes figées :

- le Core fournit les fondations SaaS génériques ; les applications dérivées ajoutent leurs modules métier ;
- la dépendance reste `module métier → Core`, jamais `Core → métier spécifique` ;
- Account, Workspace et Platform sont trois contextes distincts ;
- Workspace reste la frontière tenant du Core V1 ;
- le backend est organisé par modules métier sous `backend/modules/` avec responsabilités route/controller/service/model/validation explicites ;
- les services techniques réellement transverses restent sous `backend/services/` ;
- jobs, migrations, seeds et operations ont des responsabilités distinctes ;
- le frontend est organisé par `app`, `components`, `features`, `services/api`, `store`, `hooks`, `lib`, `utils` ;
- les routes Workspace et Platform restent séparées par guards/layouts ;
- server state → RTK Query ; global client state → Redux Toolkit seulement si justifié ; local UI state → `useState` / `useReducer` ; navigation partageable → URL ; formulaires → React Hook Form ;
- le store global actuel porte Auth + `baseApi`, et la terminaison de session vide le cache RTK Query ;
- `baseQueryWithReauth` centralise le refresh avec mutex ;
- les composants réutilisables sont une contrainte d'architecture : DataTable, DataPagination, EntityDetailsDrawer, ConfirmationDialog et autres primitives partagées doivent être réutilisés lorsque leur contrat correspond ;
- les primitives transverses ne doivent pas dépendre des features métier ;
- une capability absente de l'entitlement ne doit pas polluer inutilement la navigation ou le dashboard ;
- les versions documentées suivent les packages réellement installés : frontend courant React 19 / React Router 8 / Vite 8 ;
- Playwright reste dans la stratégie E2E cible mais n'est pas présenté comme installé tant qu'il ne l'est pas réellement.

Aucun code ni test n'a été modifié. Aucun document historique n'a été supprimé.

---

## 6. Prochain lot documentaire

**DOC-4 — Sécurité**.

Objectifs :

1. consolider l'authentification et le lifecycle de session ;
2. formaliser la validation stricte et la séparation validation / autorisation / métier ;
3. formaliser l'isolation multi-tenant ;
4. formaliser RBAC Workspace et permissions Platform ;
5. formaliser entitlement, quotas et remédiation ;
6. documenter transactions, concurrence et invariants atomiques ;
7. documenter AuditLog et traçabilité ;
8. documenter sécurité Files : upload temporaire, type réel, antivirus, checksum, stockage et purge ;
9. documenter erreurs, logs et non-exposition des secrets ;
10. formaliser les responsabilités de sécurité frontend vs backend.

DOC-4 doit compléter les contrats et l'architecture sans recopier leurs endpoints.

---

## 7. Finalisation fonctionnelle du SAAS-CORE-API

Après le chantier documentaire complet :

```text
reprendre F10.6
→ auditer l'état fonctionnel réel
→ établir les lots restant à finaliser
→ traiter les blockers Core / production
→ audit sécurité et tests
→ figer la stratégie de distribution et de mise à jour
→ version Core finalisée
```

La feuille de route distinguera les obligations génériques du Core des responsabilités propres à chaque SaaS dérivé.

---

## 8. Distribution et maintenance des futurs SaaS

Exigence structurante : les SaaS dérivés doivent pouvoir recevoir de façon maîtrisée les correctifs et évolutions compatibles du Core sans écraser leurs modules métier.

La politique finale devra définir :

- versionnement du Core ;
- version Core utilisée par chaque SaaS ;
- séparation Core / métier ;
- procédure de mise à niveau ;
- migrations et configuration ;
- tests de non-régression ;
- résolution des conflits ;
- compatibilité et breaking changes.

Un GitHub Template pourra faciliter la création initiale d'une application mais ne résout pas, à lui seul, sa maintenance future.

---

## 9. Critère de suppression de ce fichier

`docs/REPRISE-CURRENT.md` pourra être supprimé lorsque :

- le Core sera considéré comme finalisé ;
- la documentation canonique sera complète et auditée ;
- la politique de distribution/versionnement sera opérationnelle ;
- aucune reprise de développement Core n'exigera plus de contexte temporaire.

La suppression nécessitera une validation explicite.
