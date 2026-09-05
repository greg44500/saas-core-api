# SAAS-CORE-API — Architecture backend

**Statut :** document canonique d’architecture backend  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** API Node.js / Express / MongoDB / Mongoose

## 1. Objet

Ce document définit les responsabilités structurelles du backend `saas-core-api`.

Le backend doit rester modulaire, sécurisé et extensible sans transformer les routes ou controllers en zones de logique métier diffuse.

Principe directeur :

```text
HTTP
→ validation / contexte / autorisation
→ controller
→ service métier
→ modèle / services techniques / transaction
→ réponse explicite
```

La sécurité détaillée sera centralisée dans `docs/security/SECURITY.md`. Le présent document décrit avant tout **où doit vivre chaque responsabilité**.

---

## 2. Stack actuelle

Le `package.json` courant constitue l’autorité sur les versions installées.

```text
Node.js >=24.7 <25
JavaScript ESM uniquement
Express 5
MongoDB
Mongoose 9
Zod 4
JWT
Multer
Nodemailer
Helmet
CORS
compression
express-rate-limit
Vitest
Supertest
```

Le backend ne doit pas introduire TypeScript.

---

## 3. Arborescence backend

Structure actuelle :

```text
backend/
├── app.js
├── server.js
├── config/
├── constants/
├── jobs/
├── middlewares/
├── migrations/
├── modules/
├── operations/
├── routes/
├── seeds/
├── services/
├── tests/
└── utils/
```

Cette structure est volontaire : les domaines métier Core sont placés dans `modules/`, alors que les préoccupations techniques partagées restent séparées.

---

## 4. `server.js`

`server.js` orchestre le démarrage du processus.

Responsabilités :

```text
charger la configuration validée
connecter les dépendances indispensables
exécuter les maintenances nécessaires au démarrage
ouvrir le port HTTP
arrêter le processus si une dépendance critique empêche le démarrage
```

Le serveur ne contient pas de logique métier applicative.

Dans l’état actuel, MongoDB est une dépendance indispensable au démarrage. La maintenance des fichiers temporaires est exécutée avant l’ouverture du serveur, mais son orchestration reste distincte du domaine HTTP.

---

## 5. `app.js`

`app.js` construit l’application Express.

Il est responsable de l’ordre des middlewares globaux et du montage des routeurs.

Le flux actuel comprend notamment :

```text
Helmet
CORS
cookie parser
compression
request context
logging de développement
rate limiting /api
JSON parser
routers métier
health route
404
error handler
```

Le montage des routes doit conserver des frontières explicites, notamment pour les ressources tenant-scoped :

```text
/api/workspaces/:workspaceId/files
/api/workspaces/:workspaceId/subscription
/api/workspaces/:workspaceId/invitations
```

Un nouveau domaine Core doit être monté de façon lisible et ne pas dépendre de side effects implicites.

---

## 6. `config/`

`backend/config/` contient la configuration technique et les points de composition globaux.

Exemples actuels :

```text
environnement
MongoDB
cookies
CORS
Helmet
rate limiting
Multer
SMTP
stockage
Application Capability Registry
```

Règles :

- aucune règle métier propre à un produit dérivé dans `config/` ;
- les secrets et paramètres de déploiement proviennent de l’environnement ;
- les données commerciales ordinaires ne doivent pas être transformées en variables `.env` ;
- la configuration doit être validée avant utilisation ;
- un point de composition global peut assembler des extensions explicites, comme le Capability Registry.

---

## 7. `constants/`

`backend/constants/` contient les constantes transverses stables :

```text
permissions Core
permissions Platform
rôles Platform
statuts
clés d’audit
constantes Subscription
constantes File
constantes Workspace
```

Une constante ne doit pas servir à coder en dur une politique commerciale dérivée.

Exemple interdit :

```text
si plan.key = premium
→ autoriser une feature
```

Les droits commerciaux passent par les capabilities et l’entitlement effectif.

---

## 8. `modules/`

`backend/modules/` constitue le cœur de l’architecture métier du backend.

Les domaines actuels comprennent notamment :

```text
auth
authIdentities
authSessions
users
workspace
workspaceMember
workspaceInvitation
role
plan
subscriptions
trialEligibility
usageMetric
entitlementOverride
file
auditLog
platform
```

Une application dérivée ajoute ses domaines métier sous la même logique :

```text
backend/modules/<domaine-metier>/
```

Le Core ne doit pas importer ces domaines tant qu’ils restent spécifiques au produit dérivé.

---

## 9. Structure d’un module

Tous les modules n’ont pas exactement le même nombre de fichiers, mais les responsabilités doivent rester explicites.

Structure de référence :

```text
<module>/
├── <module>.routes.js
├── <module>.controller.js
├── <module>.service.js
├── <module>.model.js
├── <module>.validation.js
└── services/                 # si le domaine devient suffisamment riche
```

Des helpers, serializers ou sous-services peuvent être ajoutés lorsqu’ils clarifient réellement le domaine.

La multiplication de couches artificielles est à éviter.

---

## 10. Routes

Les routes décrivent le contrat HTTP et assemblent les barrières nécessaires.

Responsabilités :

```text
verbe HTTP
chemin
ordre des middlewares
validation body/params/query
authentification
autorisation
chargement du contexte tenant
contrôle entitlement/quota lorsque nécessaire
controller final
```

Une route ne doit pas :

```text
faire une requête Mongoose métier complexe
calculer un entitlement
modifier plusieurs modèles
construire une transaction métier
porter une règle commerciale
```

L’ordre des middlewares peut être une règle de sécurité et ne doit pas être modifié sans analyse.

---

## 11. Validation

Les entrées HTTP doivent être validées avant le controller.

Le middleware `validateRequest()` place les données validées dans :

```text
req.validated.body
req.validated.params
req.validated.query
```

Les couches suivantes doivent privilégier ces données plutôt que relire des entrées brutes non validées.

Les schemas Zod doivent être stricts lorsqu’un payload ne doit pas accepter de propriétés inconnues.

La validation protège le contrat d’entrée ; elle ne remplace ni l’autorisation, ni les contraintes Mongoose, ni les invariants métier.

---

## 12. Controllers

Un controller est l’adaptateur entre HTTP et le domaine.

Responsabilités attendues :

```text
lire req.validated / contexte déjà chargé
appeler le service approprié
sérialiser ou utiliser un serializer explicite
choisir le statut HTTP
renvoyer la forme publique du DTO
```

Le controller ne doit pas devenir le lieu principal des règles métier.

Lorsqu’une opération nécessite validation d’état, concurrence, audit ou transaction, cette logique appartient au service.

---

## 13. Services métier

Les services portent les règles métier du domaine.

Ils peuvent notamment :

```text
charger les ressources nécessaires
valider les invariants métier
coordonner plusieurs modèles
ouvrir ou consommer une session MongoDB
appliquer les règles d’idempotence
résoudre les états temporels
orchestrer l’audit transactionnel
appeler un service technique partagé
```

Un service doit garder une responsabilité cohérente.

Lorsqu’un domaine devient complexe, il est préférable de créer plusieurs services nommés par use case plutôt qu’un fichier `service.js` gigantesque.

Le module `subscriptions/services/` illustre déjà cette approche avec des services dédiés aux trials, downgrades, expirations et lifecycle.

---

## 14. Models Mongoose

Les models définissent :

```text
structure persistée
required / enum / immutable
validation de forme au niveau persistence
indexes
unique constraints
timestamps
relations ObjectId
```

Les modèles constituent une défense supplémentaire, mais ne doivent pas absorber toute la logique métier.

Une validation qui dépend du contexte utilisateur, du Workspace ou d’un autre agrégat appartient généralement au service.

Les indexes font partie de l’architecture fonctionnelle : ils protègent la cohérence et la performance et doivent être accompagnés de migrations lorsque leur introduction affecte des données déjà existantes.

---

## 15. Services techniques transverses

`backend/services/` est réservé aux services techniques partagés par plusieurs domaines.

Exemples actuels :

```text
email
email templates
file inspection
malware scan
storage
```

Règle :

```text
service métier d’un domaine
→ backend/modules/<domaine>/...

service technique réellement transverse
→ backend/services/...
```

Ne pas utiliser `backend/services/` comme dossier générique où déplacer toute logique difficile à classer.

---

## 16. Middlewares

Les middlewares expriment les contrôles HTTP transverses.

Exemples :

```text
authenticate
authorizePermission
authorizePlatformPermission / role
loadWorkspaceContext
enforceWorkspaceAccessMode
enforcePlanFeature
validateRequest
upload middleware
error handling
```

Les barrières doivent être composables et réutilisables.

Une nouvelle feature métier dérivée peut consommer les middlewares Core, mais ne doit pas modifier leur sémantique pour satisfaire uniquement son cas particulier.

---

## 17. Frontière Workspace

Pour une ressource tenant-scoped, le flux attendu est généralement :

```text
authenticate
→ valider workspaceId
→ loadWorkspaceContext
→ autorisation RBAC
→ entitlement / access mode si nécessaire
→ controller
→ service
```

L’ordre exact dépend de l’opération et doit respecter les contrats existants.

Le service doit également éviter les accès cross-tenant en utilisant le `workspaceId` dans ses filtres lorsque la ressource appartient à un Workspace.

Un ObjectId seul n’est pas une frontière de sécurité.

---

## 18. RBAC et entitlement

Les deux contrôles restent distincts :

```text
RBAC
→ cet utilisateur est-il autorisé à exécuter l’action ?

Entitlement
→ le Workspace possède-t-il commercialement la capability ?
```

Une action peut nécessiter les deux.

Le backend est l’autorité pour ces deux décisions.

Le code métier ne doit pas remplacer l’entitlement par une comparaison de nom de Plan.

---

## 19. UsageMetric et quotas

Les quotas doivent être appliqués côté backend.

Une métrique déclarée dans le Capability Registry peut être :

```text
mesurée
réservée
comparée à la limite effective
réconciliée
```

Lorsque la concurrence peut provoquer un dépassement, une vérification naïve `read → compare → write` est insuffisante.

Les stratégies atomiques et transactionnelles seront détaillées dans le document de sécurité.

---

## 20. AuditLog

L’audit est un mécanisme backend.

Le frontend ne crée jamais lui-même un événement AuditLog de sécurité ou de gouvernance.

Pour les mutations sensibles, l’audit doit être écrit dans le même périmètre transactionnel lorsque l’invariant l’exige.

L’échec d’un audit obligatoire ne doit pas laisser silencieusement la mutation sensible validée.

Le détail est traité dans `SECURITY.md`.

---

## 21. Jobs

`backend/jobs/` contient les tâches asynchrones ou planifiées explicites.

Exemples actuels :

```text
expiration des trials
finalisation de cancellations
application de downgrades programmés
purge de fichiers supprimés
```

Un job ne doit pas être nécessaire pour rendre vrai un droit temporel qui doit être interprété correctement au moment de la requête.

Exemple : une échéance commerciale dépassée ne doit pas continuer à accorder un droit uniquement parce qu’un cron n’a pas encore tourné.

Le job synchronise la persistance ; la logique runtime doit rester correcte indépendamment d’un retard raisonnable du job.

---

## 22. Migrations

`backend/migrations/` porte les évolutions nécessaires lorsqu’un nouveau contrat de données ou index doit être appliqué à une base existante.

Règles :

- migration explicite ;
- idempotence lorsque possible ;
- validation avant/après ;
- absence de modification silencieuse au démarrage ;
- script nommé dans `package.json` lorsque l’opération doit être lancée volontairement ;
- tests pour les migrations critiques.

Les migrations feront l’objet d’un guide opérationnel détaillé dans `docs/operations/OPERATIONS.md`.

---

## 23. Seeds

Les seeds initialisent les données nécessaires au Core.

Exemples actuels :

```text
Plans initiaux
SUPER_ADMIN initial
```

Un seed doit être distingué d’une migration.

Un seed ne doit pas réécrire silencieusement une configuration administrée en production.

Les valeurs commerciales seedées sont des données initiales, pas des constantes métier universelles du Core.

---

## 24. Operations

`backend/operations/` contient des opérations explicitement déclenchées hors du trafic HTTP normal.

Exemple actuel : reset de trial réservé au développement.

Une opération de développement dangereuse ou destructrice doit être protégée par des garde-fous d’environnement explicites.

Elle ne doit pas être transformée en endpoint public uniquement pour faciliter un test local.

---

## 25. Erreurs

Les erreurs opérationnelles peuvent être exposées avec un message contrôlé.

Les erreurs inattendues doivent produire une réponse générique en production.

Le logger global ne doit pas sérialiser aveuglément un objet Error provenant d’une dépendance, car celui-ci peut contenir des informations techniques ou sensibles.

Le frontend doit s’appuyer sur le statut HTTP et le contrat de l’endpoint plutôt que parser les textes d’erreur comme machine d’état métier.

---

## 26. Tests backend

Les tests backend sont regroupés sous :

```text
backend/tests/
```

Stack :

```text
Vitest
Supertest
```

Stratégie :

```text
unitaires
→ helpers, serializers, fonctions pures, règles isolées

services
→ invariants métier, concurrence, transactions, lifecycle

routes/controllers
→ validation, auth, permissions, statut HTTP, DTO

intégration
→ interactions MongoDB et workflows critiques
```

Les tests de sécurité et d’invariants métier critiques sont prioritaires sur des tests décoratifs de couverture.

---

## 27. Ajout d’un module métier dérivé

Un futur module doit suivre le même découpage :

```text
1. définir règles métier et tenant
2. définir permissions
3. définir capabilities / métriques
4. définir modèle et indexes
5. définir validation HTTP stricte
6. définir services métier
7. définir controllers
8. définir routes et middlewares
9. brancher audit / soft delete / quotas si nécessaires
10. ajouter tests
```

Le module métier peut consommer les services Core exposés, mais le Core ne doit pas importer le module métier.

---

## 28. Anti-patterns interdits

```text
logique métier lourde dans une route
controller monolithique
accès cross-tenant par ObjectId seul
validation uniquement frontend
quota uniquement frontend
plan.key utilisé comme permission
mutation sensible sans audit quand audit requis
check-then-write fragile pour un invariant concurrent
secrets dans le code
modification de données de production au démarrage sans migration explicite
service transverse servant de fourre-tout
```

---

## 29. Critère de qualité d’un module

Un module backend est cohérent lorsqu’un développeur peut répondre rapidement à ces questions :

```text
Où est le contrat HTTP ?
Où est la validation ?
Où est l’autorisation ?
Où est la règle métier ?
Où est la persistance ?
Quelle est la frontière tenant ?
Quelle capability commerciale est requise ?
Quelle permission est requise ?
Quelle action est auditée ?
Quels tests protègent les invariants ?
```

Si plusieurs réponses sont « dans le controller » ou « un peu partout », le module doit être revu.

---

## 30. Documents liés

```text
docs/architecture/ARCHITECTURE.md
docs/architecture/FRONTEND.md
docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md
docs/security/SECURITY.md
docs/operations/OPERATIONS.md
```
