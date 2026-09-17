# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état courant au démarrage de D-017 — validation réelle de la dérivation et de l’upgrade du Core.
>
> Le code actuel, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-17**

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

## 2. État Git de référence

La synchronisation documentaire post-D-016 / post-audit a été fusionnée via la PR #16.

État `main` validé :

```text
HEAD main : fe0c3821a7d2f9377066c98193df1e522131a0be
PR #16    : fusionnée
Core Gate : #24
run       : 35217570669
result    : success
```

Le ruleset distant `Main protection` reste actif et impose notamment une Pull Request ainsi que le status check `Core Gate`.

D-017 est ouverte sur :

```text
feature/d-017-derived-saas-upgrade-validation
```

La branche a été créée directement depuis le HEAD `main` ci-dessus.

---

## 3. État du Core avant D-017

D-015 — gouvernance de release / provenance / migrations — est validée.

D-016 — E2E du Core avec Playwright — est validée.

L’audit final architecture / sécurité / qualité n’a démontré aucun nouveau blocker applicatif Core 1.0.

Le Core reste actuellement :

```text
version : 0.1.0
channel : development
```

Aucune GitHub Release n’existe au démarrage de D-017. Aucun tag stable `v1.0.0` ne doit être créé avant clôture de D-017.

La gate canonique reste :

```bash
npm run release:check
```

Elle couvre la cohérence de release/migrations, le lint et les tests backend, le lint/tests/build frontend ainsi que les E2E Playwright du Core.

---

## 4. D-017 — objectif réel

D-017 doit valider la stratégie de distribution par un exercice réel et non une simulation documentaire.

Séquence canonique :

```text
release candidate Core
→ dépôt pilote dérivé conservant l’historique Git
→ provenance core-origin.json
→ petit module métier
→ évolution Core compatible
→ branche d’upgrade du produit
→ intégration réelle
→ migrations/configuration
→ tests Core + métier + E2E pertinents
→ analyse des conflits et de la provenance
```

D-017 doit également vérifier qu’un SaaS dérivé peut ajouter une fiche d’aide métier sans modifier le corpus d’aide Core.

Spécification d’exécution :

```text
docs/debt/D-017-derived-saas-upgrade-validation.md
```

---

## 5. Pilote métier retenu

Le domaine pilote minimal retenu est :

```text
catalog
```

Objectif : tester les points d’extension sans construire un nouveau produit complet.

Le module doit démontrer au minimum :

```text
backend module catalog
validation Zod stricte
RBAC métier
capability métier
route backend par composition
RTK Query
route frontend par composition
navigation Workspace
widget Dashboard métier
fiche d’aide métier
```

Les points de jonction applicatifs existants doivent être privilégiés. Une modification inutile des longues listes Core est considérée comme un signal de défaut de dérivabilité.

---

## 6. Première phase — RC Core

La première étape D-017 consiste à préparer une candidate :

```text
version = 1.0.0-rc.1
channel = rc
```

La RC doit respecter les règles D-015 :

- versions cohérentes dans `core-release.json`, les packages et leurs lockfiles ;
- notes de release structurées ;
- inventaire des migrations cohérent ;
- `npm run release:check` vert ;
- PR Core ;
- fusion uniquement avec `Core Gate` verte ;
- tag/release immuable `v1.0.0-rc.1` sur le SHA réellement validé.

Le passage à `1.0.0-rc.1` n’est pas une validation de D-017 : il fournit seulement la base immuable de l’exercice de dérivation.

---

## 7. État canonique des dettes

```text
D-002  VALIDÉ
D-011  VALIDÉ
D-015  VALIDÉ — 2026-09-17
D-016  VALIDÉ — 2026-09-17
D-021  VALIDÉ
D-022  VALIDÉ
D-025  VALIDÉ — 2026-09-16

D-017  EN COURS — validation réelle dérivation + upgrade pilote
D-020  DIFFÉRÉ — validation terrain, non bloquant Core 1.0

D-023  DIFFÉRÉ — Core 1.1
D-024  DIFFÉRÉ — Core 1.1
```

Les dettes de production dépendantes d’un produit réel — conformité finale, billing/payment, observabilité, stockage production et déploiement — restent distinctes de la validation du Core générique.

---

## 8. Séquence restante vers Core stable

```text
D-017 phase A : préparer et publier v1.0.0-rc.1
→ phase B : créer le dépôt pilote avec historique Core conservé
→ phase C : ajouter le module métier catalog
→ phase D : produire une évolution Core compatible
→ phase E : upgrader réellement le pilote
→ phase F : bilan conflits / provenance / tests
→ corriger tout blocker révélé
→ nouvelle gate globale
→ clôturer D-017 uniquement sur preuves réelles
→ v1.0.0 stable seulement ensuite
```

Ne pas créer `v1.0.0` avant validation complète de D-017.

---

## 9. Rappel de méthode

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
