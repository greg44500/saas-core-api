# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état courant après validation de D-025 — Centre d’aide sécurisé Workspace / Platform.
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

## 2. État validé D-025

D-025 est **VALIDÉE le 2026-09-16**.

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

La spécification de clôture est dans :

```text
docs/debt/D-025-secure-help-center.md
```

Les tests applicables, lint, build et validations fonctionnelles/visuelles ont été exécutés localement et confirmés verts le 2026-09-16.

D-016 portera la couverture Playwright E2E de release du centre d’aide.

---

## 3. Ajustements de cohérence UI validés avec la clôture

Le contrôle de préférences d’affichage Dashboard est désormais accessible sur toutes les routes du shell courant :

```text
contexte Platform
→ contrôle Platform disponible partout dans /platform/*

contexte Workspace
→ contrôle Workspace disponible partout dans le workspace courant
```

Il reste volontairement absent des shells sans contexte Dashboard pertinent, par exemple Auth, Onboarding ou compte personnel.

Le `EntityDetailsDrawer` partagé a également été corrigé pour conserver une ouverture et une fermeture fluides et cohérentes, avec gestion Base UI du focus et respect de `prefers-reduced-motion`.

---

## 4. État canonique des blockers Core 1.0

```text
D-002  VALIDÉ
D-011  VALIDÉ
D-021  VALIDÉ
D-022  VALIDÉ
D-025  VALIDÉ — 2026-09-16

D-020  EN COURS
D-015  PLANIFIÉ
D-016  PLANIFIÉ
D-017  PLANIFIÉ

D-023  DIFFÉRÉ — Core 1.1
D-024  DIFFÉRÉ — Core 1.1
```

D-025 ne bloque donc plus la suite.

**D-020 reste le blocker applicatif immédiat** tant que sa validation fonctionnelle manuelle restante n’a pas été constatée ou qu’une reclassification explicite n’a pas été décidée.

---

## 5. Prochaine étape obligatoire

Ne pas ouvrir D-015 immédiatement tant que D-020 reste `EN COURS`.

Ordre :

```text
1. repartir de `main` à jour après intégration de D-025 ;
2. relire D-020 dans `docs/DEBT.md` et le contrat `docs/contracts/COMMERCIAL-INVITATIONS.md` ;
3. vérifier précisément quelle validation fonctionnelle manuelle D-020 reste à réaliser ;
4. clôturer D-020 si les critères sont réellement atteints, sinon la reclassifier explicitement ;
5. rejouer ensuite la gate globale pré-D-015 sur `main` ;
6. effectuer la revue finale pré-versionnement ;
7. seulement ensuite ouvrir D-015.
```

Ne pas redévelopper D-020 si aucun écart code/contrat/test n’est démontré : le point restant est d’abord sa clôture fonctionnelle/documentaire.

---

## 6. Gate globale pré-D-015

Après résolution explicite de D-020 :

```text
backend npm run lint
backend npm test
frontend npm run lint
frontend npm test
frontend npm run build
validation manuelle des parcours critiques
```

Cette gate doit être réellement exécutée sur l’état concerné de `main` avant toute déclaration de readiness pré-D-015.

---

## 7. Roadmap restante avant Core stable

```text
D-025 centre d’aide sécurisé                         VALIDÉ
→ clôture / reclassification D-020
→ gate globale pré-D-015
→ revue finale pré-versionnement
→ D-015 release candidate / SemVer / provenance / migrations
→ D-016 Playwright E2E Core
→ audit final architecture / sécurité / qualité
→ D-017 dérivé pilote + module métier + upgrade réel
→ corrections éventuelles
→ nouvelle gate
→ tag/release Core stable lorsque la stratégie est réellement validée
```

Ne pas confondre :

```text
release candidate Core
≠
tag stable final
≠
produit dérivé production-ready
```

Évolutions explicitement différées après Core 1.0 :

```text
D-023 demande gouvernée de transfert de propriété
D-024 console Platform contextualisée du Workspace
assistant conversationnel / IA au-dessus du centre d’aide
```

---

## 8. Points à conserver pour la dérivation future

D-017 devra notamment vérifier réellement :

- le mécanisme de composition des modules métier ;
- l’upgrade du Core dans un dérivé ;
- les migrations/configurations ;
- les tests Core + métier ;
- la provenance/version ;
- l’ajout d’un module d’aide métier via le point d’extension D-025 sans modifier le corpus Core.

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
