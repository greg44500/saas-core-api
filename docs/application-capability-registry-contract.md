# SAAS-CORE-API — Contrat du registre applicatif de capabilities

**Date de consolidation :** 2026-09-03  
**Statut :** ACTIF — socle générique validé avant F10.2  
**Périmètre :** Core clonable, Plans, quotas, Platform Admin et EntitlementOverride

## 1. Objectif

`saas-core-api` est un socle SaaS générique destiné à être cloné avant l'ajout de modules métier.

Le Core fournit le moteur de capabilities, de Plans, de quotas, d'entitlements et d'administration Platform. Une application dérivée fournit les capabilities réellement implémentées par ses modules métier.

Le Core ne doit jamais connaître à l'avance des fonctionnalités métier telles que `price_history`, `supplier_management` ou `ai_analysis`.

## 2. Source de vérité unique

Le registre actif de l'application est :

```text
backend/config/applicationCapability.registry.js
```

Il expose :

```text
ACTIVE_PLAN_CAPABILITY_REGISTRY
```

Ce registre est la source de vérité runtime pour :

```text
Plans
Plan features
Plan limits
UsageMetric
compatibilité de Plan
administration Platform des Plans
EntitlementOverride
futur entitlement effectif F10.2+
```

Aucun de ces chemins runtime ne doit retomber implicitement sur un registre limité aux seules capabilities Core.

## 3. Composition après clonage

Le Core n'effectue aucune découverte magique de modules et ne scanne pas le filesystem.

Une application dérivée importe explicitement les descriptors des modules réellement installés puis les compose dans le registre actif.

Conceptuellement :

```text
Capabilities Core
        +
Module métier A
        +
Module métier B
        +
Module métier C
        ↓
ACTIVE_PLAN_CAPABILITY_REGISTRY
```

Cette composition explicite rend le démarrage déterministe, testable et maintenable.

## 4. Responsabilités du développeur et du SUPER_ADMIN

### Développeur

Le développeur :

- implémente la fonctionnalité métier ;
- déclare sa clé technique stable ;
- déclare ses métadonnées de présentation ;
- déclare les métriques et leur sémantique lorsque la fonctionnalité consomme une capacité ou un quota ;
- branche les contrôles d'entitlement dans le module métier.

### SUPER_ADMIN

Le `SUPER_ADMIN` :

- consulte les capabilities réellement déclarées par l'application ;
- choisit celles à inclure dans un Plan ;
- configure les limites des métriques disponibles ;
- ne crée jamais une capability technique depuis l'administration.

Il n'existe donc volontairement aucune opération Platform de type :

```text
feature:create
feature:update
feature:delete
```

Une capability existe parce que le logiciel sait réellement l'exécuter.

## 5. Features

Une feature possède une clé technique stable et peut fournir des métadonnées de présentation.

Exemple conceptuel :

```js
{
    key: 'price_history',
    label: 'Historique des prix',
    description: 'Consulter les évolutions de prix.',
    category: 'products',
    categoryLabel: 'Produits',
    displayOrder: 20,
    tags: ['reporting'],
}
```

La clé technique reste l'autorité utilisée par le backend.

Les métadonnées servent uniquement à construire une administration lisible et data-driven. Elles n'accordent aucun droit.

Une feature déclarée sans métadonnées explicites reçoit une présentation de fallback afin de conserver la généricité du Core.

## 6. Catégories

Les capabilities sont présentées par catégories fonctionnelles stables, par exemple :

```text
Fichiers
Collaboration
Gouvernance
Produits
Reporting
Intelligence artificielle
```

La catégorie structure l'interface. Les `tags` peuvent compléter cette organisation pour des usages secondaires, mais ne doivent pas devenir la source principale de sécurité ou de logique commerciale.

## 7. Métriques et limites

Une application métier peut déclarer ses propres métriques.

Chaque métrique utilisée par `UsageMetric` doit définir sa sémantique temporelle et, lorsque nécessaire, sa stratégie de compatibilité/remédiation.

Les conventions commerciales restent :

```text
null              = illimité
0                 = aucune consommation autorisée
entier positif    = plafond
```

Une métrique métier correctement enregistrée doit pouvoir être :

```text
proposée dans Platform
→ assignée à un Plan
→ mesurée par UsageMetric
→ contrôlée par le moteur de quotas
→ surchargée plus tard par EntitlementOverride
```

sans modifier les modèles génériques `Plan`, `Subscription` ou `UsageMetric`.

## 8. Validation et sécurité

Les données HTTP ne peuvent jamais enrichir le registre actif.

Les clés envoyées dans les payloads Plans ou EntitlementOverride sont validées contre le registre actif chargé par le serveur.

Une clé inconnue doit être refusée.

Les déclarations de modules sont également validées au moment de la composition du logiciel :

- clé technique invalide : erreur ;
- descriptor invalide : erreur ;
- catégorie invalide : erreur ;
- déclaration de module incohérente : erreur ;
- collision de définitions entre modules : erreur.

Le système doit échouer tôt plutôt que fonctionner avec un registre ambigu.

## 9. Administration Platform

`GET /api/platform/plans/capabilities` constitue le catalogue administratif en lecture seule.

Le contrat conserve les clés techniques existantes et ajoute les métadonnées nécessaires au frontend :

```text
features: string[]
featureDefinitions: CapabilityPresentation[]
metrics: [{ key, definition, presentation }]
```

Le frontend ne maintient aucune seconde liste de capabilities métier.

Le formulaire des Plans construit dynamiquement les sélections à partir de cette réponse et groupe les features par catégories.

L'ajout d'une capability métier correctement enregistrée ne doit donc pas nécessiter l'ajout manuel d'une checkbox dans `PlatformPlanForm`.

## 10. Permissions Platform

Les permissions Platform sont distinctes des permissions RBAC Workspace.

Le registre actuel prévoit notamment :

```text
platform:capabilities:read

platform:plans:read
platform:plans:create
platform:plans:update
platform:plans:archive

platform:subscriptions:read
platform:subscriptions:update

platform:entitlement_overrides:read
platform:entitlement_overrides:create
platform:entitlement_overrides:update
platform:entitlement_overrides:revoke

platform:users:read
platform:users:update

platform:workspaces:read
platform:workspaces:update

platform:audit_logs:read
```

Politique actuelle :

```text
super_admin → toutes les permissions Platform
admin       → aucune permission Platform par défaut
support     → aucune permission Platform par défaut
user        → aucune permission Platform par défaut
```

Cette architecture prépare de futurs rôles Platform plus fins sans élargir les accès actuels.

La lecture du catalogue de capabilities requiert `platform:capabilities:read`.

La création, modification et archivage des Plans utilisent les permissions propres au domaine Plan.

Modifier `Plan.features` ou `Plan.limits` constitue une configuration du Plan, et non une modification de la capability elle-même.

## 11. Séparation Capability / Plan / RBAC / Override

Les quatre notions restent strictement distinctes :

```text
Capability Registry
→ ce que l'application sait techniquement faire

Plan
→ ce que l'offre commerciale accorde normalement

RBAC Workspace
→ ce qu'un utilisateur a le droit d'exécuter dans un Workspace

EntitlementOverride
→ exception commerciale Workspace-scoped appliquée au Plan
```

Une feature peut donc exister dans l'application sans être incluse dans un Plan.

Une feature incluse dans un Plan ne contourne jamais le RBAC Workspace.

Un `EntitlementOverride` ne crée jamais une capability inconnue du registre.

## 12. `.env`

Aucune capability métier ne doit être déclarée dans `.env`.

```text
.env
→ secrets
→ URLs
→ paramètres d'infrastructure et de déploiement

Capability Registry
→ fonctionnalités réellement implémentées par le logiciel

Plan
→ configuration commerciale persistée
```

Des flags de déploiement spécifiques pourront exister ultérieurement pour des besoins explicitement cadrés, mais ils ne doivent pas remplacer le registre de capabilities ni le catalogue des Plans.

## 13. Contrat de clonage

Après clonage du Core, l'ajout d'un module métier doit pouvoir suivre ce flux :

```text
1. développer le module métier
2. déclarer ses features
3. déclarer ses métriques si nécessaire
4. déclarer leurs métadonnées
5. composer le descriptor dans applicationCapability.registry.js
6. démarrer l'application
7. ouvrir Platform > Plans
8. sélectionner les capabilities disponibles
9. configurer les limites
10. brancher les contrôles d'entitlement dans les opérations métier
```

L'ajout d'un module métier ne doit pas nécessiter de modifier :

```text
Plan.model
Subscription.model
UsageMetric.model
EntitlementOverride.model
PlatformPlanForm
moteur générique de quotas
moteur générique d'entitlement
```

Si une future feature exige de modifier ces mécanismes uniquement parce que sa clé est nouvelle, l'architecture est considérée comme insuffisamment générique.

## 14. Frontend

Le frontend Platform est data-driven.

Les capabilities reçues du backend sont regroupées avec les helpers partagés de la feature Platform. Les libellés et descriptions viennent prioritairement du registre backend, avec fallback de présentation pour compatibilité.

Le frontend ne décide jamais qu'une capability est valide : le backend reste l'autorité finale.

RTK Query reste utilisé pour les données serveur. Les choix temporaires du formulaire restent locaux au composant tant qu'ils n'ont pas besoin d'être partagés globalement.

## 15. Tests obligatoires pour une application dérivée

Lorsqu'une application ajoute un module de capabilities, elle doit au minimum tester :

- composition du descriptor métier ;
- présence des nouvelles features/métriques dans le registre actif ;
- rejet des clés invalides et collisions ;
- exposition Platform correcte ;
- création/modification d'un Plan avec les nouvelles capabilities ;
- rejet d'une capability sauvage envoyée par HTTP ;
- comportement des métriques dans UsageMetric/quotas ;
- intégration aux entitlements lorsque la capability est réellement consommée.

## 16. Validation du checkpoint

Le checkpoint de généricité précédant F10.2 a été validé le 2026-09-03 :

- tests ciblés backend verts ;
- tests frontend ciblés verts ;
- régression backend globale verte signalée ;
- régression frontend globale verte signalée ;
- build Vite vert signalé.

Le correctif frontend final concernait uniquement une requête React Testing Library trop stricte sur le nom accessible d'une checkbox ; aucun comportement fonctionnel n'a été modifié.

## 17. Suite

F10.2 doit composer l'entitlement effectif à partir du Plan et des `EntitlementOverride` actifs en utilisant `ACTIVE_PLAN_CAPABILITY_REGISTRY` comme registre runtime.

Aucune implémentation F10.2 ne doit réintroduire une dépendance implicite à `DEFAULT_PLAN_CAPABILITY_REGISTRY` dans un chemin runtime applicatif.
