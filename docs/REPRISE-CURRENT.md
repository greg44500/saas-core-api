# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état courant après validation et fusion de D-025, puis reclassification de D-020 en validation terrain différée non bloquante pour Core 1.0.
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

D-025 a été fusionnée dans `main` via la PR #13.

HEAD de `main` immédiatement après cette fusion :

```text
93ae51d831a4851a7540c01a5a07240b295a3e6a
feat(help): secure Workspace and Platform help centers (#13)
```

Deux commits documentaires ont ensuite reclassifié D-020 et actualisé la présente reprise.

À toute nouvelle conversation, commencer par vérifier le HEAD distant réel de `main` : Git et le code restent prioritaires sur cette synthèse.

---

## 3. D-025 — état validé

D-025 est **VALIDÉE le 2026-09-16** et fusionnée dans `main`.

Le Core fournit désormais :

```text
Centre d’aide Workspace
+
Centre d’aide Platform
→ infrastructure commune
→ catalogue filtré côté serveur
→ recherche prédictive locale sur le seul corpus autorisé
→ fiches contextuelles en drawer
```

Garanties principales :

- séparation stricte Workspace / Platform ;
- projection backend obligatoire avant sérialisation ;
- permissions, owner, plan/features et mode de remédiation pris en compte côté Workspace ;
- autorisation Platform réelle réutilisée ;
- absence et non-autorisation d’une fiche exposées avec le même comportement générique ;
- point d’extension `APPLICATION_HELP_MODULES` pour les futurs SaaS dérivés ;
- contenus versionnés avec le Core ;
- aucun CMS, LLM, RAG ou chatbot requis ;
- Base UI / Design System réutilisés pour Tabs, Autocomplete, Tooltip et Sheet ;
- aide accessible depuis les topbars Workspace et Platform ;
- recherche prédictive avec navigation clavier et spotlight visuel ;
- deep links et fiches d’aide en drawer avec fermeture croix / backdrop / Escape.

Les tests applicables, lint, build et validations fonctionnelles/visuelles ont été exécutés localement et confirmés verts avant fusion.

D-016 portera la couverture Playwright E2E de release du centre d’aide.

---

## 4. Ajustements UI validés avec D-025

Le contrôle de préférences d’affichage Dashboard est accessible sur toutes les routes du shell courant :

```text
contexte Platform
→ contrôle Platform disponible partout dans /platform/*

contexte Workspace
→ contrôle Workspace disponible partout dans le workspace courant
```

Il reste volontairement absent des shells sans contexte Dashboard pertinent, par exemple Auth, Onboarding ou compte personnel.

Le `EntityDetailsDrawer` partagé conserve désormais une ouverture et une fermeture fluides et cohérentes, avec gestion Base UI du focus et respect de `prefers-reduced-motion`.

---

## 5. D-020 — décision de reclassification

D-020 correspond à l’onboarding commercial générique et au mécanisme `CommercialInvitation`. Il ne doit pas être confondu avec l’ensemble des invitations Workspace ou Platform.

Décision du 2026-09-16 :

```text
D-020
→ DIFFÉRÉ — validation terrain sur application dérivée / bêta
→ non bloquant pour Core 1.0
```

Motif : le code, le contrat canonique et les tests automatisés déjà validés sont considérés suffisants pour ne pas retarder le versionnement du Core. La validation fonctionnelle finale sera réalisée dans des conditions réelles lorsque l’application métier sera développée et déployée pour bêta-test.

Le scénario terrain prévu comprend notamment :

- un bêta-testeur intégrant l’équipe Platform via le parcours approprié ;
- un bêta-testeur intégrant un Workspace / onboarding client lorsque l’application métier sera disponible ;
- la validation du parcours commercial D-020 dans l’environnement réel dès qu’il sera effectivement utilisé.

Cette décision ne transforme pas une validation non exécutée en validation réussie. Toute anomalie découverte pendant la bêta devra être corrigée et pourra rouvrir D-020 ou créer une dette dédiée.

---

## 6. État canonique avant versionnement

```text
D-002  VALIDÉ
D-011  VALIDÉ
D-021  VALIDÉ
D-022  VALIDÉ
D-025  VALIDÉ — 2026-09-16

D-020  DIFFÉRÉ — non bloquant Core 1.0

D-015  PLANIFIÉ
D-016  PLANIFIÉ
D-017  PLANIFIÉ

D-023  DIFFÉRÉ — Core 1.1
D-024  DIFFÉRÉ — Core 1.1
```

Il n’existe donc plus de blocker fonctionnel générique identifié à traiter avant la **gate globale pré-D-015**.

---

## 7. Prochaine étape obligatoire

La prochaine étape n’est pas encore de modifier le versionnement.

Ordre obligatoire :

```text
1. repartir de `main` à jour ;
2. vérifier le HEAD distant réel de `main` ;
3. lire intégralement `docs/REPRISE-CURRENT.md` ;
4. relire D-015, D-016, D-017 et la reclassification D-020 dans `docs/DEBT.md` ;
5. inspecter l’état réel du dépôt sans modification ;
6. exécuter la gate globale pré-D-015 ;
7. effectuer une revue finale pré-versionnement : architecture, sécurité, contrats, migrations, documentation, scripts et état Git ;
8. classer tout écart découvert en BLOQUANT / À CORRIGER AVANT D-015 / DIFFÉRABLE ;
9. corriger uniquement les écarts réellement démontrés ;
10. rejouer la gate si une correction applicative intervient ;
11. seulement lorsque cette revue est verte, ouvrir D-015.
```

Aucun changement SemVer, tag, release ou provenance ne doit être réalisé avant cette gate et cette revue.

---

## 8. Gate globale pré-D-015

À exécuter réellement sur `main` :

```text
backend npm run lint
backend npm test
frontend npm run lint
frontend npm test
frontend npm run build
validation manuelle des parcours critiques retenus pour la gate
```

Ne jamais présenter cette gate comme verte sans exécution réelle sur le HEAD de `main` concerné.

Si la gate est verte et la revue ne révèle aucun blocker : D-015 peut commencer.

---

## 9. Roadmap restante vers Core stable

```text
ÉTAPE 0 — état actuel
D-025 centre d’aide sécurisé                         VALIDÉ + FUSIONNÉ
D-020 invitation commerciale                        DIFFÉRÉ — validation terrain, non bloquant

ÉTAPE 1 — gel pré-versionnement
→ gate globale pré-D-015 sur main
→ revue finale architecture / sécurité / contrats / migrations / documentation
→ correction ciblée uniquement si écart réel
→ nouvelle gate si nécessaire

ÉTAPE 2 — D-015
→ définir la stratégie SemVer
→ préparer la release candidate du Core
→ provenance machine-readable
→ changelog / release notes
→ discipline de migrations et ordre de déploiement
→ stratégie rollback / reprise
→ scripts et gate de release reproductible

ÉTAPE 3 — D-016
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

ÉTAPE 4 — audit final Core
→ architecture
→ sécurité
→ qualité
→ documentation
→ aucun blocker résiduel non traité

ÉTAPE 5 — D-017
→ créer un SaaS dérivé pilote depuis la release candidate
→ ajouter un petit module métier réel
→ ajouter une extension d’aide métier
→ faire évoluer le Core
→ réaliser un upgrade réel du dérivé
→ exécuter migrations/configuration
→ tests Core + métier + E2E
→ analyser conflits et provenance

ÉTAPE 6 — stabilisation finale
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

## 10. Points à conserver pour D-017

D-017 devra vérifier réellement :

- le mécanisme de composition des modules métier ;
- l’upgrade du Core dans un dérivé ;
- les migrations/configurations ;
- les tests Core + métier ;
- la provenance/version ;
- l’ajout d’un module d’aide métier via le point d’extension D-025 sans modifier le corpus Core ;
- l’absence de dépendance cachée au dépôt Core original.

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
