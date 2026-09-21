# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état courant après publication réelle de `v1.1.0` stable et validation post-release de ses preuves GitHub.
>
> Le code actuel, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-21**

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
version : 1.1.0
tag : v1.1.0
commit : 8326fb48856dcef151b5ab01495c934951050d6d
GitHub Release : Core 1.1.0 — WorkspaceMember transactional lifecycle
release id : 392837893
publication : 2026-09-21T09:39:46Z
statut : stable — non draft / non prerelease
```

Validation fonctionnelle et de release :

```text
PR #29 — feat(workspace-members): add transactional removal lifecycle
HEAD PR : 281bf7f827c710c19fc107d7e5b723b8b85e0e2c
Core Gate #49 / run 35581178327 : success

merge fonctionnel : 065b64a8362222a134aa2d7117ea8627caa95ca5
Core Gate #50 / run 35581807433 : success

PR #30 — release: prepare Core 1.1.0
HEAD PR : d23e762c58689937f6ea08a864b3dfb13bb5c32e
Core Gate #51 / run 35582853334 : success

merge release : 8326fb48856dcef151b5ab01495c934951050d6d
Core Gate #52 / run 35583462463 : success
```

Le tag `v1.1.0` cible exactement le commit
`8326fb48856dcef151b5ab01495c934951050d6d`.

`core-release.json`, le package racine, les lockfiles et le package frontend
sont alignés sur `1.1.0` / `stable`.

La release introduit un point d’extension générique et rétrocompatible :

```text
backend/config/applicationWorkspaceMemberLifecycle.registry.js
→ onMemberRemoved
→ exécution dans la transaction MongoDB Core
→ erreur applicative propagée pour rollback
```

Les deux voies Core actuelles vers `WorkspaceMember.status = REMOVED` sont
couvertes : retrait administratif et fermeture de compte. `SUSPENDED` ne
déclenche pas ce lifecycle.

Les anciennes releases stables restent des références immuables, notamment
`v1.0.0` et `v1.0.1`.

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

La publication de `v1.1.0` est terminée et vérifiée :

```text
PR #29 fonctionnelle
→ Core Gate #49 : success
→ merge 065b64a...
→ Core Gate #50 : success

PR #30 release
→ Core Gate #51 : success
→ merge 8326fb4...
→ Core Gate #52 : success

tag v1.1.0
→ cible 8326fb48856dcef151b5ab01495c934951050d6d
→ GitHub Release 392837893
→ stable / non draft / non prerelease
```

Le prochain travail prioritaire est l’upgrade contrôlé du premier produit
métier réel :

```text
greg44500/saas-fiches-techniques-gms
Core actuel : v1.0.1
Core cible : v1.1.0
```

L’upgrade doit rester strictement séparé de l’implémentation métier :

```text
core-update/v1.1.0
→ intégrer le tag Core
→ vérifier le diff
→ exécuter les gates
→ mettre à jour core-origin.json après validation
→ documenter le contrat disponible
→ Pull Request produit
```

Le produit pourra ensuite, dans son propre projet métier, implémenter son
handler `onMemberRemoved` pour ses relations d’accès. Le Core ne doit jamais
importer ces modèles métier.

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
