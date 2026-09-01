# SAAS-CORE-API — Plans commerciaux, entitlements et administration Platform

**Date :** 1 septembre 2026  
**Statut :** décisions d’architecture figées avant implémentation  
**Périmètre :** plans commerciaux, multi-workspace commercial, features, quotas, trials, overrides, administration Platform

---

## 1. Objet

Ce document fige les décisions prises avant la poursuite du bloc Multi-workspace UX.

Il complète les documents existants relatifs à `Plan`, `Subscription`, `UsageMetric`, au contrat frontend/backend Subscription et à l’administration Platform.

La règle de sécurité reste :

```text
Backend security
→ contrat API
→ frontend
→ tests
```

Le frontend ne constitue jamais la barrière réelle d’accès à une fonctionnalité, un quota, un workspace ou une opération commerciale.

---

## 2. Distinction fondamentale des responsabilités

Le système doit conserver cinq notions distinctes :

```text
Feature
→ capacité fonctionnelle disponible ou non

Plan
→ offre commerciale catalogue : features + limites standards

Subscription
→ état contractuel réel d’un client

Entitlement effectif
→ capacités et limites réellement applicables maintenant

UsageMetric
→ consommation réelle d’une métrique
```

Le système RBAC reste indépendant :

```text
Entitlement commercial
→ le client/workspace possède-t-il cette capacité ?

Permission RBAC
→ cet utilisateur précis peut-il effectuer cette action ?
```

Une feature commercialement disponible ne donne jamais automatiquement la permission à tous les membres du workspace.

---

## 3. Plans commerciaux V1 figés

Les offres commerciales V1 sont :

```text
free
premium
ai
```

Les anciennes possibilités `starter`, `business`, `enterprise` restent des évolutions futures possibles mais ne constituent pas des offres V1 à implémenter tant qu’un besoin commercial réel ne les justifie pas.

### Free

Prix :

```text
0 € HT / mois
```

Décision figée :

```text
maximum de workspaces : 1
```

Le plan Free sert à la découverte et à l’usage individuel limité.

### Premium

Prix mensuel figé :

```text
79 € HT / mois
```

Décision figée :

```text
maximum de workspaces : 5
```

Premium constitue l’offre professionnelle principale.

### IA

Le plan IA est une offre supérieure incluant les capacités Premium et des capacités IA.

Son prix n’est pas encore figé. Il devra être déterminé après mesure réaliste des coûts : modèles, tokens, agents, RAG, stockage éventuel, traitements documentaires et autres consommations IA.

Le quota IA devra être exprimé via une métrique stable, de préférence abstraite, par exemple :

```text
ai_credits_monthly
```

et non par un simple nombre de prompts.

---

## 4. Valeurs commerciales encore à arbitrer

Les limites ci-dessous doivent être déterminées avant finalisation des seeds commerciaux :

```text
members
storage_bytes
file_uploads_monthly
max_file_size_bytes
ai_credits_monthly
```

ainsi que les futures métriques métier ajoutées par une application utilisant le core.

Les valeurs provisoires proposées pendant le cadrage ne sont pas des décisions contractuelles tant qu’elles ne sont pas explicitement validées.

---

## 5. Plan.features reste la source catalogue des capacités

Le modèle `Plan` actuel conserve :

```text
features[]
limits
```

Cette architecture est confirmée.

Les routes métier ne doivent jamais tester directement :

```text
plan.key === "premium"
```

Elles doivent demander si une capability précise est disponible.

Exemple :

```text
price_history
advanced_exports
ai_analysis
```

---

## 6. Extension par les modules métier

Le core SaaS ne doit connaître aucune fonctionnalité spécifique aux produits alimentaires, à l’immobilier ou à un autre métier.

Les modules métier doivent enrichir le registre de capabilities existant.

Exemple pour un futur domaine alimentaire :

```text
product_catalog
supplier_management
price_history
price_import
advanced_cost_analysis
```

Métriques possibles :

```text
products
suppliers
price_imports_monthly
price_history_entries
```

Le module métier demande au core de contrôler une feature ou une métrique ; il ne doit pas coder une connaissance directe de `free`, `premium` ou `ai`.

---

## 7. Modèle MongoDB Feature : décision

Le modèle optionnel `Feature` avait été anticipé dans la documentation initiale.

Décision actuelle :

```text
ne pas créer encore une collection MongoDB Feature
```

Le registre de capabilities actuellement implémenté est suffisant pour le stade actuel et permet déjà les extensions métier.

Un véritable modèle `Feature` ne sera introduit que si la plateforme a besoin d’un catalogue dynamique de fonctionnalités administrables en base.

---

## 8. Trials

Une période de découverte complète ne doit jamais modifier temporairement le plan Free.

Le mécanisme existant est conservé :

```text
baseline Free
+
Subscription commerciale trialing
→ entitlement commercial temporaire
```

À l’expiration, le backend retombe vers la baseline Free selon les règles Subscription déjà stabilisées.

Le frontend ne recalcule jamais lui-même la validité d’un trial.

---

## 9. EntitlementOverride — nouvelle brique à implémenter

Une exception commerciale ne doit jamais modifier le Plan catalogue partagé par tous les clients.

Il faut introduire un mécanisme dédié d’override permettant de :

```text
activer une feature absente du plan
restreindre exceptionnellement une feature présente
augmenter ou diminuer une limite
borner une dérogation dans le temps
accorder une dérogation permanente lorsqu’elle est explicitement voulue
```

Exemples :

```text
Premium + ai_analysis pendant 30 jours
Premium + 10 Go de stockage temporaire
Premium : workspaces 5 → 8 selon contrat
Free + price_history pendant une période de découverte
```

Un override doit notamment conserver :

```text
cible commerciale
featureKey ou metricKey
valeur / état effectif
type de dérogation
startsAt
endsAt
reason
grantedBy
createdAt
updatedAt
```

Une dérogation temporaire doit avoir une date de fin explicite par défaut.

---

## 10. Origine commerciale d’un override

Les sources recommandées sont :

```text
trial
promotion
commercial_gesture
support
contract
incident
administrative
```

La raison métier doit être obligatoire pour toute création ou modification d’override.

---

## 11. Administration Platform

Le `super_admin` doit disposer dans l’administration Platform d’une vision commerciale complète du client.

L’administration Platform doit permettre de consulter :

```text
plan
subscription
statut
workspaces utilisés / autorisés
features catalogue
features effectives
limites catalogue
limites effectives
usage
trials
overrides actifs et expirés
historique des changements
```

Et permettre :

```text
activer une feature exceptionnellement
restreindre une feature exceptionnellement
modifier temporairement une limite
modifier durablement une limite selon contrat
révoquer un override
consulter le motif et l’auteur
```

Ces actions sont des actions Platform. Elles ne sont pas accessibles à un admin workspace client.

---

## 12. Séparation Platform / Workspace

### Platform

Le propriétaire/éditeur du SaaS décide :

```text
ce que le client a commercialement acheté
ce qui lui est accordé temporairement
ses limites commerciales exceptionnelles
```

### Workspace

Le owner/admin du client décide uniquement, selon ses permissions :

```text
quel membre peut utiliser une capacité déjà autorisée commercialement
```

Un admin workspace ne peut jamais s’auto-activer une capacité payante, modifier un quota commercial ni augmenter son nombre de workspaces.

---

## 13. Audit obligatoire

Toute modification d’entitlement ou d’override doit être auditée.

Actions recommandées :

```text
ENTITLEMENT_OVERRIDE_CREATED
ENTITLEMENT_OVERRIDE_UPDATED
ENTITLEMENT_OVERRIDE_REVOKED
```

L’audit doit permettre de retrouver au minimum :

```text
actor
cible commerciale
featureKey ou metricKey
ancienne valeur
nouvelle valeur
reason
startsAt
endsAt
ipAddress
userAgent
createdAt
```

---

## 14. Résolution cible d’un entitlement

La résolution cible devient :

```text
Plan catalogue
        ↓
Subscription effective / trial
        ↓
EntitlementOverride actif
        ↓
ENTITLEMENT EFFECTIF
        ↓
contrôle feature
        ↓
contrôle quota
        ↓
permission RBAC
        ↓
service métier
```

Le backend reste l’unique autorité de cette résolution.

---

## 15. Problème architectural multi-workspace identifié

Le modèle `Subscription` actuel appartient directement à un `workspace`.

Cette architecture convient à :

```text
1 workspace = 1 abonnement
```

mais elle ne représente pas proprement la nouvelle décision :

```text
1 abonnement Premium à 79 € HT / mois
→ jusqu’à 5 workspaces
```

Il faut donc introduire un périmètre commercial supérieur au workspace avant d’autoriser définitivement la création de workspaces supplémentaires selon le plan.

---

## 16. Périmètre commercial supérieur

Décision d’architecture :

```text
un abonnement commercial multi-workspace ne doit pas être porté directement par un User ni dépendre arbitrairement d’un premier workspace
```

Il faut créer un propriétaire commercial stable, conceptuellement :

```text
CommercialAccount / BillingAccount / Organization commerciale
```

Le nom final sera figé lors du mini-lot de conception.

Architecture cible :

```text
CommercialAccount
    │
    ├── Subscription Premium
    │
    ├── Workspace A
    ├── Workspace B
    ├── Workspace C
    ├── Workspace D
    └── Workspace E
```

Le contrat commercial reste ainsi stable même en cas de transfert d’ownership utilisateur.

---

## 17. Portée des métriques

Chaque métrique doit pouvoir déclarer sa portée.

Exemples :

```text
workspaces
→ commercial account

members
→ workspace

storage_bytes
→ portée à décider selon politique commerciale

file_uploads_monthly
→ portée à décider selon politique commerciale

ai_credits_monthly
→ probablement commercial account
```

Le registre actuel décrit déjà la période et le comportement des métriques ; il devra être enrichi avec une notion de scope.

Valeurs conceptuelles :

```text
commercial_account
workspace
```

---

## 18. Conséquence immédiate sur le bloc Multi-workspace UX

Le frontend ne doit pas encore rendre la création du deuxième workspace libre uniquement sur la base d’un bouton.

Avant le bloc UI :

```text
1. créer le périmètre commercial
2. rattacher l’abonnement commercial au bon propriétaire
3. implémenter le quota workspaces
4. sécuriser POST /api/workspaces côté backend
5. exposer le droit / quota au frontend
6. seulement ensuite activer “Créer un workspace”
```

---

## 19. Roadmap d’implémentation figée

### C1 — Conception CommercialAccount

Définir :

```text
modèle
ownership commercial
relation User / Workspace / Subscription
cycle de vie
index
transfert
migration des workspaces existants
```

### C2 — Migration Subscription

Faire évoluer Subscription pour qu’une souscription commerciale puisse appartenir au périmètre commercial retenu sans casser l’historique `baseline/commercial`, le trial ni le contrat existant.

Prévoir une migration explicite et des tests de non-régression.

### C3 — Metric scope + quota workspaces

Ajouter la notion de scope au registre de métriques.

Ajouter :

```text
workspaces
```

comme métrique commerciale.

Sécuriser la création de workspace avec contrôle atomique du quota.

### C4 — Plans commerciaux V1

Finaliser les seeds :

```text
Free
Premium
IA
```

avec prix et limites validées.

Ne pas coder encore un prix IA arbitraire.

### C5 — EntitlementOverride backend

Créer le module dédié :

```text
model
validation Zod
service
controller
routes Platform
audit
tests
```

Le service d’entitlement doit appliquer les overrides actifs.

### C6 — API Platform commerciale

Exposer au super_admin :

```text
lecture du compte commercial
usage
features/limits catalogue
entitlement effectif
overrides
création / modification / révocation override
```

### C7 — Frontend Platform

Créer une interface d’administration permettant :

```text
fiche client
abonnement
usage
features
limites
overrides
historique
```

Réutiliser Drawer, tables, ActionIconButton, Tooltip et patterns existants lorsque pertinent.

### C8 — Multi-workspace frontend

Une fois le backend sécurisé :

```text
bouton créer workspace
contrôle quota
messages Free 1/1
Premium X/5
redirection upgrade si limite atteinte
WorkspaceSwitcher
```

### C9 — Tests finaux

Backend :

```text
unitaires
intégration
concurrence quota
multi-tenant
audit
overrides expirés
transferts ownership
trial + overrides
```

Frontend :

```text
Vitest
React Testing Library
Playwright sur parcours critiques
```

---

## 20. Garde-fous définitifs

Ne jamais :

```text
modifier un Plan catalogue pour un seul client
coder plan.key === premium dans un module métier
faire confiance au frontend pour appliquer un quota
confondre entitlement commercial et permission RBAC
faire dépendre un abonnement commercial multi-workspace d’un simple owner User
laisser un override sensible sans audit ni motif
```

Toujours :

```text
résoudre côté backend l’entitlement effectif
protéger les quotas de façon atomique
conserver la traçabilité
séparer core et modules métier
mettre à jour les contrats frontend/backend lorsque l’API observable change
```

---

## 21. Documents liés

À relire avant toute implémentation de ce domaine :

```text
docs/backend-implementation-checklist.md
docs/frontend-backend-integration-contract.md
docs/frontend-backend-subscription-contract.md
docs/frontend-backend-roles-permissions-contract.md
docs/commercial-plans-entitlements-platform-admin.md
```

Ce document devient la référence de décision pour les travaux commerciaux multi-workspace, les entitlements et les overrides Platform.