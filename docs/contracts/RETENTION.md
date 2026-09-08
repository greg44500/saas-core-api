# SAAS-CORE-API — Contrat Core de rétention et purge

**Statut :** canonique  
**Dernière mise à jour :** 2026-09-08  
**Périmètre :** mécanismes génériques de rétention et purge du Core

---

## 1. Objet

Ce contrat définit les invariants techniques et de sécurité du moteur générique de rétention / purge du Core.

Il ne définit aucune politique juridique universelle de conservation des données.

```text
D-019
→ moteur technique générique, sécurisé, configurable et traçable

D-006
→ politique réelle de conservation / anonymisation / suppression selon le produit et le cadre applicable
```

Le Core ne doit jamais inventer une durée juridique de conservation applicable à toutes les applications dérivées.

---

## 2. Frontières fonctionnelles

### 2.1 Files

La suppression utilisateur ordinaire d'un `File` est un soft-delete.

```text
ACTIVE
→ DELETED
→ purge physique différée après échéance
→ PURGED
```

La corbeille, son listing et la restauration restent du ressort de D-002 et ne font pas partie de D-019.

Tant que le contenu physique existe encore, un fichier `DELETED` continue de consommer le quota `storage_bytes`.

```text
storage_bytes
= fichiers actifs + fichiers DELETED encore physiquement stockés
```

La capacité de stockage n'est libérée qu'après purge physique réellement réussie.

### 2.2 AuditLog

`AuditLog` est la première cible administrable du moteur générique de rétention.

Les suppressions applicatives ordinaires d'AuditLogs restent interdites. La purge passe uniquement par l'adapter technique étroit du moteur de rétention.

---

## 3. Registre code-owned et configuration persistée

Les cibles de rétention autorisées sont déclarées par le code.

Le registre définit notamment :

- la clé de target ;
- l'action autorisée ;
- les capabilities ;
- les bornes de configuration ;
- l'adapter technique associé.

La configuration runtime persistée ne peut contenir que les réglages explicitement autorisés et strictement validés.

Le frontend ne peut jamais fournir :

- un nom de collection MongoDB arbitraire ;
- un filtre MongoDB libre ;
- un cutoff arbitraire ;
- une requête générique de suppression ;
- une action destructive non déclarée par le registre.

---

## 4. RetentionPolicy

Les policies sont versionnées et append-only.

La version courante est la version la plus élevée pour la target concernée.

La création d'une nouvelle version utilise un contrôle optimiste via `expectedVersion` afin d'empêcher l'écrasement silencieux d'une modification concurrente.

La configuration persistée reste strictement validée et bornée.

Aucune durée juridique n'est inventée automatiquement lorsque la première policy n'existe pas encore.

---

## 5. Preview et cutoff

Le backend calcule lui-même :

- le cutoff ;
- l'éligibilité ;
- le nombre d'éléments concernés ;
- l'impact maximal du run selon les limites de batch ;
- le nombre estimé de batches ;
- l'état tronqué ou non de la preview.

Le frontend demande et affiche la preview ; il ne décide jamais de l'éligibilité à la suppression.

Une purge manuelle doit être liée à une preview récente et à la version courante de la policy.

Le backend revérifie les valeurs attendues avant l'exécution destructive et refuse fail-closed si l'état a changé.

---

## 6. Permissions Platform

Permissions dédiées :

```text
platform:retention:read
platform:retention:preview
platform:retention:update
platform:retention:execute
```

Classification :

```text
read    → SENSITIVE
preview → SENSITIVE
update  → RESERVED
execute → RESERVED
```

Attribution système validée :

```text
Fondateur / Super administrateur
→ read + preview + update + execute

Administrateur de la Plateforme
→ read + preview

Support technique / commercial / client
→ aucun droit par défaut
```

Les rôles personnalisés ne peuvent jamais recevoir les permissions `RESERVED` `retention:update` et `retention:execute`.

La sécurité backend reste l'autorité ; le masquage frontend n'est qu'une projection UX des permissions effectives.

---

## 7. Exécutions manuelles et planifiées

Une exécution manuelle destructive :

- exige la permission `platform:retention:execute` ;
- exige une policy active autorisant l'exécution manuelle ;
- exige une confirmation exacte fournie par la preview ;
- revérifie la version et l'impact côté serveur ;
- refuse en cas de conflit ou d'état devenu obsolète.

Le scheduler utilise une identité technique système. Il ne doit jamais usurper un utilisateur Super administrateur.

La commande de job planifié est destructive lorsqu'une policy active et éligible existe ; elle ne doit pas être exécutée manuellement comme simple commande de test.

---

## 8. RetentionExecution

La traçabilité d'une purge est indépendante des `AuditLog` susceptibles d'être supprimés.

`RetentionExecution` conserve une trace technique durable comprenant notamment :

- policy et version ;
- trigger ;
- début et fin ;
- cutoff serveur ;
- statut ;
- compteurs ;
- batches traités ;
- initiateur pour une exécution manuelle ;
- snapshot sûr de configuration ;
- informations techniques de lock/lease nécessaires au moteur ;
- code d'erreur exploitable sans secret.

Il est interdit de recopier le contenu des AuditLogs purgés dans cette trace.

Les serializers API ne doivent pas exposer les identifiants internes de lease/holder inutiles au frontend.

---

## 9. Concurrence, locks et reprise

Le moteur doit rester :

- borné par batches ;
- idempotent ;
- compatible multi-instance ;
- protégé par lock/lease distribué ;
- capable de reprendre après échec ;
- fail-closed lorsque le lock ou l'état attendu ne peut pas être garanti.

Pour les Files, le claim de purge est atomique et identifiable afin qu'une future restauration D-002 ne puisse pas considérer comme restaurable un fichier déjà pris en charge par un worker de purge.

La libération du quota `storage_bytes` intervient exactement une fois après purge physique réussie et finalisation valide du claim.

---

## 10. API Platform

Routes dédiées sous `/api/platform/retention` :

```text
GET  /
GET  /:targetKey
GET  /:targetKey/executions
POST /:targetKey/preview
POST /:targetKey/policy-versions
POST /:targetKey/executions
```

Il n'existe aucune route générique `DELETE` permettant de cibler librement des données.

Les bodies d'écriture restent stricts et ne contiennent jamais collection/filter/cutoff arbitraires.

---

## 11. Frontend Platform

L'administration Platform expose « Rétention & purge » dans le groupe « Sécurité & données ».

Règles :

- serveur state via RTK Query ;
- `useState` uniquement pour l'état UI transitoire ;
- aucune nouvelle slice Redux dédiée ;
- boutons et formulaires non autorisés masqués plutôt que rendus inutilement indisponibles ;
- composants partagés réutilisés ;
- historique basé sur le `DataTable` partagé ;
- confirmation destructive explicite ;
- conflit `409` invalide la preview et impose une nouvelle prévisualisation.

Le frontend ne reconstruit jamais la logique de purge ni le cutoff.

---

## 12. Validation D-019

D-019 est considéré VALIDÉ le 2026-09-08 après confirmation utilisateur des gates suivantes :

```text
backend ciblé / sécurité      ✅
backend global                 ✅
frontend ciblé                 ✅
frontend global                ✅
build Vite production          ✅
```

Les principaux lots validés couvrent : fondations et registre, persistence/versionnement, purge File sécurisée, adapter AuditLog, scheduler et lock distribué, API Platform, frontend Platform et non-régressions.

Toute évolution future du moteur doit préserver ce contrat et rester compatible avec la frontière D-002 / D-006.
