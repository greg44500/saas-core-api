# D-017 — Validation réelle de la dérivation et de l’upgrade du Core

**Statut :** EN COURS  
**Démarrage :** 2026-09-17  
**Périmètre :** Core 1.0 / distribution / SaaS dérivé pilote  
**Branche Core :** `feature/d-017-derived-saas-upgrade-validation`

---

## 1. Objectif

D-017 doit démontrer par un exercice réel que `saas-core-api` peut :

1. publier une release candidate identifiable ;
2. servir de base à un dépôt SaaS dérivé qui conserve l’historique Git du Core ;
3. recevoir un petit module métier sans modifier inutilement les zones Core ;
4. tracer la provenance Core dans `core-origin.json` ;
5. recevoir ensuite une évolution Core compatible par une branche d’upgrade dédiée ;
6. exécuter les contrôles de migrations/configuration applicables ;
7. conserver les tests Core et métier verts ;
8. vérifier les parcours E2E pertinents ;
9. mesurer les conflits Git et confirmer que les points d’extension limitent les divergences ;
10. valider l’extension du centre d’aide avec un contenu métier distinct du corpus Core.

D-017 n’a pas pour objectif de construire un produit métier complet ni de rendre le pilote production-ready.

---

## 2. Point de départ validé

Référence Core avant D-017 :

```text
main : fe0c3821a7d2f9377066c98193df1e522131a0be
Core Gate #24
run : 35217570669
conclusion : success
```

D-015 et D-016 sont validées. L’audit final architecture / sécurité / qualité n’a démontré aucun nouveau blocker applicatif Core 1.0.

Le dépôt reste avant la première RC :

```text
version : 0.1.0
channel : development
```

Aucune release GitHub n’existe au démarrage de D-017.

---

## 3. Principes non négociables

### 3.1 Git

Le dépôt pilote doit conserver l’historique du Core.

Schéma attendu :

```text
saas-core-api
→ remote du Core dans le produit : upstream-core

saas dérivé pilote
→ remote principal : origin
```

Un dépôt créé depuis un GitHub Template avec historique indépendant ne constitue pas la preuve attendue.

### 3.2 Frontière Core / métier

Le module pilote doit utiliser les points d’extension existants lorsque le besoin est couvert :

```text
backend/config/applicationCapability.registry.js
backend/config/applicationRolePermission.registry.js
backend/config/applicationRoutes.registry.js
frontend/src/app/application-routes.js
frontend/src/app/workspace-navigation.js
frontend/src/app/application-dashboard.js
mécanisme d’extension du centre d’aide
```

Une modification d’une longue liste Core sans nécessité doit être considérée comme un défaut de dérivabilité à analyser.

### 3.3 Sécurité

Le module métier pilote doit respecter les mêmes invariants que le Core :

```text
validation Zod stricte
authentification
contexte Workspace
RBAC
entitlement lorsque applicable
server state via RTK Query
aucune confiance dans le masquage frontend
```

### 3.4 Provenance

Le produit dérivé doit contenir un `core-origin.json` conforme au contrat D-015 :

```json
{
  "schemaVersion": 1,
  "repository": "greg44500/saas-core-api",
  "version": "1.0.0-rc.1",
  "tag": "v1.0.0-rc.1",
  "commit": "<sha exact de la RC intégrée>",
  "integratedAt": "<date ISO>"
}
```

Ce fichier n’est mis à jour qu’après intégration réellement validée d’une version Core.

---

## 4. Pilote métier minimal retenu

Le pilote doit rester volontairement petit afin de tester l’architecture, pas de démarrer un nouveau produit complet.

Domaine retenu :

```text
catalog
```

Fonction métier minimale : gestion de quelques éléments de catalogue Workspace.

Le module doit démontrer au minimum :

```text
backend module catalog
→ model
→ validation
→ service
→ controller
→ routes

RBAC
→ catalog:item:read
→ catalog:item:create

capability
→ catalog

frontend
→ endpoint RTK Query
→ route Workspace
→ navigation
→ page/composants réutilisant le design system Core

Dashboard
→ un widget métier simple filtré par capability + permission

Help
→ au moins une fiche d’aide métier injectée via le point d’extension prévu
```

Le périmètre fonctionnel doit rester assez réduit pour que les conflits d’upgrade soient attribuables à l’architecture et non à la taille du produit pilote.

---

## 5. Phases d’exécution

### Phase A — préparer la première RC Core

Cible :

```text
1.0.0-rc.1
channel = rc
```

À faire :

- aligner `core-release.json`, `package.json`, `package-lock.json`, `frontend/package.json` et `frontend/package-lock.json` ;
- préparer les notes de release structurées ;
- vérifier le manifest de migrations ;
- exécuter `npm run release:check` ;
- ouvrir une PR Core ;
- fusionner uniquement avec `Core Gate` verte ;
- créer le tag/release `v1.0.0-rc.1` sur le SHA validé.

Critère de succès : la RC est immuable, identifiable et sa gate canonique est verte.

### Phase B — créer le dépôt pilote dérivé

À faire :

- cloner la RC Core en conservant l’historique ;
- renommer le remote Core en `upstream-core` ;
- configurer le dépôt pilote comme `origin` ;
- créer `core-origin.json` avec le SHA exact de la RC ;
- vérifier que le produit peut identifier immédiatement sa provenance Core.

Critère de succès : l’historique Git est commun et le produit sait identifier précisément la version Core intégrée.

### Phase C — ajouter le module `catalog`

À faire :

- backend modulaire avec validation stricte ;
- permissions et capability via les registres applicatifs ;
- route backend via le registre de routes ;
- frontend via RTK Query et registre de routes ;
- navigation Workspace par composition ;
- widget Dashboard métier ;
- aide métier additionnelle ;
- tests unitaires/intégration ciblés ;
- E2E métier minimal si le parcours apporte une preuve distincte.

Critère de succès : le module fonctionne sans dupliquer les mécanismes Core ni modifier des zones Core hors points de jonction explicitement prévus.

### Phase D — produire une évolution Core compatible

La modification doit être petite, générique et réellement compatible. Elle ne doit pas être fabriquée dans une zone métier du pilote pour provoquer artificiellement un conflit.

Elle doit suivre le cycle normal du Core : branche, tests, `release:check`, PR, puis nouvelle RC si nécessaire.

Critère de succès : une nouvelle version Core identifiable est disponible pour l’upgrade du pilote.

### Phase E — réaliser l’upgrade réel du pilote

Dans le produit dérivé :

```text
git fetch upstream-core --tags
→ branche core-update/<version>
→ intégration de la nouvelle version Core
→ résolution des conflits éventuels
→ revue migrations / configuration / dépendances
→ tests Core + métier
→ build frontend
→ E2E pertinents
→ mise à jour core-origin.json
→ PR produit
```

Critère de succès : la mise à niveau est intégrable sans perte fonctionnelle et la provenance est mise à jour seulement après validation.

### Phase F — bilan D-017

Documenter :

- nombre et nature des conflits ;
- zones Core modifiées par le pilote ;
- efficacité des points d’extension ;
- migrations/configuration rencontrées ;
- résultats des gates/tests ;
- validation du module d’aide métier ;
- défauts révélés et corrections nécessaires ;
- décision de clôture ou non de D-017.

---

## 6. Tests attendus

### Core

```bash
npm run release:check
```

Cette gate comprend notamment lint, tests backend, lint/tests/build frontend et Playwright E2E Core.

### Module pilote

À couvrir selon l’implémentation réelle :

```text
validation Zod
service métier
RBAC
tenant isolation
capability / entitlement
routing backend
RTK Query
routing frontend
navigation
widget Dashboard
aide métier
```

### Upgrade

Après intégration du nouveau Core dans le pilote :

```text
release metadata / provenance cohérentes
tests Core verts
tests catalog verts
build frontend vert
E2E critiques verts
aucune régression des invariants Workspace
```

---

## 7. Critères de clôture

D-017 ne peut passer `VALIDÉ` que si tous les points suivants sont démontrés :

- une RC Core réelle a été publiée ;
- un dépôt pilote distinct a réellement conservé l’historique Git du Core ;
- `core-origin.json` identifie exactement la RC intégrée ;
- un module métier minimal utilise réellement les points d’extension ;
- le centre d’aide accepte une extension métier sans réécriture du corpus Core ;
- une évolution Core post-dérivation a réellement été intégrée au pilote ;
- migrations/configuration ont été examinées explicitement ;
- les tests Core et métier applicables sont verts ;
- les E2E pertinents sont verts ;
- les conflits et divergences Core/métier ont été analysés ;
- aucune anomalie révélée par l’exercice ne reste classée blocker Core 1.0.

Une simple copie du dépôt, une simulation de merge ou une mise à jour de documentation sans dépôt pilote ne suffit pas à clôturer D-017.
