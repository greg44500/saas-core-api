# SAAS-CORE-API — Contrat canonique des capabilities

**Statut :** canonique — actif  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** Capability Registry, features, métriques, Plans, quotas, entitlements, Platform et extension par les SaaS dérivés

---

## 1. Objet

Ce document définit la manière dont le Core connaît les fonctionnalités réellement disponibles dans l’application.

Principe directeur :

```text
une capability existe
→ parce que le logiciel sait réellement l’exécuter
```

et non :

```text
une capability existe
→ parce qu’un administrateur a saisi une clé dans Platform
```

Le Core fournit un registre générique et extensible. Les applications dérivées déclarent explicitement les capabilities de leurs modules métier après clonage.

---

## 2. Source de vérité runtime

Le registre applicatif actif est construit dans :

```text
backend/config/applicationCapability.registry.js
```

et exposé par :

```text
ACTIVE_PLAN_CAPABILITY_REGISTRY
```

Ce registre est l’autorité runtime pour :

```text
Plan.features
Plan.limits
validation des Plans
UsageMetric
quotas
EntitlementOverride
composition de l’entitlement effectif
administration Platform des Plans
```

Un chemin runtime applicatif ne doit pas retomber implicitement sur un registre limité aux seules capabilities Core lorsque l’application dérivée a enregistré des extensions.

---

## 3. Composition explicite

Le Core n’effectue aucune découverte automatique des modules sur le filesystem.

L’application dérivée importe explicitement les descriptors de ses modules et les compose dans :

```text
APPLICATION_PLAN_CAPABILITY_MODULES
```

Flux :

```text
Capabilities Core
        +
Module métier A
        +
Module métier B
        ↓
ACTIVE_PLAN_CAPABILITY_REGISTRY
```

Cette composition explicite est volontaire : elle rend le démarrage déterministe, testable et auditable.

---

## 4. Capabilities Core actuelles

Le Core fournit actuellement les features génériques suivantes :

```text
file_upload
team_management
audit_logs
```

Ces capabilities ont un sens Core transversal :

```text
file_upload
→ autorise de nouveaux téléversements lorsque les autres contrôles sont également satisfaits

team_management
→ autorise les surfaces commerciales de gestion des membres, invitations et rôles

audit_logs
→ autorise la consultation tenant des journaux d’activité
```

Important : la production des AuditLogs nécessaires à la sécurité n’est pas conditionnée par `audit_logs`. Seule leur consultation Workspace est une capability commerciale.

---

## 5. Métriques Core actuelles

Le Core fournit actuellement :

```text
members
storage_bytes
file_uploads_monthly
```

Sémantique actuelle :

```text
members
→ capacité courante
→ remédiation requise en cas de dépassement

storage_bytes
→ capacité courante
→ remédiation requise en cas de dépassement

file_uploads_monthly
→ consommation sur mois calendaire
→ ne place pas globalement le Workspace en remédiation
```

Une application dérivée peut ajouter ses propres métriques si leur sémantique est correctement déclarée.

---

## 6. Feature vs métrique

Une feature et une métrique ne sont pas interchangeables.

```text
feature
→ capacité fonctionnelle activée ou non

métrique
→ quantité mesurable et plafonnable
```

Exemple :

```text
file_upload
→ feature

storage_bytes
→ métrique

file_uploads_monthly
→ métrique
```

Le Core peut exiger simultanément une feature active et une marge de quota suffisante.

---

## 7. Clés techniques

Les clés de capability suivent un format stable :

```text
^[a-z][a-z0-9_]*$
```

Elles sont destinées aux contrôles backend et aux données persistées.

Une clé doit rester stable une fois utilisée par :

```text
Plan
UsageMetric
EntitlementOverride
code métier
```

Renommer une capability persistée n’est pas une simple modification de libellé : cela nécessite une migration de données et de code.

---

## 8. Métadonnées de présentation

Une capability peut définir des informations de présentation :

```text
label
description
category
categoryLabel
displayOrder
tags
unit pour une métrique
```

Ces métadonnées servent uniquement à :

- produire une interface Platform lisible ;
- regrouper les capabilities par catégories ;
- afficher des libellés humains ;
- rendre le formulaire des Plans data-driven.

Elles n’accordent aucun droit.

La clé technique reste l’autorité fonctionnelle.

---

## 9. Fallback de présentation

Une capability valide sans métadonnées riches peut recevoir une présentation de fallback.

Ce fallback existe pour la robustesse de l’interface et la généricité du Core.

Il ne doit pas être utilisé comme excuse pour omettre des métadonnées de qualité dans un module métier finalisé.

---

## 10. Catégories

Les catégories organisent l’interface, par exemple :

```text
files
workspace
governance
products
reporting
ai
```

Une catégorie :

- n’accorde aucun droit ;
- ne remplace pas une feature ;
- ne remplace pas le RBAC ;
- ne doit pas servir de règle commerciale implicite.

Les `tags` sont secondaires et ne doivent pas devenir une source de sécurité.

---

## 11. Descriptors des modules métier

Après clonage, un module métier peut déclarer :

```text
features[]
metrics[]
featureDefinitions
metricDefinitions
metricPresentations
```

Conceptuellement :

```js
{
    features: ['price_history'],
    featureDefinitions: {
        price_history: {
            label: 'Historique des prix',
            description: 'Consulter les évolutions de prix.',
            category: 'products',
            categoryLabel: 'Produits',
            displayOrder: 20,
        },
    },
}
```

Le Core lui-même ne doit pas ajouter `price_history` tant qu’il ne possède aucun module Core réel correspondant.

---

## 12. Détection des incohérences au démarrage

La composition doit échouer tôt lorsqu’elle rencontre une déclaration ambiguë ou invalide.

Exemples de refus :

```text
clé invalide
descriptor invalide
catégorie invalide
définition invalide
collision de feature
collision de définition de métrique
collision de présentation de métrique
```

Le système ne doit pas démarrer avec deux modules déclarant silencieusement deux significations différentes pour la même clé.

---

## 13. Validation des Plans

Un Plan peut référencer uniquement des features et métriques connues du registre actif.

Une clé inconnue envoyée par HTTP doit être refusée.

Lorsque le payload de limites configure explicitement `limits`, le Core vérifie également la cohérence avec les métriques attendues par le registre actif selon le service courant.

Le registre applicatif est donc une barrière entre :

```text
capabilities réellement implémentées
```

et :

```text
configuration commerciale persistée
```

---

## 14. Conventions de limites

Pour toutes les métriques compatibles avec le moteur générique :

```text
null
→ illimité

0
→ aucune consommation autorisée

entier positif
→ plafond
```

Cette convention doit rester cohérente entre :

```text
Plan.limits
EntitlementOverride.limitValue
moteur de quotas
DTO frontend
```

---

## 15. EntitlementOverride

Un `EntitlementOverride` ne crée jamais une nouvelle capability.

Il ne peut surcharger que :

```text
une feature connue
ou
une métrique connue
```

Le resolver de l’entitlement effectif valide également le Plan et les overrides contre le registre actif.

Si une ancienne donnée persistée référence une capability qui n’existe plus dans le logiciel courant, le système doit échouer explicitement plutôt que continuer à accorder un droit incohérent.

---

## 16. Composition de l’entitlement effectif

Le service de composition applique :

```text
Plan effectif
+
overrides actifs
=
features effectives + limites effectives
```

Sémantique :

```text
feature override = true
→ ajoute la feature

feature override = false
→ retire la feature

limit override
→ remplace exactement la limite catalogue
```

La composition est dérivée et ne modifie jamais le Plan partagé.

Les features et limites sont rendues dans un ordre stable afin d’éviter des variations inutiles dans les DTO internes, diagnostics et tests.

---

## 17. Administration Platform

Endpoint :

```text
GET /api/platform/plans/capabilities
```

Permission :

```text
platform:capabilities:read
```

La réponse fournit notamment :

```text
features: string[]
featureDefinitions: CapabilityPresentation[]
metrics: [
  {
    key,
    definition,
    presentation
  }
]
```

Le frontend Platform construit dynamiquement le formulaire des Plans à partir de cette réponse.

---

## 18. Responsabilité du développeur et du SUPER_ADMIN

### Développeur

Le développeur :

- implémente la fonctionnalité ;
- choisit une clé technique stable ;
- déclare les métadonnées de présentation ;
- déclare les métriques et leur comportement ;
- compose le descriptor dans le registre applicatif ;
- branche les contrôles d’entitlement dans les opérations métier ;
- ajoute les tests nécessaires.

### SUPER_ADMIN

Le SUPER_ADMIN :

- consulte les capabilities existantes ;
- sélectionne celles incluses dans un Plan ;
- configure les limites ;
- peut administrer des overrides sur des capabilities connues.

Le SUPER_ADMIN **ne crée pas une capability technique**.

Il n’existe volontairement pas de CRUD Platform de type :

```text
feature:create
feature:update
feature:delete
```

---

## 19. Frontend data-driven

Le frontend ne maintient pas une seconde liste métier indépendante.

Flux attendu :

```text
modules réellement installés
→ ACTIVE_PLAN_CAPABILITY_REGISTRY
→ API Platform capabilities
→ RTK Query
→ composants de présentation
```

Une nouvelle capability métier correctement enregistrée doit apparaître dans Platform sans ajout manuel d’une checkbox dédiée au cœur du formulaire.

Si le frontend exige une modification spécifique uniquement parce qu’une nouvelle clé a été ajoutée, il faut vérifier si l’interface est suffisamment data-driven.

---

## 20. `.env`

Les capabilities métier ne sont pas déclarées dans `.env`.

```text
.env
→ secrets, URLs, infrastructure, déploiement

Capability Registry
→ fonctionnalités réellement présentes dans le logiciel

Plan
→ droits commerciaux catalogue
```

Un flag d’infrastructure futur peut exister pour un besoin précis, mais il ne doit pas remplacer le registre de capabilities.

---

## 21. Extension d’un SaaS dérivé

Flux recommandé après clonage :

```text
1. développer le module métier
2. définir ses features
3. définir ses métriques si nécessaire
4. définir les métadonnées
5. créer son descriptor
6. l’importer dans applicationCapability.registry.js
7. lancer les tests de composition
8. démarrer l’application
9. vérifier Platform > Plans
10. configurer les Plans
11. brancher les contrôles d’entitlement
12. tester refus et autorisations
```

Le document `docs/derived-saas/DERIVED-SAAS.md` détaillera ce workflow lors du lot dédié.

---

## 22. Ce qu’une nouvelle capability ne doit pas obliger à modifier

L’ajout d’une capability métier ordinaire ne devrait pas imposer une modification de :

```text
Plan.model
Subscription.model
UsageMetric.model
EntitlementOverride.model
moteur générique d’entitlement
moteur générique de quotas
formulaire Platform par ajout manuel d’un champ codé en dur
```

Si une simple nouvelle clé oblige à modifier ces mécanismes, l’architecture doit être réévaluée.

Une modification peut cependant être légitime si la nouvelle fonctionnalité introduit **un nouveau type de comportement générique** que le moteur actuel ne sait pas représenter.

---

## 23. Permissions Platform vs RBAC Workspace

Les permissions Platform et les permissions Workspace appartiennent à deux registres distincts.

```text
Platform permissions
→ administration globale de la plateforme

Workspace RBAC
→ actions d’un membre dans un tenant

Capability Registry
→ existence technique d’une fonctionnalité

Plan / Override
→ disponibilité commerciale de cette fonctionnalité
```

Aucune de ces couches ne doit être utilisée pour simuler les autres.

---

## 24. Tests obligatoires pour un module dérivé

Lorsqu’un SaaS dérivé ajoute des capabilities, il doit au minimum tester :

- composition du descriptor ;
- présence des features/métriques dans le registre actif ;
- rejet des clés invalides ;
- rejet des collisions ;
- exposition correcte dans Platform ;
- création/modification de Plan avec les nouvelles capabilities ;
- rejet d’une capability inconnue envoyée par HTTP ;
- comportement des métriques dans UsageMetric/quotas ;
- comportement des overrides ;
- contrôle réel de la capability dans le service/route métier concerné.

---

## 25. Garde-fous

Ne jamais :

```text
créer une capability depuis un formulaire Platform
maintenir une liste métier concurrente dans le frontend
déclarer une capability dans .env
coder une autorisation à partir du nom d’un Plan
confondre capability et permission RBAC
confondre capability et catégorie UI
accepter une clé inconnue dans Plan ou EntitlementOverride
introduire une capability métier hypothétique dans le Core “pour plus tard”
```

Toujours :

```text
déclarer la capability avec le code qui l’implémente
composer explicitement les modules installés
valider contre ACTIVE_PLAN_CAPABILITY_REGISTRY
faire échouer tôt les collisions
rendre Platform data-driven
conserver des clés techniques stables
```

---

## 26. Document historique absorbé

Ce contrat consolide le contenu encore valide de :

```text
docs/application-capability-registry-contract.md
```

Il est également cohérent avec les règles commerciales consolidées dans `docs/contracts/COMMERCIAL.md`.

L’ancien document reste présent jusqu’à validation explicite de sa suppression.

---

## 27. Règle de maintenance

Toute modification de :

```text
applicationCapability.registry.js
planCapability.registry.js
validation des Plans
validation des EntitlementOverride
moteur de quotas
composition de l’entitlement effectif
endpoint Platform /plans/capabilities
```

doit vérifier dans le même lot si le présent contrat doit être mis à jour.
