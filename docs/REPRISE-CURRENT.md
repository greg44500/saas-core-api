# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état courant après publication réelle de `v1.0.1` stable et validation post-release de ses preuves GitHub.
>
> Le code actuel, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-18**

---

## 1. Hiérarchie d’autorité

En cas de contradiction :

1. code actuel et contraintes DB ;
2. tests automatisés réellement exécutés et validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. présent fichier de reprise.

Les anciennes synthèses de reprise ne sont pas autoritatives lorsqu’elles sont dépassées.

---

## 2. État Core de référence

La release stable courante du Core est réellement publiée :

```text
version : 1.0.1
tag : v1.0.1
commit : 9613bdb0c70ee1950dfa7da68e5cbefa704e88f1
GitHub Release : Core 1.0.1 — Patch stable
release id : 391556800
publication : 2026-09-18T14:50:42Z
statut : stable — non draft / non prerelease
```

Validation de la release `1.0.1` :

```text
PR #27 — Release — Core 1.0.1
HEAD PR : 14d4745d8c24c80050f0fe3759f3d1b5cf3c5df1
Core Gate #45
run : 35356056148
result : success

merge main : 9613bdb0c70ee1950dfa7da68e5cbefa704e88f1
Core Gate #46
run : 35356874737
result : success
```

Le tag annoté `v1.0.1` cible exactement le commit `9613bdb0c70ee1950dfa7da68e5cbefa704e88f1`.

`core-release.json`, le package racine et le package frontend sont alignés sur `1.0.1` / `stable`.

La release stable initiale `v1.0.0` reste une référence publiée immuable :

```text
tag : v1.0.0
commit : dfdd39a57c7fb1ec7e53ab7778a806fdc86f1dff
release id : 390898671
```

Les tags publiés `v1.0.0-rc.1`, `v1.0.0-rc.2`, `v1.0.0` et `v1.0.1` ne doivent pas être déplacés ou réécrits.

---

## 3. D-017 — état final

D-017 est **VALIDÉE le 2026-09-17**.

L’exercice réel a démontré :

```text
Core 1.0.0-rc.1
→ dépôt dérivé avec historique Git commun
→ provenance core-origin.json
→ module métier catalog
→ évolution générique du Core
→ publication 1.0.0-rc.2
→ merge Git réel de RC2 dans le pilote
→ zéro conflit manuel
→ provenance mise à jour après validation
→ gates Core + métier + frontend + E2E vertes
→ fusion dans main du pilote
→ gate post-merge verte
```

Document de preuve :

```text
docs/debt/D-017-derived-saas-upgrade-validation.md
```

---

## 4. Pilote dérivé validé

Dépôt :

```text
greg44500/saas-core-derived-pilot
```

Module métier :

```text
catalog
```

PR métier :

```text
#2 — D-017 — Add derived catalog pilot module
merge : f0bb28ce06d782d5b4bb125f659789b5fdb04e49
Core Gate #6 : success
```

Le module contient notamment :

```text
backend modulaire
validation Zod
RBAC catalog:item:read / catalog:item:create
capability catalog
migration métier des rôles système persistés
RTK Query
route/navigation Workspace
page catalog
widget Dashboard
extension du centre d’aide
tests métier et de composition
```

L’aide métier est ajoutée par le point d’extension applicatif, sans réécrire le corpus Core.

---

## 5. Upgrade réel rc.1 → rc.2

Branche d’upgrade pilote :

```text
core-update/1.0.0-rc.2
```

Merge Git Core → pilote :

```text
c654c3e4e3b3f4821b9bd210cb3b21e2afbe37ea
```

Parents :

```text
pilote avant upgrade : cd13ab0f6a1a1b28a1b8e84102ae990ad0543ce1
Core rc.2            : 5c61c7066eeb56460adb164ba39ae0a0462bef53
```

Résultat :

```text
MERGE_CONFLICT_COUNT=0
```

Aucune modification fonctionnelle de `catalog` n’a été nécessaire.

La RC2 n’a introduit pour cet upgrade :

- aucune migration Core nouvelle ;
- aucune variable d’environnement nouvelle ;
- aucune dépendance ajoutée, supprimée ou mise à niveau ;
- aucun changement de contrat DB.

La migration métier `catalog` reste dans le produit dérivé.

---

## 6. Provenance finale du pilote

`core-origin.json` identifie :

```text
repository : greg44500/saas-core-api
version    : 1.0.0-rc.2
tag        : v1.0.0-rc.2
commit     : 5c61c7066eeb56460adb164ba39ae0a0462bef53
integratedAt : 2026-09-17T15:49:58Z
```

La provenance n’a été mise à jour qu’après validation de l’upgrade RC2 sans provenance finale.

---

## 7. Gates finales du pilote

Avant mise à jour de provenance :

```text
HEAD : c654c3e4e3b3f4821b9bd210cb3b21e2afbe37ea
Core Gate #9
run : 35242233294
result : success
```

Après mise à jour de provenance :

```text
HEAD : bbf8c79bd803b9f31dd504388f8c7e98068b8a2e
Core Gate #10
run : 35242912831
result : success
```

Après fusion de la PR d’upgrade dans `main` du pilote :

```text
PR #3 — D-017 — Upgrade derived pilot to Core 1.0.0-rc.2
merge : fd7a31d6532898e951b02e75940c09de1eec63ea
Core Gate #11
run : 35243957546
result : success
Run canonical Core gate : success
```

Cette dernière gate est la preuve post-merge de l’état réellement intégré du SaaS dérivé.

---

## 8. État canonique des dettes

Les blockers applicatifs génériques décidés avant le gel Core 1.0 sont levés :

```text
D-002  VALIDÉ
D-011  VALIDÉ
D-015  VALIDÉ — 2026-09-17
D-016  VALIDÉ — 2026-09-17
D-017  VALIDÉ — 2026-09-17
D-021  VALIDÉ
D-022  VALIDÉ
D-025  VALIDÉ — 2026-09-16
```

Restent distinctes les dettes liées à un produit ou un environnement réel :

```text
D-003 conformité / RGPD
D-004 Billing / Payment
D-005 observabilité
D-006 rétention / anonymisation réglementaire
D-007 stockage fichiers production
D-012 E2E propres à chaque application dérivée
D-013 configuration / déploiement production
D-020 validation terrain invitation commerciale / onboarding bêta
```

Évolutions déjà différées après Core 1.0 :

```text
D-023 demande gouvernée de transfert de propriété — Core 1.1
D-024 console Platform contextualisée du Workspace — Core 1.1
```

---

## 9. Conséquence de D-017

D-017 démontre que le Core peut réellement être dérivé puis mis à niveau en conservant le métier.

Elle ne démontre pas qu’un SaaS dérivé est automatiquement production-ready.

```text
Core 1.0 stable
≠
produit dérivé automatiquement prêt pour la production
```

Les obligations propres au produit, à son infrastructure et à son contexte légal/commercial restent à traiter au niveau du dérivé concerné.

---

## 10. État post-release et prochaine décision

La publication de `v1.0.1` est terminée et vérifiée :

```text
PR #27 fusionnée
→ main 9613bdb0c70ee1950dfa7da68e5cbefa704e88f1
→ Core Gate #46 / run 35356874737 : success
→ tag annoté v1.0.1
→ tag cible exactement 9613bdb0c70ee1950dfa7da68e5cbefa704e88f1
→ GitHub Release 391556800
→ stable / non draft / non prerelease
→ core-release.json : 1.0.1 / stable
→ package racine : 1.0.1
→ package frontend : 1.0.1
```

Le patch `1.0.1` formalise la séparation suivante pour les SaaS dérivés :

```text
core-release.json
→ identité/version du Core

core-origin.json
→ provenance exacte du Core intégré

product-release.json
→ identité/version applicative propre au produit dérivé
```

Le prochain travail prioritaire n’est pas une nouvelle évolution fonctionnelle du Core. Il consiste à intégrer `v1.0.1` dans le premier produit métier réel `greg44500/saas-fiches-techniques-gms` via une branche dédiée `core-update/v1.0.1`.

Séquence attendue :

```text
vérifier l’état réel du produit
→ vérifier core-origin.json
→ fetch upstream-core --tags
→ créer core-update/v1.0.1
→ merger le tag v1.0.1
→ revoir le diff réel
→ créer product-release.json
→ adapter uniquement les identités/configurations propres au produit qui doivent l’être
→ exécuter les gates Core + produit + frontend + E2E applicables
→ mettre à jour core-origin.json seulement après validation
→ ouvrir la PR produit
→ fusionner après gates vertes
→ vérifier la gate post-merge
```

Le pilote `saas-core-derived-pilot` reste une preuve de dérivation/upgrade et ne doit pas devenir la base du produit réel.

Les évolutions Core 1.1 déjà différées restent séparées :

```text
D-023 — demande gouvernée de transfert de propriété
D-024 — console Platform contextualisée du Workspace
```

Elles ne bloquent pas le démarrage du cadrage métier du produit après validation de son upgrade Core `v1.0.1`.

---

## 11. Rappel de méthode

À chaque reprise :

```text
Git réel
→ code réel
→ tests réellement exécutés
→ contrats canoniques
→ docs canoniques
→ synthèse de reprise
```

Ne jamais faire l’inverse.
