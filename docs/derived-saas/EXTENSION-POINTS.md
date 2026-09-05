# SAAS-CORE-API — Points d’extension des SaaS dérivés

**Statut :** canonique — actif  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** CORE-FIN-5 / D-014 — RBAC, capabilities, routing backend/frontend et navigation métier

---

## 1. Objectif

Un SaaS dérivé doit pouvoir ajouter un module métier sans modifier les longues listes centrales du Core.

Le contrat d’extension V1 reste volontairement explicite :

```text
module métier
→ fournit ses descriptors
→ l’application dérivée les compose dans les points prévus
→ le Core reste générique
```

Il n’existe pas de découverte automatique de modules, de système de plugins dynamique ou de chargement depuis `.env`.

Cette simplicité est intentionnelle : la composition reste lisible, déterministe, testable et compatible avec les futures mises à niveau du Core.

---

## 2. Frontière entre capability et permission

Ces deux notions ne sont jamais interchangeables.

```text
capability
→ la fonctionnalité existe-t-elle dans le logiciel et est-elle disponible commercialement ?

permission RBAC
→ ce membre du Workspace peut-il exécuter cette action ?
```

Exemple :

```text
price_history
→ capability commerciale

product:price:read
→ permission RBAC Workspace
```

Une route métier protégée peut donc devoir vérifier les deux couches : entitlement effectif puis permission utilisateur.

---

## 3. Point d’extension des capabilities

Fichier applicatif :

```text
backend/config/applicationCapability.registry.js
```

Collection de composition :

```text
APPLICATION_PLAN_CAPABILITY_MODULES
```

Un module métier peut déclarer :

```text
features
metrics
featureDefinitions
metricDefinitions
metricPresentations
featureMetrics
```

`featureMetrics` associe explicitement une feature aux métriques qui configurent son usage dans les surfaces data-driven.

Exemple conceptuel :

```js
{
    features: ['price_history'],
    metrics: ['price_history_entries_monthly'],
    featureDefinitions: {
        price_history: {
            label: 'Historique des prix',
            category: 'products',
            categoryLabel: 'Produits',
        },
    },
    metricDefinitions: {
        price_history_entries_monthly: {
            periodType: 'calendar_month',
            behavior: 'consumption',
            remediationRequired: false,
        },
    },
    metricPresentations: {
        price_history_entries_monthly: {
            label: 'Consultations mensuelles',
            category: 'products',
            categoryLabel: 'Produits',
            unit: 'count',
        },
    },
    featureMetrics: {
        price_history: ['price_history_entries_monthly'],
    },
}
```

La relation feature → métriques sert à la composition et à la présentation. Elle n’accorde aucun entitlement et ne remplace jamais les contrôles de quota.

L’endpoint Platform des capabilities expose les `metricKeys` associés à chaque définition de feature afin que l’interface n’ait pas à reconstruire cette relation avec des conditions React codées en dur.

---

## 4. Point d’extension RBAC Workspace

Fichier applicatif :

```text
backend/config/applicationRolePermission.registry.js
```

Collection de composition :

```text
APPLICATION_ROLE_PERMISSION_MODULES
```

Un descriptor RBAC métier peut déclarer :

```text
permissions
reservedPermissions
systemRolePermissions
```

Exemple conceptuel :

```js
{
    permissions: [
        'catalog:item:read',
        'catalog:item:update',
    ],
    systemRolePermissions: {
        owner: [
            'catalog:item:read',
            'catalog:item:update',
        ],
        admin: [
            'catalog:item:read',
            'catalog:item:update',
        ],
        member: [
            'catalog:item:read',
        ],
    },
}
```

Le Core conserve `CORE_PERMISSION` pour ses propres droits.

L’application dérivée ne modifie pas `permissions.constants.js` pour ajouter ses permissions métier.

`createSystemRoleDefinitions()` reçoit les extensions déclarées par le registre actif et enrichit les rôles système lors de leur création.

Les rôles personnalisés persistés dans un Workspace restent un sujet distinct : ils ne sont pas définis dans ce descriptor applicatif.

---

## 5. Point d’extension des routes backend

Fichier applicatif :

```text
backend/config/applicationRoutes.registry.js
```

Collection de composition :

```text
APPLICATION_BACKEND_ROUTE_MODULES
```

Descriptor :

```js
{
    key: 'catalog',
    mountPath: '/api/workspaces/:workspaceId/catalog',
    router: catalogRouter,
}
```

`backend/app.js` monte automatiquement cette collection avant le router Workspace générique.

Un module métier ordinaire ne doit donc plus ajouter directement son import et son `app.use()` dans `backend/app.js`.

Le descriptor ne remplace aucune protection de sécurité. Le router métier conserve la responsabilité d’ordonner explicitement :

```text
authenticate
→ validation des paramètres
→ contexte Workspace
→ entitlement si nécessaire
→ permission RBAC
→ validation Zod
→ controller
```

Les collisions de clé de module ou de chemin de montage sont refusées au démarrage.

---

## 6. Point d’extension des routes frontend

Fichier applicatif :

```text
frontend/src/app/application-routes.js
```

Collection de composition :

```text
APPLICATION_FRONTEND_ROUTE_MODULES
```

Quatre surfaces sont prévues :

```text
publicRoutes
authenticatedRoutes
workspaceRoutes
platformRoutes
```

Exemple conceptuel pour une route Workspace lazy :

```js
{
    workspaceRoutes: [
        {
            path: 'catalog',
            lazy: async () => {
                const { CatalogRoute } = await import(
                    '@/features/catalog/components/catalog-route'
                );
                return { Component: CatalogRoute };
            },
        },
    ],
}
```

`createAppRoutes()` compose ensuite ces routes avec les arbres Core existants.

Le module métier ne modifie pas la longue liste de `frontend/src/app/router.jsx` uniquement pour ajouter une route ordinaire.

Les guards Core restent les frontières de surface :

```text
authenticatedRoutes
→ sous AuthGuard

workspaceRoutes
→ sous WorkspaceGuard + WorkspaceLayout

platformRoutes
→ sous PlatformGuard + PlatformLayout
```

Une route métier peut ajouter un guard ou un composant de contrôle supplémentaire lorsqu’une capability ou permission spécifique est requise.

---

## 7. Point d’extension de la navigation Workspace

Fichier applicatif :

```text
frontend/src/app/workspace-navigation.js
```

Le Core fournit :

```text
coreWorkspaceNavigation
```

L’application dérivée compose les groupes de navigation de ses modules dans `workspaceNavigation`.

Le composant Sidebar reste générique et ne doit pas importer directement un module métier.

Les entrées sont filtrées selon les permissions et capabilities effectives lorsque le domaine le nécessite.

---

## 8. Règle de composition d’un module métier

Un module métier complet peut donc fournir conceptuellement :

```text
backend/modules/catalog/
→ routes / controller / service / model / validation
→ catalog.permissions.js ou descriptor RBAC
→ catalog.capabilities.js

frontend/src/features/catalog/
→ api RTK Query
→ composants / pages
→ catalog.routes.js
→ catalog.navigation.js
```

Puis l’application dérivée compose uniquement les descriptors dans :

```text
backend/config/applicationCapability.registry.js
backend/config/applicationRolePermission.registry.js
backend/config/applicationRoutes.registry.js
frontend/src/app/application-routes.js
frontend/src/app/workspace-navigation.js
```

Ces fichiers `app/` et `config/` sont les points de jonction assumés entre le Core et le produit dérivé.

---

## 9. Ce que D-014 ne met pas en place

D-014 n’introduit pas :

```text
plugins npm dynamiques
autodécouverte du filesystem
modules activables depuis .env
chargement de code depuis la base de données
création de permissions techniques depuis Platform
création de capabilities techniques depuis Platform
second router ou second design system
```

Ces mécanismes augmenteraient la complexité sans besoin démontré pour le Core V1.

---

## 10. Tests obligatoires d’un module dérivé

Un module métier qui utilise ces points d’extension doit au minimum tester :

```text
RBAC
→ permissions enregistrées
→ enrichissement des rôles système attendu
→ refus des permissions inconnues

capabilities
→ descriptor composé
→ feature/métriques présentes
→ relation feature → métriques valide
→ entitlement réellement contrôlé

backend routing
→ router monté sur le chemin attendu
→ authentification / Workspace / permission / validation réellement appliqués

frontend routing
→ route injectée dans la bonne surface
→ guard attendu conservé

navigation
→ entrée présente seulement lorsque l’utilisateur peut réellement l’utiliser
```

Les suites de tests du Core et du module métier restent complémentaires.

---

## 11. Critère de clôture de D-014

D-014 est techniquement prêt à être clôturé lorsque les tests démontrent qu’un module métier de référence peut :

- enregistrer ses permissions ;
- enrichir les rôles système selon une configuration explicite ;
- déclarer ses capabilities et métriques ;
- associer explicitement les métriques à leurs features lorsque nécessaire ;
- monter ses routes backend ;
- ajouter ses routes frontend ;
- composer sa navigation Workspace ;
- exécuter ses tests ;

sans modifier les longues listes centrales de routing ou de permissions du Core, hors points de composition applicatifs explicitement prévus.

La validation finale de D-014 nécessite une suite de tests locale verte. La dette ne doit pas être marquée `VALIDÉ` sur la seule base de la présence du code.

---

## 12. Fichiers de référence

```text
backend/config/applicationCapability.registry.js
backend/config/applicationRolePermission.registry.js
backend/config/applicationRoutes.registry.js
backend/modules/plan/planCapability.registry.js
backend/modules/role/rolePermission.registry.js
backend/constants/role.constants.js
frontend/src/app/application-routes.js
frontend/src/app/router.jsx
frontend/src/app/workspace-navigation.js
docs/contracts/CAPABILITIES.md
docs/derived-saas/DERIVED-SAAS.md
```

Toute modification de ces points de composition doit vérifier si le présent contrat doit être mis à jour.
