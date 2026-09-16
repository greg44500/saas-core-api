# SAAS-CORE-API — Discipline de migration

**Statut :** canonique — D-015  
**Dernière mise à jour :** 2026-09-16  
**Périmètre :** migrations MongoDB / données / permissions du Core

---

## 1. Objectif

Une migration fait partie du contrat de release du Core. Elle ne doit pas être découverte ou ordonnée implicitement par l’exploitant après intégration du code.

Le dépôt conserve des runners explicites sous :

```text
backend/migrations/
```

et les expose via des scripts `migration:*` du `package.json` racine.

L’inventaire machine-readable est :

```text
docs/releases/migration-manifest.json
```

---

## 2. Autorités

Pour une migration existante :

```text
code du runner et de la migration
→ contraintes DB
→ tests réellement validés
→ migration-manifest.json
→ release notes / OPERATIONS.md
```

Le manifeste ne change jamais le comportement d’une migration : il décrit l’interface d’exécution et les dépendances réellement démontrées.

---

## 3. Surface exécutable

Toute migration Core exécutable en release doit avoir :

```text
un identifiant stable
un script npm migration:*
un runner Node explicite
une entrée unique dans migration-manifest.json
```

La gate `release:verify` doit refuser :

```text
script migration:* absent du manifeste
entrée de manifeste sans script package.json
runner manquant
doublon d’identifiant / script / runner
dépendance vers une migration inconnue
cycle de dépendances
```

---

## 4. Helpers de migration

Un fichier nommé `*.migration.js` n’est pas automatiquement un runner de release.

Exemple courant :

```text
backend/migrations/backfillRegisteredSystemRolePermissions.migration.js
```

Ce fichier expose une fonction générique de backfill à partir du registre RBAC actif, mais il ne possède actuellement ni runner `run*.js` dédié ni script `migration:*` dans le Core. Il est donc traité comme un helper de migration réutilisable, pas comme une commande de release autonome.

Si un SaaS dérivé doit l’exécuter, il doit fournir un runner explicite adapté à sa composition applicative et documenter cette opération dans sa propre release.

D-017 doit vérifier ce cas lors de la dérivation pilote si des permissions métier sont ajoutées à des rôles système déjà persistés.

---

## 5. Dépendances

Une dépendance n’est ajoutée au manifeste que lorsqu’elle est démontrée par le code ou le contrat.

Exemples actuels :

```text
subscription-term-type
→ dépend de subscription-kind

workspace-member-usage-reconcile
→ réconcilie le backfill workspace-member-usage

baseline-remove-file-upload
→ nécessite l’identification baseline par systemRole
→ dépend donc de baseline-plan-system-role
→ le seed des plans reste également une précondition opérationnelle lorsque la baseline n’existe pas
```

L’ordre du tableau JSON ne remplace pas `dependsOn`.

---

## 6. Nouvelle migration après D-015

Toute nouvelle migration doit être ajoutée dans le même lot que le changement qui la nécessite.

Le lot doit fournir :

```text
fichier migration
runner explicite
script npm migration:*
entrée migration-manifest.json
tests ciblés pertinents
release notes
```

Les release notes doivent préciser :

```text
raison
précondition
dépendances
phase pre-deploy / post-deploy
compatibilité avec l’ancienne version applicative
idempotence / comportement au rejeu
contrôle post-exécution
rollback ou stratégie compensatoire
```

---

## 7. Pre-deploy / post-deploy

Le manifeste global inventorie les migrations existantes ; il ne prétend pas reconstruire rétroactivement une phase de déploiement historique non documentée.

À partir des releases formelles, la phase appartient aux **notes de la release qui introduit la migration** :

```text
pre-deploy
→ doit être exécutée avant ouverture du nouveau code au trafic

post-deploy
→ nécessite le nouveau code ou peut être exécutée après déploiement
```

Une migration non mentionnée dans les release notes de la version qui l’introduit constitue un défaut de release.

---

## 8. Idempotence et rollback

Idempotence et réversibilité sont deux propriétés différentes.

```text
idempotent
→ peut être rejouée sans répéter indéfiniment l’effet

réversible
→ possède une stratégie sûre permettant de restaurer l’état précédent
```

Le dépôt ne possède pas de mécanisme universel `down migration`.

Une migration destructive ou non rétrocompatible exige avant publication :

```text
backup/snapshot adapté
plan de reprise
compatibilité documentée
script compensatoire si pertinent
```

Un `git revert` ne restaure pas automatiquement les données MongoDB.

---

## 9. Registre central d’exécution

D-015 ne crée pas de moteur automatique de migrations appliquées dans MongoDB uniquement pour reproduire les frameworks qui en possèdent un.

Le besoin immédiat est couvert par :

```text
runners explicites
+
inventaire machine-readable vérifié
+
release notes obligatoires
+
gate de release
```

Un registre persistant des migrations appliquées ne sera ajouté que si D-017 ou l’exploitation réelle démontre qu’il apporte une garantie nécessaire que ce modèle ne couvre pas.

---

## 10. Validation

Avant une release candidate ou stable :

```bash
npm run release:verify
```

doit confirmer que les scripts `migration:*` du package racine et `migration-manifest.json` sont strictement cohérents.

Cette vérification structurelle ne remplace pas l’exécution des migrations réellement requises dans l’environnement ciblé.
