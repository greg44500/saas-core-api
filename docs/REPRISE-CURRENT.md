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

Le développement fonctionnel reste temporairement suspendu avant la poursuite de **F10.6** afin de terminer le chantier documentaire du Core.

DOC-0 à DOC-10 sont terminés.

Aucune logique applicative backend/frontend n'a été modifiée pendant ces lots documentaires.

DOC-10 a supprimé uniquement les **50 fichiers historiques/redondants explicitement approuvés par l'utilisateur**. Aucun autre fichier n'a été supprimé ou déplacé.

Le prochain et dernier lot documentaire avant reprise fonctionnelle est :

```text
DOC-11 — README racine + audit documentaire final
```

---

## 3. Principes documentaires validés

- centraliser la documentation structurante sous `docs/` ;
- vérifier le code et les tests avant de consolider les anciens documents ;
- ne supprimer aucun fichier sans validation explicite ;
- maintenir un registre unique des dettes ;
- maintenir des contrats canoniques communs frontend/backend ;
- séparer architecture, sécurité, guidelines frontend, SaaS dérivés, conformité et opérations ;
- utiliser uniquement `REPRISE-CURRENT.md` pour les futures reprises ;
- distinguer systématiquement finalisation du Core et préparation production d'un produit dérivé ;
- conserver Git comme historique des anciennes synthèses, policies, checklists et contrats supprimés.

---

## 4. Documents canoniques actifs

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

docs/security/SECURITY.md

docs/frontend/FRONTEND-GUIDELINES.md

docs/derived-saas/DERIVED-SAAS.md

docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md

docs/operations/OPERATIONS.md
```

Document canonique encore à produire :

```text
README.md racine
```

---

## 5. Documents temporaires encore conservés

Les fichiers suivants sont volontairement conservés comme mémoire de progression jusqu'à la reprise F10.6 et l'audit fonctionnel réel :

```text
docs/backend-implementation-checklist.md
docs/frontend-implementation-checklist.md
docs/frontend-platform-admin-contract.md
docs/platform-overview-dashboard-contract.md
docs/dashboard-workspace-platform-boundary.md
```

Ils ne sont pas normatifs.

Le guide suivant reste conservé comme documentation opérationnelle spécialisée :

```text
docs/development-trial-reset.md
```

`frontend/README.md` reste présent jusqu'à DOC-11, mais il est connu comme historiquement daté de F1 et devra être réévalué.

---

## 6. Checkpoints documentaires

### DOC-0 — terminé

- `DEBT.md` créé comme registre canonique ;
- `REPRISE-CURRENT.md` devient l'unique synthèse de reprise.

### DOC-1 — terminé

- inventaire documentaire ;
- fragmentation confirmée ;
- `docs/README.md` créé.

### DOC-2 — terminé

Contrats canoniques :

```text
docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md
```

Décisions importantes : clé Plan générée par backend, baseline par `systemRole`, entitlement effectif après overrides, capabilities runtime autoritatives, `team_management` pour membres/invitations/rôles, politique commerciale Workspace-scoped.

### DOC-3 — terminé

Architecture canonique globale/backend/frontend créée.

Décisions : Core générique + modules métier dérivés, dépendance métier → Core, contextes Account/Workspace/Platform séparés, backend modulaire, frontend par features, RTK Query pour server state, composants réutilisables obligatoires.

### DOC-4 — terminé

`docs/security/SECURITY.md` créé.

Défense en profondeur, sessions rotatives, validation Zod, isolation Workspace, RBAC, entitlements/quotas, transactions, Files fail-closed, AuditLog et protections HTTP consolidés.

### DOC-5 — terminé

`docs/frontend/FRONTEND-GUIDELINES.md` créé.

`DataTable`, drawers, confirmations, formulaires et primitives partagées deviennent des règles canoniques de réutilisabilité. State management, RTK Query, UX, accessibilité, feedback et tests frontend sont consolidés.

### DOC-6 — terminé

`docs/derived-saas/DERIVED-SAAS.md` créé.

Décisions : historique Git Core conservé, `origin` produit + `upstream-core`, SemVer, upgrades par branche/PR, modules métier par composition, packages Core séparés non retenus en V1.

Limites révélées avant Core 1.0 : point d'extension RBAC incomplet, routing backend/frontend trop centralisé, provenance Core non implémentée, release process non finalisé, validation réelle d'un upgrade dérivé encore à faire.

### DOC-7 — terminé

Documents :

```text
docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md
```

Décisions : conformité transverse, pas de bannière cookies fictive, inventaire technique distinct du registre des traitements, rétention juridique distincte des durées techniques, sous-traitants/transferts/AIPD/violations de données à qualifier par produit.

### DOC-8 — terminé

`docs/operations/OPERATIONS.md` créé.

Décisions : environnement fail-fast, MongoDB avant HTTP, `autoIndex=false` en production, seeds/migrations/jobs/opérations dev séparés, jobs autonomes, stockage courant `local`, ClamAV fail-closed, `/api/health` = liveness, rollback code ≠ rollback données, infrastructure production encore spécifique au produit.

### DOC-9 — terminé

`docs/DEBT.md` a été reconsolidé contre DOC-2 à DOC-8.

Distinction structurante :

```text
Core 1.0 finalisé
≠
SaaS dérivé automatiquement production-ready
```

Blockers Core 1.0 connus :

```text
D-001 fermeture de compte et cycle de vie de fermeture Workspace
D-014 points d'extension métier : RBAC + routing backend/frontend
D-015 versionnement, provenance, releases et discipline de migration
D-016 E2E Core avec Playwright
D-017 exercice réel création + upgrade d'un SaaS dérivé pilote
```

DOC-9 ne constitue pas la roadmap fonctionnelle finale. Après le chantier documentaire, la reprise F10.6 puis un audit code/tests devront confirmer les lots réellement restants.

### DOC-10 — terminé

Audit du dépôt effectué avant suppression.

Décision validée par l'utilisateur : appliquer les recommandations de nettoyage sans toucher aux documents conservés.

Résultat :

```text
50 suppressions autorisées et exécutées
= 24 anciens fichiers sous docs/
+ 26 fichiers historiques sous frontend/docs/
```

Supprimés notamment :

- trois anciennes synthèses de reprise datées ;
- anciens contrats frontend/backend absorbés par DOC-2 ;
- anciennes policies frontend absorbées par DOC-3, DOC-4 et DOC-5 ;
- rapports F1 à F6 et checklists du silo `frontend/docs/` ;
- anciennes fiches de dette remplacées par `DEBT.md` ;
- anciens cadrages RGPD et inventaire remplacés par `docs/compliance/`.

`frontend/docs/` ne constitue donc plus un second silo documentaire.

Conservés volontairement :

```text
docs/backend-implementation-checklist.md
docs/frontend-implementation-checklist.md
docs/frontend-platform-admin-contract.md
docs/platform-overview-dashboard-contract.md
docs/dashboard-workspace-platform-boundary.md
docs/development-trial-reset.md
docs/REPRISE-CURRENT.md
frontend/README.md
```

`docs/README.md` a été mis à jour pour refléter ce nouvel état.

---

## 7. Prochain lot documentaire

**DOC-11 — README racine + audit documentaire final**.

Objectifs :

1. créer ou réécrire le `README.md` racine comme porte d'entrée du dépôt ;
2. réévaluer `frontend/README.md` ;
3. auditer les liens et références documentaires restants ;
4. vérifier les contradictions majeures entre documents canoniques ;
5. figer le checkpoint documentaire final ;
6. autoriser ensuite la reprise de F10.6.

---

## 8. Après DOC-11

Séquence attendue :

```text
DOC-11 README racine + audit documentaire final
↓
reprise F10.6
↓
audit fonctionnel réel
↓
roadmap de clôture Core
↓
blockers Core 1.0
↓
audit sécurité / tests / E2E
↓
dérivation + upgrade pilote
↓
release Core stable
```

---

## 9. Distribution et maintenance des futurs SaaS

Décision actuelle :

```text
Core finalisé et versionné
↓
création du produit en conservant l'historique Git du Core
↓
origin = dépôt produit
upstream-core = dépôt SAAS-CORE-API
↓
modules métier ajoutés par composition
↓
future release Core
↓
branche d'upgrade
↓
tests + migrations + revue
↓
Pull Request produit
```

Le GitHub Template ne doit pas être confondu avec cette stratégie de maintenance.

---

## 10. Critère de suppression de ce fichier

`docs/REPRISE-CURRENT.md` pourra être supprimé lorsque :

- le Core sera considéré comme finalisé ;
- la documentation canonique sera complète et auditée ;
- la politique de distribution/versionnement sera réellement testée et opérationnelle ;
- aucune reprise de développement Core n'exigera plus de contexte temporaire.

La suppression nécessitera une validation explicite.
