# SAAS-CORE-API — Contrat de documentation du code source

## 1. Objet

Ce document définit la politique canonique de documentation du code source du Core `saas-core-api`.

Le Core est conçu pour être maintenable, auditable et clonable afin de servir de socle à de futurs SaaS. Un développeur qui n'a pas participé à sa construction doit pouvoir comprendre rapidement les responsabilités importantes, les contrats publics, les invariants métier ou de sécurité, les effets de bord et les choix non évidents sans devoir reconstituer ces informations uniquement à partir de l'implémentation.

La documentation source complète le code ; elle ne le remplace pas et ne doit pas le paraphraser.

---

## 2. Principe directeur

> Le code doit être explicite, mais chaque fichier de production important doit aussi documenter sa responsabilité, son contrat, ses invariants, ses effets de bord et les raisons non évidentes de ses choix lorsque ces informations sont pertinentes.

La documentation doit prioritairement répondre aux questions qu'un nom de fonction, une signature ou une suite d'instructions ne permet pas de résoudre immédiatement :

- pourquoi cette responsabilité existe ici ;
- quelle frontière architecturale le fichier protège ;
- quelles préconditions doivent être respectées ;
- quels invariants métier, multi-tenant ou de sécurité ne doivent pas être cassés ;
- quels effets de bord sont attendus ;
- quelles décisions sont volontairement déléguées à une autre couche ;
- pourquoi une solution non évidente a été retenue ;
- quelles conditions rendent une opération rejouable, idempotente ou sûre en concurrence.

Toutes ces rubriques ne sont pas obligatoires dans chaque fichier. Seules les informations réellement utiles doivent être présentes.

---

## 3. Ce que la documentation ne doit pas devenir

La documentation source ne doit jamais :

- commenter chaque ligne ;
- répéter le nom d'une fonction ou d'une variable ;
- créer un JSDoc artificiel pour chaque petite fonction privée ;
- décrire une syntaxe JavaScript évidente ;
- dupliquer mécaniquement des types déjà évidents ;
- transformer JavaScript en pseudo-TypeScript ;
- masquer une architecture confuse au lieu de la corriger dans le périmètre approprié ;
- justifier un refactor hors périmètre ;
- modifier une règle métier sous prétexte de documentation ;
- créer ou dupliquer un composant frontend ;
- documenter une hypothèse qui n'est pas garantie par le code ou les contrats du Core.

Un commentaire devenu faux est plus dangereux qu'une absence de commentaire. Toute modification qui change un contrat documenté doit mettre à jour la documentation associée dans le même lot.

---

## 4. Deux niveaux de documentation

### 4.1 Documentation de fichier ou de module

Un fichier de production important doit fournir le contexte nécessaire pour comprendre sa responsabilité globale lorsque celle-ci n'est pas triviale.

Cette documentation peut prendre la forme :

- d'un commentaire de tête de fichier ;
- d'un commentaire placé au-dessus de l'élément principal du module ;
- d'un JSDoc porté par l'API publique principale lorsque celui-ci suffit à exprimer le contrat du fichier.

Elle peut couvrir, selon les besoins :

- responsabilité ;
- frontière avec les autres couches ;
- contrat principal ;
- invariants ;
- effets de bord ;
- contraintes de sécurité ;
- comportement multi-tenant ;
- gestion de la concurrence ;
- comportement de reprise ou d'idempotence ;
- choix de conception non évident.

Il est interdit d'imposer un template comportant des rubriques vides ou artificielles.

### 4.2 JSDoc d'API

JSDoc est utilisé lorsque la maintenance bénéficie d'un contrat explicite sur une API publique ou réutilisable.

Il est particulièrement pertinent pour :

- services métier exportés ;
- helpers réutilisables ;
- hooks ;
- adapters ;
- registries extensibles ;
- jobs ;
- migrations ;
- fonctions de sécurité importantes ;
- composants partagés ;
- composants métier complexes lorsqu'ils exposent un contrat significatif ;
- API techniques réutilisables.

JSDoc ne doit pas être ajouté uniquement pour satisfaire une métrique de couverture documentaire.

---

## 5. Politique par catégorie de fichier

### 5.1 Services métier

Attendu : documentation forte.

Un service métier important doit documenter :

- sa responsabilité et sa frontière métier ;
- les préconditions qui ne sont pas triviales ;
- les invariants protégés ;
- les effets de bord persistants ;
- le comportement transactionnel lorsque celui-ci est significatif ;
- les erreurs métier importantes ou le comportement fail-closed ;
- les règles de concurrence ou d'idempotence lorsque pertinentes.

Les fonctions exportées majeures doivent recevoir un JSDoc lorsque leur contrat ne peut pas être compris de manière fiable à partir de leur nom et de leur signature.

Les petits helpers privés ne sont pas documentés mécaniquement.

### 5.2 Models Mongoose

Attendu : documentation des invariants de données.

Le model doit expliquer les contraintes qui dépassent la simple lecture du schéma :

- responsabilités du document ;
- immutabilités importantes ;
- relations avec d'autres domaines ;
- snapshots métier ;
- invariants temporels ;
- index ayant une portée métier ou de concurrence ;
- middleware Mongoose non trivial ;
- raisons des validations particulières.

Il n'est pas nécessaire de commenter chaque champ évident.

### 5.3 Validations Zod

Attendu : documentation ciblée.

La validation doit rendre explicites les règles sensibles ou non évidentes, notamment :

- bornes de sécurité ;
- formats volontairement plus stricts que le stockage ;
- discriminants métier ;
- refus de champs arbitraires ;
- différences intentionnelles entre payload entrant et model persistant.

Une suite de règles évidentes comme `min`, `max`, `email` ou `enum` n'a pas besoin d'être commentée individuellement si son intention est claire.

### 5.4 Controllers

Attendu : documentation légère à moyenne.

Un controller simple qui traduit une requête HTTP vers un service n'a pas besoin d'un JSDoc mécanique sur chaque handler.

Documenter lorsque nécessaire :

- le contrat HTTP n'est pas évident ;
- une donnée est volontairement extraite d'un contexte sécurisé plutôt que du payload ;
- l'ordre des opérations a une importance ;
- une responsabilité est volontairement déléguée au service.

La logique métier lourde ne doit pas être documentée dans le controller pour compenser son mauvais emplacement : elle doit rester dans le service.

### 5.5 Routes

Attendu : documentation de frontière.

Pour un fichier de routes important, documenter :

- le domaine exposé ;
- la frontière d'authentification ou d'autorisation ;
- l'ordre des middlewares lorsque cet ordre protège un invariant ;
- les permissions nécessaires lorsque la lecture du pipeline ne suffit pas.

Ne pas commenter chaque appel `router.get`, `router.post`, `router.patch` ou `router.delete` si le chemin et les middlewares sont explicites.

### 5.6 Middlewares

Attendu : documentation forte pour la sécurité et le contexte de requête.

Un middleware important doit documenter :

- sa précondition ;
- les données qu'il lit ;
- les données fiables qu'il ajoute à `req` ;
- les responsabilités qu'il ne prend volontairement pas en charge ;
- son comportement fail-closed ;
- les raisons d'un contrôle de sécurité non évident.

Les middlewares d'authentification, RBAC, multi-tenant, validation, upload et sécurité sont prioritaires.

### 5.7 Adapters et registries

Attendu : documentation forte et systématique.

Ils doivent expliquer :

- le contrat d'extension ;
- les responsabilités autorisées ;
- les entrées et sorties attendues ;
- les opérations volontairement interdites ;
- les limites de sécurité ;
- la manière dont une nouvelle implémentation doit être ajoutée sans élargir arbitrairement les pouvoirs du système.

Un adapter ou registry de sécurité ne doit jamais devenir une abstraction générique permettant au frontend de fournir des requêtes, collections, filtres ou opérations arbitraires.

### 5.8 Jobs

Attendu : documentation forte.

Un job doit préciser lorsque pertinent :

- sa responsabilité opérationnelle ;
- son mode de déclenchement ;
- son unité de traitement ou batch ;
- ses effets de bord ;
- son comportement en cas d'échec partiel ;
- son idempotence ou sa rejouabilité ;
- son comportement en concurrence ;
- les raisons de paramètres injectables comme `now`, `batchSize`, `logger` ou une identité système.

Le runner CLI et la fonction métier du job doivent conserver des responsabilités distinctes lorsqu'elles existent déjà.

### 5.9 Migrations

Attendu : documentation forte.

Une migration doit documenter :

- l'objectif ;
- l'état attendu avant exécution ;
- l'état attendu après exécution ;
- l'idempotence ou la stratégie de reprise ;
- les données concernées ;
- les précautions opérationnelles ;
- les effets irréversibles éventuels.

Une migration ne doit pas dépendre d'une connaissance implicite détenue uniquement par son auteur.

### 5.10 RTK Query

Attendu : documentation de frontière serveur.

Un module RTK Query important doit expliquer lorsque pertinent :

- le domaine serveur qu'il représente ;
- les paramètres qui proviennent du contexte de route ou d'un état local ;
- les tags et invalidations non évidents ;
- la stratégie de cache ;
- les comportements d'authentification ou de réauthentification partagés ;
- ce qui reste sous l'autorité du backend.

Le frontend ne doit jamais être documenté comme autorité d'une permission, d'une limite, d'un entitlement ou d'une règle métier réellement imposée par le backend.

### 5.11 Composants partagés

Attendu : documentation forte du contrat de réutilisation.

Un composant partagé doit documenter les props importantes et les comportements qui ne sont pas immédiatement évidents, notamment :

- accessibilité ;
- focus ;
- animation ;
- ownership de l'état ;
- callbacks ;
- contraintes de composition ;
- comportements de fermeture ou de confirmation ;
- responsabilités volontairement laissées au composant métier appelant.

La documentation ne remplace jamais l'exigence de réutilisabilité. Un nouveau composant dupliqué ne devient pas acceptable parce qu'il est documenté.

### 5.12 Composants métier complexes

Attendu : documentation ciblée à forte.

Un composant métier complexe doit expliquer :

- son rôle dans le workflow ;
- les données serveur qu'il orchestre ;
- les mutations qu'il déclenche ;
- les invariants UI ou de sécurité importants ;
- ce qui est affiché conditionnellement ;
- ce que le backend revérifie et garde sous son autorité.

Les handlers locaux évidents ne doivent pas recevoir un JSDoc artificiel.

### 5.13 Pages React

Attendu : documentation uniquement lorsque la page orchestre une responsabilité significative.

Une page purement compositionnelle n'a pas besoin d'un commentaire obligatoire.

Une page doit être documentée si elle orchestre plusieurs domaines, permissions, queries, mutations, redirections ou étapes de workflow qui ne sont pas évidentes.

La page reste une couche d'assemblage et ne doit pas contenir de logique métier lourde.

### 5.14 Hooks et helpers

Attendu : JSDoc lorsque réutilisables ou contractuels.

Un hook ou helper réutilisable doit documenter :

- ses paramètres importants ;
- sa valeur de retour ;
- ses cas limites ;
- ses effets de bord ;
- ses hypothèses ;
- ses garanties.

Un helper privé trivial n'a pas besoin de documentation.

### 5.15 Tests critiques

Attendu : contexte documentaire court lorsque la suite protège un invariant important.

Les domaines prioritaires sont :

- authentification et sessions ;
- RBAC et permissions ;
- isolation multi-tenant ;
- subscriptions et trial ;
- quotas et fichiers ;
- permissions Platform ;
- rétention et purge ;
- concurrence et leases ;
- lifecycle commercial ;
- sécurité des validations et des frontières.

Le commentaire doit expliquer l'invariant protégé ou la classe de régression que la suite empêche. Il ne doit pas paraphraser chaque test.

### 5.16 Tests simples

Attendu : pas de documentation artificielle.

Des noms `describe` et `it` précis et orientés comportement constituent normalement une documentation suffisante.

Un commentaire n'est ajouté que lorsqu'il apporte un contexte métier, de sécurité ou de non-régression impossible à comprendre autrement.

---

## 6. Règles JSDoc

### 6.1 Quand utiliser JSDoc

Utiliser JSDoc lorsqu'il clarifie un contrat public ou réutilisable.

Exemples pertinents :

```js
/**
 * Vérifie une permission à partir du contexte workspace déjà fiabilisé.
 *
 * Ce middleware ne résout volontairement ni le membership ni le rôle : ces
 * responsabilités appartiennent au middleware de contexte exécuté en amont.
 * L'absence de permissions fiables doit conduire à un refus d'accès.
 *
 * @param {string} requiredPermission Permission atomique requise.
 * @returns {import('express').RequestHandler} Middleware Express fail-closed.
 */
```

```jsx
/**
 * Affiche un panneau partagé de détails sans prendre en charge le contenu métier.
 *
 * Le composant conserve le contenu monté pendant l'animation de fermeture et
 * restaure le focus vers l'élément déclencheur pour préserver l'accessibilité.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {() => void} props.onClose
 * @param {boolean} props.open
 * @param {string} props.title
 */
```

### 6.2 Quand ne pas utiliser JSDoc

Exemple à éviter :

```js
/**
 * Ferme la boîte de dialogue.
 */
function closeDialog() {
    setOpen(false);
}
```

Le commentaire n'apporte aucune information supplémentaire.

### 6.3 JavaScript reste l'autorité

Le projet reste JavaScript uniquement.

Les types JSDoc servent à clarifier les contrats utiles à la maintenance ; ils ne doivent pas créer une seconde représentation complexe du domaine qui devrait être maintenue parallèlement aux schemas Zod, models Mongoose ou payloads réels.

Les schemas Zod et Mongoose restent les autorités respectives de validation et de persistance dans leur périmètre.

---

## 7. ESLint et validation JSDoc

ESLint doit être installé localement et versionné dans les dépendances de développement des projets concernés afin que le lint soit reproductible avec une installation propre.

`eslint-plugin-jsdoc` doit servir en priorité à vérifier la cohérence des blocs JSDoc existants.

La politique initiale ne doit pas activer globalement une règle équivalente à `require-jsdoc` sur toutes les fonctions. Une telle règle provoquerait des commentaires artificiels sur les petites fonctions privées, handlers locaux et callbacks.

Les règles JSDoc doivent prioritairement détecter :

- noms de paramètres incohérents ;
- tags inconnus ou invalides ;
- types JSDoc invalides ;
- propriétés incohérentes lorsque documentées.

La question « ce fichier mérite-t-il une documentation ? » reste une décision de conception et de revue. ESLint valide la cohérence technique de la documentation ; il ne remplace pas la revue documentaire.

---

## 8. Formatage

Prettier et ESLint ont des responsabilités différentes :

- Prettier traite le formatage ;
- ESLint traite les problèmes statiques et les règles de qualité ;
- la revue documentaire évalue la valeur de la documentation.

L'introduction ou la normalisation de l'outillage ne justifie pas un reformatage massif hors périmètre. Toute opération `prettier --write` globale doit faire l'objet d'un lot explicitement décidé si elle produit un diff important.

---

## 9. Réutilisabilité frontend

La réutilisabilité des composants est une exigence indépendante et obligatoire.

La documentation source ne modifie pas les règles suivantes :

- `components/ui` contient les briques UI de base ;
- `components/shared` contient les composants transverses réutilisables ;
- `components/forms` contient les composants génériques de formulaire ;
- `features/<feature>/components` contient les composants spécifiques au domaine ;
- `DataTable` partagé doit rester l'autorité pour les tableaux génériques du Core ;
- drawers, confirmations, formulaires et autres primitives récurrentes doivent réutiliser les composants communs existants lorsqu'ils répondent au besoin ;
- aucun composant dupliqué ne doit être créé sans justification architecturale explicite.

Documenter un composant dupliqué ne résout pas une dette de réutilisabilité.

---

## 10. Documentation et sécurité

Les zones de sécurité doivent documenter les frontières de confiance lorsque celles-ci ne sont pas évidentes.

Sont notamment concernés :

- authentification ;
- refresh et rotation de session ;
- permissions ;
- contexte workspace ;
- isolation multi-tenant ;
- validation de payload ;
- upload et détection de type réel ;
- quotas ;
- entitlements ;
- permissions Platform ;
- retention/purge ;
- claims et leases ;
- migrations de sécurité.

La documentation doit identifier l'autorité réelle. Une vérification frontend n'est jamais présentée comme une barrière de sécurité lorsque le backend doit imposer la règle.

---

## 11. Documentation et effets de bord

Un effet de bord doit être documenté lorsqu'un appel apparemment simple peut :

- écrire plusieurs documents ;
- publier un audit ;
- modifier un quota ;
- envoyer un email ;
- supprimer physiquement une ressource ;
- modifier une session ;
- déclencher une invalidation de cache significative ;
- modifier un état contractuel ;
- acquérir un lock ou lease ;
- dépendre d'une transaction.

Le commentaire doit expliquer l'effet ou la garantie, pas détailler instruction par instruction son implémentation.

---

## 12. Documentation et invariants

Un invariant est une règle qui doit rester vraie indépendamment du chemin d'exécution.

Exemples de formulations utiles :

- une Subscription commerciale ne remplace la baseline que tant qu'elle est effectivement utilisable ;
- une permission est évaluée à partir du contexte workspace fiabilisé, jamais à partir d'un rôle interprété localement ;
- une ressource soft-deleted peut continuer à compter dans un quota tant qu'elle occupe physiquement du stockage ;
- un retry d'une requête après refresh ne doit pas déclencher une nouvelle boucle de refresh ;
- un adapter de rétention ne reçoit jamais un filtre MongoDB arbitraire venant du frontend.

Ces invariants doivent être documentés au plus près du code qui les impose lorsqu'ils ne sont pas déjà évidents.

---

## 13. Definition of Done documentaire

Après clôture de `DOC-CODE-1`, toute nouvelle fonctionnalité ou modification fonctionnelle doit satisfaire :

```text
Architecture         ✅
Sécurité             ✅
Validation stricte   ✅
Réutilisabilité      ✅
Documentation source ✅
Tests                ✅
Build                ✅
```

La documentation source est considérée satisfaite lorsque :

- les fichiers importants du lot expliquent leur responsabilité lorsque nécessaire ;
- les contrats publics non triviaux sont documentés ;
- les invariants ou effets de bord sensibles sont explicites ;
- les choix non évidents sont justifiés ;
- aucun commentaire de faible valeur n'a été ajouté pour remplir une obligation artificielle ;
- les JSDoc présents passent les règles de cohérence configurées ;
- la documentation a été relue avec le code qu'elle décrit.

---

## 14. Checklist de revue documentaire

Pour chaque fichier de production important modifié, vérifier :

1. La responsabilité du fichier est-elle compréhensible par un développeur extérieur au lot ?
2. Existe-t-il un contrat public ou réutilisable qui mérite un JSDoc ?
3. Un invariant métier, sécurité ou multi-tenant pourrait-il être cassé faute d'explication ?
4. Existe-t-il un effet de bord non évident ?
5. Un choix technique surprenant mérite-t-il d'expliquer le pourquoi ?
6. Le commentaire décrit-il une autorité réelle du backend ou seulement une convention frontend ?
7. Le JSDoc apporte-t-il de la valeur ou répète-t-il simplement la signature ?
8. La documentation reste-t-elle vraie après la modification ?
9. Un commentaire peut-il être supprimé parce qu'un meilleur nom rend le code suffisamment explicite ?
10. La réutilisabilité des composants reste-t-elle respectée indépendamment de la documentation ?

---

## 15. Rattrapage DOC-CODE-1

Le rattrapage de la dette documentaire est réalisé progressivement :

```text
DOC-CODE-1.1  Politique documentaire + outillage ESLint/JSDoc
DOC-CODE-1.2  Documentation backend de production
DOC-CODE-1.3  Documentation frontend de production
DOC-CODE-1.4  Documentation légère des tests critiques
DOC-CODE-1.5  Validation finale
```

Gate finale obligatoire :

```text
lint backend/frontend        vert
tests backend globaux        verts
tests frontend globaux       verts
build Vite                    vert
revue documentaire manuelle  validée
```

D-020 ne commence qu'après clôture de cette gate.

---

## 16. Exemples existants à conserver comme références

Le dépôt possède déjà des exemples conformes à cette politique.

### Backend

- `backend/middlewares/authorizePermission.js` : explique la précondition, la frontière RBAC et le comportement fail-closed ;
- `backend/modules/subscriptions/subscription.model.js` : explique des invariants Mongoose, snapshots et responsabilités entre domaines ;
- `backend/modules/subscriptions/subscription.service.js` : certaines fonctions expliquent déjà l'autorité du rôle système `baseline` plutôt que du nom commercial.

### Frontend

- `frontend/src/components/shared/entity-details-drawer.jsx` : documente le contrat du composant partagé, le focus et le maintien du contenu pendant la transition ;
- `frontend/src/services/api/base-query.js` : le commentaire du retry après refresh explique utilement pourquoi la base query brute est réutilisée afin d'éviter une boucle de réauthentification.

Ces exemples servent de direction qualitative. Ils ne doivent pas être copiés mécaniquement dans des fichiers dont les besoins sont différents.
