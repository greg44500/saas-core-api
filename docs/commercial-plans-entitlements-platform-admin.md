# SAAS-CORE-API — Plans commerciaux, entitlements et administration Platform

**Date :** 2 septembre 2026  
**Statut :** décisions consolidées — remplace le cadrage commercial multi-workspace du 1er septembre 2026  
**Périmètre :** Plans, Subscription, Trial, capabilities, quotas, overrides et administration Platform

---

## 1. Objet

Ce document remplace la version du 1er septembre 2026 qui introduisait un abonnement commercial couvrant plusieurs Workspaces via un futur `CommercialAccount`.

Cette architecture est désormais **supplantée** et ne doit plus servir de base d’implémentation V1.

Les principes toujours valides sont conservés :

```text
features ≠ limits
entitlement commercial ≠ permission RBAC
backend = autorité
capabilities et métriques extensibles
exceptions commerciales administrées depuis Platform
```

Le SaaS Core reste générique et ne connaît aucune fonctionnalité propre à une application métier.

---

## 2. Décisions explicitement abandonnées

Les décisions suivantes de la version précédente sont annulées pour la V1 :

```text
Free = 1 workspace inclus commercialement
Premium = 5 workspaces inclus commercialement
1 abonnement Premium couvre plusieurs workspaces
CommercialAccount obligatoire
BillingAccount obligatoire
Subscription déplacée au-dessus du Workspace
metricKey = workspaces
scope = commercial_account
quota atomique de création de workspaces basé sur le Plan
roadmap C1 → C9 dédiée au CommercialAccount
```

En conséquence, ne pas refactorer actuellement :

```text
Subscription.workspace
UsageMetric.workspace
Workspace ownership
TrialEligibility
résolution d’entitlement existante
```

pour introduire un périmètre commercial supérieur au Workspace.

---

## 3. Modèle commercial V1 retenu

Le Workspace reste l’unité commerciale et multi-tenant autonome du Core V1 :

```text
Workspace
├── Subscription
├── Plan
├── UsageMetric
├── WorkspaceMember
├── Role
├── Files
└── AuditLog
```

`Subscription` reste Workspace-scoped.

`UsageMetric` reste Workspace-scoped.

Cette décision est cohérente avec l’architecture actuellement implémentée et évite une migration structurelle sans besoin produit suffisamment établi.

---

## 4. Multi-workspace : capacité technique ≠ politique commerciale

Un `User` peut toujours appartenir à plusieurs Workspaces via `WorkspaceMember`.

Cette capacité structurelle est nécessaire pour des situations légitimes :

```text
invitation dans un workspace tiers
consultant membre de plusieurs workspaces clients
utilisateur participant à plusieurs organisations
```

Le frontend ne doit donc jamais supposer qu’un utilisateur n’a qu’un seul membership.

En revanche, la politique commerciale permettant à une même identité de **créer** plusieurs Workspaces n’est pas définie dans ce document.

Ne pas ouvrir un parcours public de création illimitée ou plan-dépendante sans une politique serveur explicite.

Cette question peut être traitée ultérieurement sans introduire maintenant un `CommercialAccount`.

---

## 5. Distinction fondamentale des responsabilités

Le système conserve les notions suivantes :

```text
Feature
→ une capacité fonctionnelle existe ou non

Plan
→ offre catalogue : features + limites standards

Subscription
→ état contractuel réel d’un Workspace

Entitlement effectif
→ capacités et limites réellement applicables maintenant

UsageMetric
→ consommation réelle d’une métrique

RBAC
→ actions autorisées pour un membre précis
```

Deux contrôles restent donc distincts :

```text
Entitlement
→ le Workspace possède-t-il commercialement la capacité ?

Permission RBAC
→ ce membre peut-il l’utiliser ?
```

Une feature disponible dans le Plan ne donne jamais automatiquement la permission à tous les membres du Workspace.

---

## 6. Plans commerciaux actuellement envisagés

Les familles commerciales envisagées restent :

```text
free
premium
ai
```

Les anciennes possibilités `starter`, `business` et `enterprise` ne sont pas des offres V1 actives tant qu’un besoin commercial réel ne les justifie pas.

### Free

Le plan Free constitue la baseline du Workspace.

Il doit rester limité et ne bénéficie pas de trial.

### Premium

Le cadrage précédent a retenu :

```text
79 € HT / mois
```

Ce montant reste une référence commerciale historique du projet, mais l’ancienne signification :

```text
79 € HT / mois → jusqu’à 5 workspaces
```

est abandonnée.

Avant une facturation réelle, il faudra confirmer explicitement que le prix Premium correspond bien à l’abonnement d’un Workspace et finaliser ses limites commerciales.

### IA

Le plan IA reste envisagé comme une offre supérieure avec des capacités IA.

Son prix n’est pas figé.

Il devra être défini après mesure réaliste des coûts d’usage : modèles, tokens, agents, RAG, stockage et traitements documentaires éventuels.

---

## 7. Features et limites

Le modèle `Plan` conserve :

```text
features[]
limits
```

Règle fondamentale :

```text
feature
→ capacité disponible ou non

limit
→ quantité autorisée
```

Ne jamais coder une fonctionnalité métier avec une condition telle que :

```text
plan.key === "premium"
```

Le code doit contrôler une capability ou une limite stable.

---

## 8. Extensibilité des capabilities métier

Le registre de capabilities du Core constitue le point d’extension pour les futures applications.

Le Core connaît uniquement ses capabilities génériques actuelles.

Une application pourra ajouter ses propres features et métriques sans modifier la sémantique du Core.

Exemples conceptuels uniquement :

```text
features
technical_sheet
price_history
advanced_exports
ai_analysis

metrics
client_sites
training_groups
active_projects
```

Ces clés ne doivent pas être ajoutées au Core tant qu’un module métier réel ne les exige pas.

---

## 9. Plan.limits et UsageMetric

`Plan.limits` reste une `Map` afin de permettre des métriques extensibles.

`UsageMetric` conserve la portée :

```text
workspace
metricKey
value
periodType
periodStart
periodEnd
```

Le moteur générique `enforcePlanLimit()` continue à résoudre :

```text
Workspace
→ entitlement
→ Plan
→ limite
→ réservation atomique UsageMetric
```

Ne pas introduire de scope `commercial_account` dans ce moteur.

---

## 10. Trial

Le mécanisme existant reste la référence :

```text
baseline Free
+
Subscription commerciale trialing
→ entitlement commercial temporaire
```

Règles conservées :

- Free n’a pas de trial ;
- seuls les plans payants explicitement éligibles peuvent démarrer un trial ;
- aucun moyen de paiement n’est actuellement requis pour commencer le trial ;
- l’éligibilité est consommée une seule fois selon le mécanisme `TrialEligibility` ;
- changer de plan pendant un trial ne réinitialise jamais `trialEndsAt` ;
- le transfert d’ownership ne recrée ni ne prolonge le trial ;
- revenir volontairement au Free termine définitivement le trial ;
- l’expiration fait retomber l’entitlement vers la baseline Free selon le contrat Subscription ;
- le frontend ne décide jamais de la validité effective du trial.

---

## 11. EntitlementOverride — décision conservée avec cible corrigée

Une exception commerciale ne doit jamais modifier le `Plan` catalogue partagé par tous les clients.

Le concept `EntitlementOverride` reste pertinent pour permettre au `SUPER_ADMIN` d’accorder ou de restreindre exceptionnellement une capacité.

La cible recommandée du Core V1 est désormais :

```text
Workspace
```

et non :

```text
CommercialAccount
User individuel arbitraire
```

Résolution cible :

```text
Plan catalogue
+
Subscription effective / trial
+
Workspace EntitlementOverride actif
=
ENTITLEMENT EFFECTIF
```

---

## 12. Capacités d’un EntitlementOverride

Le futur mécanisme pourra permettre :

```text
activer une feature absente du plan
restreindre exceptionnellement une feature présente
augmenter une limite
réduire une limite
borner une exception dans le temps
accorder explicitement une exception durable
```

Exemples génériques :

```text
Workspace Premium + feature IA pendant 30 jours
Workspace Premium + capacité de stockage temporairement augmentée
Workspace Free + feature de découverte pendant une période déterminée
```

Le modèle devra notamment conserver :

```text
workspace
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

Une dérogation sensible doit toujours conserver son motif et son auteur.

---

## 13. Origine commerciale d’un override

Les origines possibles peuvent notamment inclure :

```text
promotion
commercial_gesture
support
contract
incident
administrative
```

Le trial reste un mécanisme Subscription distinct et ne doit pas être simulé par un override.

---

## 14. Administration Platform

Le `SUPER_ADMIN` doit disposer d’une vue commerciale du Workspace suffisante pour comprendre et administrer l’entitlement réel.

La future administration Platform pourra consulter :

```text
Workspace
Plan catalogue
Subscription
statut
trial
features catalogue
features effectives
limites catalogue
limites effectives
UsageMetric
overrides actifs et expirés
historique des changements
```

Et, lorsque `EntitlementOverride` sera implémenté :

```text
créer une exception
restreindre une feature
modifier temporairement une limite
accorder une exception durable explicitement voulue
révoquer un override
consulter son motif et son auteur
```

Ces actions restent réservées à Platform et ne sont pas des permissions d’administration Workspace ordinaires.

---

## 15. Séparation Platform / Workspace

### Platform

La plateforme détermine :

```text
ce que le Workspace a commercialement acquis
les exceptions commerciales accordées
les restrictions commerciales exceptionnelles
```

### Workspace

Le owner/admin du Workspace détermine uniquement, selon ses permissions :

```text
quel membre peut utiliser une capacité déjà disponible commercialement
```

Un admin Workspace ne doit jamais pouvoir s’auto-activer une feature payante ni augmenter lui-même un quota commercial.

---

## 16. Audit obligatoire

Toute future création, modification ou révocation d’un `EntitlementOverride` devra être auditée.

Actions recommandées :

```text
ENTITLEMENT_OVERRIDE_CREATED
ENTITLEMENT_OVERRIDE_UPDATED
ENTITLEMENT_OVERRIDE_REVOKED
```

L’audit devra permettre de retrouver au minimum :

```text
actor
workspace
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

## 17. Ordre d’implémentation retenu

`EntitlementOverride` ne bloque pas immédiatement la reprise du frontend Files.

Ordre actuel :

```text
RBAC-EXT
→ finalisation frontend Core
→ EntitlementOverride pendant le bloc commercial / Platform
→ frontend Platform correspondant
```

Ne pas relancer la roadmap `CommercialAccount` C1–C9 de l’ancienne version.

---

## 18. Garde-fous

Ne jamais :

```text
modifier un Plan catalogue pour un seul Workspace
coder plan.key === premium dans une fonctionnalité
faire confiance au frontend pour appliquer un quota
confondre entitlement commercial et permission RBAC
introduire CommercialAccount sans nouveau besoin produit démontré
créer une permission métier dans le Core uniquement pour anticipation
laisser un override sensible sans audit ni motif
```

Toujours :

```text
résoudre l’entitlement côté backend
protéger les quotas atomiquement
conserver la traçabilité
séparer le Core des modules métier
conserver le Workspace comme frontière tenant
mettre à jour les contrats frontend/backend si l’API observable change
```

---

## 19. Points encore ouverts

Avant commercialisation réelle, il reste notamment à figer :

```text
prix définitifs
limites exactes de Free / Premium / IA
prix du plan IA
provider de paiement
moyens de paiement
TVA / fiscalité
factures
webhooks de paiement
cycle définitif past_due
```

Ces sujets ne doivent pas être devinés dans le frontend actuel.

---

## 20. Documents liés

Références à maintenir ensemble :

```text
docs/backend-implementation-checklist.md
docs/frontend-backend-integration-contract.md
docs/frontend-backend-subscription-contract.md
docs/frontend-backend-roles-permissions-contract.md
docs/commercial-plans-entitlements-platform-admin.md
```

La présente version est la référence active pour les décisions commerciales du Core V1. Toute mention historique incompatible de `Premium = 5 workspaces`, de `CommercialAccount` obligatoire ou de métriques au scope `commercial_account` doit être considérée comme supplantée.