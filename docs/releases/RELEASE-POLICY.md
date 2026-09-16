# SAAS-CORE-API — Politique de versionnement et de release

**Statut :** canonique — D-015  
**Dernière mise à jour :** 2026-09-16  
**Périmètre :** versionnement du Core, release candidate, tags, provenance et notes de version

---

## 1. Objectif

Cette politique rend le cycle de release du Core explicite et reproductible sans confondre :

```text
version de développement
release candidate
release stable
version d’un SaaS dérivé
version du Core intégrée dans un SaaS dérivé
```

Le Core reste en développement tant que D-015, D-016 et D-017 ne sont pas toutes validées.

---

## 2. Source de vérité de version

L’identité machine-readable du Core est :

```text
/core-release.json
```

Le champ `version` doit rester strictement aligné avec :

```text
package.json
package-lock.json
frontend/package.json
frontend/package-lock.json
```

Un écart entre ces fichiers doit faire échouer la gate de release.

Le fichier `core-release.json` contient uniquement une identité de release stable à committer :

```text
schemaVersion
name
repository
version
channel
```

Il ne contient pas le SHA du commit qui le contient lui-même. La provenance immuable d’une release est portée par le tag Git et le commit qu’il référence.

---

## 3. SemVer

Le Core utilise SemVer :

```text
PATCH
1.0.0 → 1.0.1
→ correction compatible

MINOR
1.0.0 → 1.1.0
→ fonctionnalité compatible

MAJOR
1.x.x → 2.0.0
→ rupture de contrat nécessitant une migration explicite
```

Avant la première version stable :

```text
0.x.y
→ développement

1.0.0-rc.N
→ release candidate

1.0.0
→ première release stable
```

Le préfixe de tag est toujours :

```text
v<version>
```

Exemples :

```text
v1.0.0-rc.1
v1.0.0
v1.0.1
v1.1.0
```

---

## 4. Canaux

`core-release.json` accepte les canaux suivants :

```text
development
rc
stable
```

Règles :

```text
development
→ version 0.x.y pendant la préparation initiale

rc
→ version 1.0.0-rc.N ou autre prerelease explicitement décidée

stable
→ version SemVer sans suffixe prerelease
```

Le dépôt est actuellement :

```text
version = 0.1.0
channel = development
```

D-015 ne crée pas automatiquement `v1.0.0`.

---

## 5. Release candidate Core 1.0

D-015 prépare le mécanisme de release candidate.

Le premier tag `v1.0.0-rc.N` ne doit être créé que lorsqu’un HEAD précis a satisfait les gates requises pour la candidate concernée.

D-016 peut révéler des corrections E2E. Une correction après une RC produit une nouvelle candidate :

```text
v1.0.0-rc.1
→ corrections
→ v1.0.0-rc.2
```

Le tag stable `v1.0.0` reste interdit tant que D-016 et D-017 ne sont pas validées.

---

## 6. Git tags et GitHub Releases

Chaque RC ou release stable doit posséder :

```text
1 tag Git annoté ou release GitHub attachée à un tag immuable
+
1 GitHub Release
+
notes de version structurées
```

Un tag publié ne doit pas être déplacé vers un autre commit.

Une erreur dans une release publiée se corrige par une nouvelle version, pas par réécriture silencieuse du tag existant.

---

## 7. Notes de version obligatoires

Chaque release destinée aux applications dérivées documente au minimum :

```text
version
commit/tag source
résumé fonctionnel
changements de contrats observables
correctifs de sécurité pertinents
migrations requises
ordre pre-deploy / post-deploy
variables d’environnement ajoutées/modifiées
changements de dépendances significatifs
instructions d’upgrade
rollback / reprise
contrôles post-déploiement
```

Une migration ou une variable d’environnement ne doit pas être découverte seulement après intégration du code par un SaaS dérivé.

---

## 8. Changelog

Le dépôt utilise `CHANGELOG.md` comme historique humain des releases formelles.

Avant la première RC, l’historique détaillé de développement reste dans Git. Le changelog ne prétend pas reconstruire artificiellement une chronologie de releases qui n’a jamais existé.

À partir de la première RC, chaque version publiée reçoit une entrée datée.

---

## 9. Provenance du Core dans un SaaS dérivé

Le Core expose son identité courante via `core-release.json`.

Un SaaS dérivé doit conserver sa propre provenance d’intégration dans :

```text
core-origin.json
```

Contrat cible :

```json
{
  "schemaVersion": 1,
  "repository": "greg44500/saas-core-api",
  "version": "1.0.0-rc.1",
  "tag": "v1.0.0-rc.1",
  "commit": "<sha du tag Core intégré>",
  "integratedAt": "<date ISO>"
}
```

Le SaaS dérivé met à jour ce fichier après intégration validée d’une nouvelle version du Core.

La version applicative du produit dérivé reste indépendante de la version du Core.

D-017 doit valider ce mécanisme sur un dépôt dérivé réel.

---

## 10. Branche de travail et intégration

Une évolution de release doit être développée sur une branche dédiée puis intégrée dans `main` après validation.

Pour les mises à jour du Core dans un produit dérivé :

```text
upstream-core
→ branche core-update/<version>
→ tests et migrations
→ Pull Request du produit
→ main du produit
```

Une release Core n’est jamais injectée directement dans le `main` d’un produit dérivé sans revue.

---

## 11. Gate de release

La commande canonique du dépôt est :

```bash
npm run release:check
```

Elle doit couvrir au minimum :

```text
cohérence des métadonnées de release
cohérence de l’inventaire des migrations
formatage
lint backend / tooling de release
tests backend
lint frontend
tests frontend
build frontend
```

D-016 étendra la gate de release avec les E2E Playwright avant la release stable.

Une gate locale et une CI doivent exécuter la même commande canonique afin d’éviter deux définitions concurrentes du mot « vert ».

---

## 12. Protection de `main`

Au démarrage de D-015, `main` n’est pas protégée et aucun required status check n’est configuré.

La cible de gouvernance est :

```text
Pull Request obligatoire pour les changements applicatifs/release
+
CI verte
+
required status check correspondant à la gate Core
```

La configuration GitHub de protection/ruleset est une configuration distante et n’est pas représentée uniquement par le code du dépôt. Elle doit donc être vérifiée explicitement à la clôture de D-015.

---

## 13. Règles de stabilité

Une release stable ne doit pas être créée si l’un des éléments suivants reste faux :

```text
version et provenance cohérentes
gate de release verte
migrations documentées
release notes prêtes
tag cible inexistant avant publication
D-016 validée
D-017 validée
aucun blocker Core 1.0 actif
```

`v1.0.0` signifie que la stratégie de distribution et d’upgrade du Core a été réellement éprouvée ; ce n’est pas seulement un changement de nombre dans `package.json`.
