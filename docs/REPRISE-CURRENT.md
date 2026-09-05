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

Aucune logique applicative backend/frontend n'a été modifiée pendant DOC-0 à DOC-9.

Aucun fichier historique n'a été supprimé pendant ces lots.

---

## 3. Principes documentaires validés

- centraliser la documentation structurante sous `docs/` ;
- vérifier le code et les tests avant de consolider les anciens documents ;
- ne supprimer aucun fichier sans validation explicite ;
- maintenir un registre unique des dettes ;
- maintenir des contrats canoniques communs frontend/backend ;
- séparer architecture, sécurité, guidelines frontend, SaaS dérivés, conformité et opérations ;
- créer le README racine seulement lorsque les chemins sont stabilisés ;
- utiliser uniquement `REPRISE-CURRENT.md` pour les futures reprises ;
- distinguer systématiquement finalisation du Core et préparation production d'un produit dérivé.

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

Avant ce README final restent DOC-10 nettoyage validé puis DOC-11 audit documentaire final.

---

## 5. Checkpoints documentaires

### DOC-0 — terminé

- `DEBT.md` créé comme registre canonique ;
- `REPRISE-CURRENT.md` devient l'unique synthèse de reprise.

### DOC-1 — terminé

- inventaire documentaire ;
- fragmentation confirmée ;
- `docs/README.md` créé ;
- aucune suppression.

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

`docs/DEBT.md` a été entièrement reconsolidé contre DOC-2 à DOC-8.

#### Statuts normalisés

Les valeurs non officielles telles que `À CADRER PAR PRODUIT` ou `À CADRER APRÈS AJOUT DU MÉTIER` ont été supprimées du champ statut. Le registre n'utilise plus que :

```text
À CADRER
PLANIFIÉ
EN COURS
DIFFÉRÉ
CONDITIONNEL
BLOQUÉ
VALIDÉ
NON APPLICABLE
```

Le contexte est désormais porté par :

```text
Périmètre
Blocage Core 1.0
Blocage production dérivée
Déclencheur
Dépendances
```

#### Distinction structurante

```text
Core 1.0 finalisé
≠
SaaS dérivé automatiquement production-ready
```

Stripe, hébergeur, conformité juridique finale, stockage cloud ou observabilité d'un déploiement ne sont pas imposés comme responsabilités universelles du Core générique.

#### Blockers Core 1.0 connus

```text
D-001
→ fermeture de compte et cycle de vie de fermeture Workspace

D-014
→ points d'extension métier : RBAC + routing backend/frontend

D-015
→ versionnement, provenance, releases et discipline de migration

D-016
→ E2E Core avec Playwright

D-017
→ exercice réel création + upgrade d'un SaaS dérivé pilote
```

D-014 à D-017 ont été ajoutées à partir des écarts réellement démontrés par DOC-6 et DOC-8.

#### Reclassifications importantes

- D-003 RGPD reste un blocker de production lorsqu'applicable, mais pas un blocker universel Core 1.0 ;
- D-004 Billing/Payment reste au niveau d'un produit payant ;
- D-005 observabilité devient `À CADRER` pour chaque production ;
- D-006 rétention réglementaire reste propre à la politique du produit, même si D-001 doit être compatible avec elle ;
- D-007 stockage production ne bloque pas le Core 1.0 tant que le provider `local` est correctement qualifié et que le contrat provider reste extensible ;
- D-012 distingue maintenant clairement les E2E du produit dérivé des E2E Core de D-016 ;
- D-013 reste une obligation de déploiement du produit dérivé ;
- D-002 et D-008 à D-011 restent différées/conditionnelles.

#### Important

DOC-9 ne constitue pas la roadmap finale de développement.

Après la fin du chantier documentaire :

```text
reprendre F10.6
→ auditer code + tests + contrats
→ établir les lots fonctionnels réellement restants
→ y intégrer les blockers D-001 / D-014 / D-015 / D-016 / D-017
```

L'audit fonctionnel pourra révéler d'autres blockers ou permettre de reclassifier un élément existant.

Aucun code ni test n'a été modifié. Aucun ancien fichier n'a été supprimé.

---

## 6. Prochain lot documentaire

**DOC-10 — Propositions de suppression et nettoyage validé**.

Objectifs :

1. refaire l'inventaire réel des anciens fichiers encore présents ;
2. vérifier que leur contenu utile est bien absorbé ;
3. détecter les références internes pointant encore vers eux ;
4. classer les fichiers en `À CONSERVER`, `À DÉPLACER ÉVENTUELLEMENT` ou `CANDIDAT À SUPPRESSION` ;
5. présenter la liste exacte des suppressions proposées ;
6. ne supprimer aucun fichier sans validation explicite de l'utilisateur ;
7. après validation, effectuer uniquement les suppressions autorisées.

---

## 7. Après DOC-10 et DOC-11

Séquence attendue :

```text
DOC-10 nettoyage validé
↓
DOC-11 README racine + audit liens/contradictions
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

## 8. Distribution et maintenance des futurs SaaS

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

## 9. Critère de suppression de ce fichier

`docs/REPRISE-CURRENT.md` pourra être supprimé lorsque :

- le Core sera considéré comme finalisé ;
- la documentation canonique sera complète et auditée ;
- la politique de distribution/versionnement sera réellement testée et opérationnelle ;
- aucune reprise de développement Core n'exigera plus de contexte temporaire.

La suppression nécessitera une validation explicite.
