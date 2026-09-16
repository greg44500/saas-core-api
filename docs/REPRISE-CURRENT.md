# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état courant après validation de la gate pré-D-015, nettoyage des branches historiques, synchronisation documentaire et ouverture formelle de D-015.
>
> Le code actuel, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-16**

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

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement prêt pour la production.

---

## 2. État Git de référence

D-025 a été fusionnée dans `main` via la PR #13 puis D-020 a été reclassifiée en validation terrain différée non bloquante.

HEAD applicatif sur lequel la gate globale pré-D-015 a été réellement exécutée et validée par l’utilisateur :

```text
3f645b231ea6c80e77275dfd8b838d2ecba479fa
docs(reprise): open pre-D-015 gate after D-020 reclassification
```

Après cette gate, seules des modifications documentaires Markdown de synchronisation pré-D-015 ont été apportées. Aucun fichier applicatif n’a été modifié.

HEAD de `main` immédiatement avant la présente mise à jour de reprise :

```text
fa6873bba818191872bd3a9f4ce8551cfa5ba85c
docs(debt): open D-015 after validated pre-release gate
```

Les branches distantes historiques ont été nettoyées par l’utilisateur. Vérification finale communiquée :

```text
git branch -r
→ origin/HEAD -> origin/main
→ origin/main

git ls-remote --heads origin
→ refs/heads/main uniquement
```

Avant ce nettoyage, toutes les branches avaient été comparées à `main` ; aucune ne nécessitait une fusion.

À toute nouvelle conversation, commencer par vérifier le HEAD distant réel de `main` : Git et le code restent prioritaires sur cette synthèse.

---

## 3. Gate globale pré-D-015 — VALIDÉE

La gate a été réellement exécutée par l’utilisateur sur le HEAD applicatif `3f645b231ea6c80e77275dfd8b838d2ecba479fa`.

Résultats communiqués :

```text
backend npm run lint    → VERT
backend npm test        → VERT
frontend npm run lint   → VERT
frontend npm test       → VERT
frontend npm run build  → VERT
```

Les parcours critiques manuels retenus pour la pré-validation ont également été confirmés comme validés par l’utilisateur.

Les commits réalisés après cette gate jusqu’à l’ouverture de D-015 ne concernent que la documentation Markdown. Aucune nouvelle gate applicative n’est déclarée sur ces commits documentaires.

---

## 4. Revue finale pré-versionnement — VALIDÉE

La revue pré-D-015 a couvert notamment :

```text
architecture applicative
sécurité et frontières d’autorisation
contrats canoniques
routes et état frontend
migrations / scripts / jobs
état Git et branches distantes
documentation opérationnelle
cohérence D-020 / D-025 / roadmap
```

Aucun nouveau défaut applicatif bloquant n’a été démontré.

Les écarts restant avant D-015 étaient documentaires. Ils ont été synchronisés dans :

```text
README.md
docs/README.md
docs/operations/OPERATIONS.md
docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL-INVITATIONS.md
docs/architecture/FRONTEND.md
frontend/README.md
```

Corrections principales :

- D-025 n’est plus présenté comme un développement futur ;
- D-020 est partout alignée sur son statut différé non bloquant ;
- blockers Core 1.0 recentrés sur D-015, D-016 et D-017 ;
- index des contrats canoniques complété ;
- commandes frontend réelles, migration File manquante et job Retention documentés ;
- contrat Core aligné sur la corbeille/restauration/suppression définitive File réellement implémentées ;
- contrat Platform aligné sur le RBAC Platform, les routes courantes, la rétention et les groupes d’overrides ;
- endpoints et invariant de sécurité du centre d’aide D-025 ajoutés au contrat Core ;
- architecture frontend alignée sur les routes réellement composées, les préférences, la corbeille File, la rétention, l’équipe Platform et l’aide Workspace/Platform.

---

## 5. D-020 — statut à préserver

D-020 correspond à l’onboarding commercial générique et au mécanisme `CommercialInvitation`. Il ne doit pas être confondu avec l’ensemble des invitations Workspace ou Platform.

Décision du 2026-09-16 :

```text
D-020
→ DIFFÉRÉ — validation terrain sur application dérivée / bêta
→ non bloquant pour Core 1.0
```

Le code, le contrat canonique et les tests automatisés déjà validés sont considérés suffisants pour ne pas retarder le versionnement du Core.

La validation fonctionnelle finale sera réalisée en conditions réelles lorsque l’application métier sera développée et déployée pour bêta-test, avec des bêta-testeurs Platform et Workspace / onboarding client.

Cette décision ne transforme pas une validation non exécutée en validation réussie. Toute anomalie découverte pendant la bêta pourra rouvrir D-020 ou créer une dette dédiée.

---

## 6. D-025 — état validé à préserver

D-025 est **VALIDÉE le 2026-09-16** et fusionnée dans `main`.

Le Core fournit :

```text
Centre d’aide Workspace
+
Centre d’aide Platform
→ infrastructure commune
→ catalogue filtré côté serveur avant sérialisation
→ recherche locale sur le seul corpus autorisé
→ fiches contextuelles en drawer
→ point d’extension pour les SaaS dérivés
```

Garanties principales :

- séparation stricte Workspace / Platform ;
- projection backend obligatoire avant sérialisation ;
- permissions, owner, plan/features et mode de remédiation pris en compte côté Workspace ;
- autorisation Platform réelle réutilisée ;
- absence et non-autorisation d’une fiche exposées avec le même comportement générique ;
- point d’extension `APPLICATION_HELP_MODULES` ;
- contenus versionnés avec le Core ;
- aucun CMS, LLM, RAG ou chatbot requis.

D-016 portera la couverture Playwright E2E de release du centre d’aide.

---

## 7. État canonique au démarrage de D-015

```text
D-002  VALIDÉ
D-011  VALIDÉ
D-021  VALIDÉ
D-022  VALIDÉ
D-025  VALIDÉ — 2026-09-16

D-020  DIFFÉRÉ — non bloquant Core 1.0

D-015  EN COURS — ouvert le 2026-09-16
D-016  PLANIFIÉ
D-017  PLANIFIÉ

D-023  DIFFÉRÉ — Core 1.1
D-024  DIFFÉRÉ — Core 1.1
```

Il n’existe plus de blocker pré-D-015 identifié. D-015 devient le blocker Core 1.0 actif courant.

---

## 8. D-015 — périmètre maintenant ouvert

D-015 porte :

```text
versionnement SemVer
provenance du Core
tags et releases
changelog / release notes
contrats et configuration par release
discipline des migrations
ordre pre-deploy / post-deploy
rollback / reprise
gate de release reproductible
préparation de la release candidate
```

L’ouverture de D-015 ne constitue pas encore une décision sur :

```text
protection de branche
GitHub Actions / CI
format exact de provenance machine-readable
registre central de migrations
stratégie précise de tags / release candidate
```

Ces choix doivent être audités et décidés à partir de l’état réel du dépôt dans D-015, et non ajoutés par anticipation.

---

## 9. Première étape obligatoire de D-015

Avant toute modification de version, tag ou mécanisme de release :

```text
1. vérifier le HEAD réel de main ;
2. vérifier package.json racine et frontend/package.json ;
3. inventorier les tags et releases Git existants ;
4. inspecter CI/workflows et protections de branche réellement configurés ;
5. inventorier toutes les migrations et leurs runners ;
6. inspecter la stratégie actuelle de changelog/release notes/provenance ;
7. lire les règles D-015 déjà présentes dans DEBT, OPERATIONS et DERIVED-SAAS ;
8. classer les écarts D-015 par nécessité réelle ;
9. définir seulement ensuite la stratégie de versionnement et de release candidate ;
10. ne créer aucun tag stable v1.0.0 tant que D-016 et D-017 ne sont pas validées.
```

Aucun choix de D-015 ne doit être introduit uniquement parce qu’il est courant dans d’autres projets : il doit répondre à un besoin du Core et à sa stratégie réelle de dérivation / upgrade.

---

## 10. Roadmap restante vers Core stable

```text
ÉTAPE 1 — D-015 EN COURS
→ audit versionnement / provenance / releases / migrations
→ décisions documentées
→ préparation release candidate
→ gate de release reproductible

ÉTAPE 2 — D-016
→ Playwright E2E du Core
→ auth/session
→ lifecycle Account/Workspace
→ isolation tenant
→ RBAC
→ subscription / entitlement / quotas
→ administration Platform
→ Files
→ centre d’aide Workspace / Platform
→ principaux parcours interdits

ÉTAPE 3 — audit final Core
→ architecture
→ sécurité
→ qualité
→ documentation
→ aucun blocker résiduel non traité

ÉTAPE 4 — D-017
→ créer un SaaS dérivé pilote depuis la release candidate
→ ajouter un petit module métier réel
→ ajouter une extension d’aide métier
→ faire évoluer le Core
→ réaliser un upgrade réel du dérivé
→ exécuter migrations/configuration
→ tests Core + métier + E2E
→ analyser conflits et provenance

ÉTAPE 5 — stabilisation finale
→ corrections éventuelles révélées par D-016 / D-017
→ nouvelle gate globale
→ tag/release Core stable uniquement lorsque la stratégie de distribution est réellement validée

APRÈS Core 1.0 / produit dérivé
→ D-020 validation terrain avec bêta-testeurs
→ D-023 transfert de propriété gouverné — Core 1.1
→ D-024 console Platform contextualisée du Workspace — Core 1.1
→ dettes produit applicables : RGPD, Billing, observabilité, stockage production, déploiement, etc.
```

Ne pas confondre :

```text
release candidate Core
≠
tag stable final
≠
produit dérivé production-ready
```

---

## 11. Points à conserver pour D-017

D-017 devra vérifier réellement :

- le mécanisme de composition des modules métier ;
- l’upgrade du Core dans un dérivé ;
- les migrations/configurations ;
- les tests Core + métier ;
- la provenance/version ;
- l’ajout d’un module d’aide métier via le point d’extension D-025 sans modifier le corpus Core ;
- l’absence de dépendance cachée au dépôt Core original.

---

## 12. Rappel de méthode

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
