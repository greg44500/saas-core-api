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

---

## 2. État actuel

Le chantier documentaire **DOC-0 → DOC-11 est terminé**.

La suspension documentaire de F10.6 est levée.

La prochaine étape fonctionnelle est désormais :

```text
reprise F10.6
```

Puis :

```text
audit fonctionnel réel code + tests + contrats
→ roadmap de clôture du Core
→ résolution des blockers Core 1.0
→ audit sécurité / tests / E2E
→ dérivation + upgrade pilote
→ release Core stable
```

Le dépôt reste en version de développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement production-ready.

---

## 3. Documentation canonique active

Porte d'entrée du dépôt :

```text
README.md
```

Index interne :

```text
docs/README.md
```

Références canoniques :

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

`frontend/README.md` est également à jour comme guide local du frontend.

---

## 4. Résultat du chantier documentaire

### DOC-0 / DOC-1

- `DEBT.md` devient le registre unique des dettes ;
- `REPRISE-CURRENT.md` devient l'unique synthèse de reprise ;
- `docs/README.md` devient l'index documentaire.

### DOC-2

Contrats canoniques Core / Commercial / Capabilities créés.

Décisions structurantes :

```text
Plan._id = identité MongoDB
Plan.key = clé interne générée par backend
Plan.systemRole = baseline = autorité structurelle baseline
isBaseline = information publique
```

Le nom commercial `Free` n'est pas un invariant du Core.

### DOC-3

Architecture globale/backend/frontend consolidée.

Principe :

```text
module métier → Core
```

Le Core ne dépend jamais d'un domaine métier dérivé.

### DOC-4

Sécurité consolidée : Auth/AuthSession, validation, multi-tenant, RBAC, Platform, entitlements, quotas, transactions, Files, audit, HTTP et secrets.

### DOC-5

Guidelines frontend consolidées.

Règles obligatoires :

- RTK Query pour le server state ;
- Redux Toolkit uniquement pour le vrai state global client ;
- React pour le local ;
- URL pour la navigation/filtres partageables ;
- `DataTable` pour les tableaux compatibles ;
- réutilisation des drawers, confirmations, formulaires et primitives partagées ;
- backend toujours autorité de sécurité et de règles métier.

### DOC-6

Stratégie SaaS dérivé : historique Git Core conservé, `origin` produit + `upstream-core`, SemVer, upgrades contrôlés, séparation Core/métier.

Limites révélées avant 1.0 : extension routing/RBAC à finaliser, provenance/release process à implémenter, test réel de dérivation/upgrade à effectuer.

### DOC-7

Conformité/RGPD consolidée sans imposer de fausse bannière cookies. Inventaire technique séparé du registre de traitements. Rétention, sous-traitants, transferts, AIPD et violations de données restent à qualifier selon le produit réel.

### DOC-8

Opérations consolidées : `.env`, MongoDB, seeds, migrations, jobs, stockage, ClamAV, health checks, déploiement et rollback.

Le provider File courant reste `local`; `/api/health` reste un liveness HTTP; l'infrastructure de production n'est pas imposée par le Core.

### DOC-9

Dettes reconsolidées avec deux gates distinctes :

```text
Core 1.0 finalisé
≠
SaaS dérivé prêt pour la production
```

### DOC-10

Nettoyage validé :

```text
50 fichiers supprimés
= 24 anciens fichiers sous docs/
+ 26 fichiers sous frontend/docs/
```

Aucun autre fichier n'a été supprimé ou déplacé.

### DOC-11

- création du README racine ;
- mise à jour de `frontend/README.md` ;
- audit des références documentaires ;
- correction du vocabulaire baseline dans le guide Trial reset ;
- `docs/README.md` finalisé ;
- chantier documentaire déclaré terminé.

Aucune logique applicative backend/frontend n'a été modifiée pendant DOC-0 à DOC-11.

---

## 5. Blockers Core 1.0 connus

Le registre canonique reste `docs/DEBT.md`.

Blockers actuellement démontrés :

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

Cette liste n'est pas encore la roadmap fonctionnelle finale. L'audit après reprise F10.6 pourra révéler d'autres lots ou reclasser certains éléments.

---

## 6. Documents temporaires conservés pour la reprise fonctionnelle

Les fichiers suivants sont **historiques et non canoniques**, mais restent utiles comme mémoire de progression :

```text
docs/backend-implementation-checklist.md
docs/frontend-implementation-checklist.md
docs/frontend-platform-admin-contract.md
docs/platform-overview-dashboard-contract.md
docs/dashboard-workspace-platform-boundary.md
```

Ils peuvent contenir des noms de lots ou des références documentaires correspondant à l'état du projet au moment de leur rédaction.

Ils ne doivent jamais être utilisés pour contredire :

```text
code
→ tests
→ contrats canoniques
→ architecture / sécurité / guidelines
→ DEBT.md
```

Après F10.6 et l'audit fonctionnel, leur contenu utile devra être absorbé dans la roadmap/reprise courante puis leur maintien réévalué.

---

## 7. Point de reprise fonctionnelle — F10.6

Avant de modifier le code, repartir du dépôt actuel et auditer le périmètre exact de F10.6 contre :

```text
backend/modules/entitlementOverride/
backend/modules/platform/
backend/modules/subscriptions/
frontend/src/features/platform/
frontend/src/services/api/
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md
docs/frontend-platform-admin-contract.md
docs/platform-overview-dashboard-contract.md
```

État connu à vérifier, pas à supposer :

- backend EntitlementOverride déjà développé et testé ;
- entitlement Workspace effectif déjà enrichi par les overrides actifs ;
- Platform Admin F9 déjà largement implémenté ;
- F10.6 concerne la poursuite/finalisation de l'administration frontend Platform des overrides et son intégration avec les écrans actuels ;
- le dernier travail fonctionnel signalé avant le chantier documentaire comportait des tests verts après correction d'un invariant empêchant d'activer la baseline comme cible payante.

La reprise doit commencer par un audit du HEAD et des tests, pas par une nouvelle implémentation supposée.

---

## 8. Après F10.6

Une fois F10.6 réellement clôturé :

1. auditer le code, les tests et les contrats de l'ensemble du Core ;
2. identifier les fonctionnalités réellement restantes, indépendamment des anciens numéros de lots ;
3. intégrer les blockers D-001 / D-014 / D-015 / D-016 / D-017 dans une roadmap de clôture ;
4. pour chaque lot, définir objectif, backend, frontend, sécurité, tests, documentation, dépendances et critère de validation ;
5. exécuter la gate finale Core ;
6. tester réellement la création puis l'upgrade d'un SaaS dérivé ;
7. publier seulement ensuite une release Core stable.

---

## 9. Distribution future des SaaS dérivés

Décision actuelle :

```text
Core stable et versionné
↓
création du produit en conservant l'historique Git
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
intégration contrôlée
```

GitHub Template n'est pas la stratégie canonique pour un produit qui doit continuer à recevoir les mises à jour du Core.

---

## 10. Critère de suppression de ce fichier

`docs/REPRISE-CURRENT.md` pourra être supprimé uniquement lorsque :

- le Core sera finalisé ;
- la release stable et la politique de versionnement seront opérationnelles ;
- la dérivation + upgrade pilote auront été réellement validées ;
- aucune reprise de développement Core n'exigera plus de contexte temporaire ;
- la suppression aura été explicitement approuvée.
