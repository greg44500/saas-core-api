# SAAS-CORE-API — Contrat commercial canonique

**Statut :** canonique — actif  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** Plan, Subscription, TrialEligibility, entitlement effectif, UsageMetric, quotas, EntitlementOverride et administration commerciale Platform

---

## 1. Objet

Ce document définit le moteur commercial générique du Core.

Il consolide les décisions encore valides des anciens documents commerciaux et du contrat Subscription, en les recoupant avec le code courant.

Principe directeur :

```text
Core
→ fournit les mécanismes génériques

SaaS dérivé
→ définit son catalogue commercial réel
```

Le Core ne doit pas imposer à toutes les applications dérivées un catalogue `Free / Premium / IA`, un prix particulier, une quantité de Workspaces ou une politique métier spécifique.

---

## 2. Séparation des notions

Les notions suivantes sont distinctes :

```text
Capability Registry
→ ce que l’application sait techniquement faire

Plan
→ ce qu’une offre catalogue accorde normalement

Subscription
→ état contractuel réel d’un Workspace

Entitlement effectif
→ droits commerciaux réellement applicables maintenant

UsageMetric
→ consommation d’une métrique

EntitlementOverride
→ exception commerciale appliquée à un Workspace

RBAC
→ actions autorisées pour un membre donné
```

Une capability présente dans un Plan ne donne donc jamais automatiquement la permission à tous les membres du Workspace.

---

## 3. Scope commercial V1

Le Workspace reste l’unité commerciale autonome du Core V1.

```text
Workspace
├── Subscription
├── Plan
├── UsageMetric
└── EntitlementOverride
```

Les modèles restent Workspace-scoped :

```text
Subscription.workspace
UsageMetric.workspace
EntitlementOverride.workspace
```

Le Core V1 ne possède pas de `CommercialAccount` obligatoire et ne considère pas qu’un seul abonnement couvre plusieurs Workspaces.

La capacité technique d’un User à appartenir à plusieurs Workspaces ne définit pas une politique commerciale multi-workspace.

---

## 4. Plan : identité technique et identité commerciale

### 4.1 `_id`

`_id` est l’identité MongoDB du Plan.

### 4.2 `key`

`key` reste un identifiant technique interne, stable et immuable, mais **il n’est plus saisi par le SUPER_ADMIN**.

Pour un nouveau Plan créé depuis Platform, le backend génère automatiquement une clé à partir de l’ObjectId MongoDB :

```text
plan_<ObjectId>
```

Conséquences :

- l’humain ne crée pas la clé technique ;
- le nom commercial peut changer sans changer l’identité interne ;
- le frontend public ne doit pas afficher cette clé comme information utilisateur ;
- aucune règle fonctionnelle ne doit déduire les droits depuis `plan.key`.

Les anciennes clés telles que `free`, `premium`, `starter`, etc. sont conservées uniquement pour compatibilité avec les données/migrations historiques.

### 4.3 `systemRole`

Le rôle structurel du Plan est porté par :

```text
systemRole
```

Valeur Core actuelle :

```text
baseline
```

`systemRole = baseline` identifie l’offre de référence automatiquement attachée à un nouveau Workspace.

Cette responsabilité ne dépend ni du nom commercial du Plan ni de sa clé technique.

Un seul Plan peut porter le rôle système `baseline`.

---

## 5. Baseline commerciale

Le Core V1 nécessite une baseline active pour assurer le fallback d’entitlement d’un Workspace.

Dans le catalogue de travail courant, cette baseline est présentée comme une offre Free, mais **le mot “Free” n’est pas l’invariant structurel**.

Le code et les contrats doivent utiliser :

```text
isBaseline
ou
systemRole = baseline
```

et non :

```text
name === "Free"
plan.key === "free"
```

La baseline :

- possède un prix nul dans la configuration actuelle lorsqu’elle représente l’offre gratuite ;
- n’a pas de trial ;
- possède des features et limites configurables ;
- ne doit pas recevoir automatiquement toutes les capabilities Core ;
- sert de fallback lorsque la Subscription commerciale ne fournit plus de droits.

Toute évolution permettant une instance sans baseline nécessitera une décision d’architecture spécifique.

---

## 6. Données catalogue Plan

Le Plan générique peut notamment porter :

```text
name
description
status
isPublic
displayOrder
trialEnabled
trialDurationDays
currency
priceMonthlyExclTaxMinor
priceYearlyExclTaxMinor
features[]
limits
```

### 6.1 Prix

Les prix sont stockés en unités monétaires mineures.

Exemple :

```text
79,00 EUR
→ 7900
```

Le prix est une donnée catalogue, jamais une permission.

### 6.2 Devise

La devise utilise un code de trois lettres majuscules.

### 6.3 Status vs visibilité

```text
status
→ état administratif du Plan

isPublic
→ visibilité dans le catalogue utilisateur
```

Un archivage est distinct d’un simple retrait du catalogue public.

### 6.4 Trial

```text
trialEnabled = false
→ trialDurationDays = null

trialEnabled = true
→ trialDurationDays entier strictement positif
```

---

## 7. Catalogue public

Endpoint :

```text
GET /api/plans
```

Seuls les Plans actifs et publics sont listés.

Le DTO public expose la sémantique nécessaire à l’utilisateur, notamment :

```text
id
isBaseline
name
description
displayOrder
currency
priceMonthlyExclTaxMinor
priceYearlyExclTaxMinor
trialEnabled
trialDurationDays
features
limits
```

La clé technique interne n’est pas exposée.

Le frontend ne doit donc ni afficher ni reconstruire une “clé de plan”.

---

## 8. Features et limits

Séparation obligatoire :

```text
feature
→ la capability est-elle disponible ?

limit
→ quelle quantité est autorisée ?
```

Une feature ne doit jamais être simulée par une limite artificielle et une limite ne doit pas devenir un booléen implicite si la capability possède une existence fonctionnelle propre.

### 8.1 Convention des limites

```text
null
→ illimité

0
→ aucune consommation autorisée

entier positif
→ plafond
```

Les clés de features et métriques doivent appartenir au registre applicatif actif.

---

## 9. Subscription Workspace

Préfixe externe :

```text
/api/workspaces/:workspaceId/subscription
```

Un Workspace peut conserver simultanément :

```text
Subscription baseline
+
Subscription commerciale
```

Valeurs de `kind` :

```text
baseline
commercial
```

Statuts du domaine :

```text
trialing
active
past_due
canceled
expired
```

`kind` et `status` sont deux dimensions différentes.

---

## 10. Priorité de la Subscription effective

La logique temporelle ne dépend pas uniquement du statut persisté.

Règle de priorité :

```text
commercial active et temporellement utilisable
→ prioritaire

sinon commercial trialing et trialEndsAt > maintenant
→ prioritaire

sinon baseline active
→ fallback
```

Une Subscription commerciale historiquement persistée comme `active` ou `trialing` ne doit pas continuer à accorder des droits au-delà de son échéance réelle.

---

## 11. Vue Subscription du Workspace

Endpoint :

```text
GET /api/workspaces/:workspaceId/subscription
```

Permission :

```text
subscription:read
```

Les rôles système actuels owner et admin peuvent lire cette vue selon leur configuration de permissions.

La réponse consolide :

```text
baseline
commercial
effectiveEntitlement
trialEligibility
```

### 11.1 Plan dans la vue Workspace

Le DTO Plan Workspace expose notamment :

```text
id
isBaseline
name
features
limits
```

Il n’expose pas la clé technique interne.

### 11.2 Entitlement effectif

La vue expose les droits réellement applicables :

```text
plan
features
limits
subscriptionKind
subscriptionStatus
accessMode
reason
blockingLimits
nonBlockingLimits
```

Point important : `features` et `limits` sont les valeurs **effectives après composition avec les EntitlementOverride actifs**, pas une simple copie du Plan catalogue.

Le frontend doit consommer ces valeurs et ne pas recalculer les overrides.

### 11.3 Confidentialité des overrides côté Workspace

La vue Workspace n’expose pas les informations commerciales internes d’override telles que :

```text
reason
source
grantedBy
identifiant interne de l’override
historique administratif
```

Ces informations appartiennent à Platform.

---

## 12. Access mode et remédiation

L’entitlement peut indiquer :

```text
normal
remediation
```

`remediation` signifie qu’une situation commerciale ou de quota nécessite une mise en conformité tout en permettant certaines lectures ou actions correctives.

Le frontend ne doit pas recalculer ce mode à partir des limites catalogue.

Les routes déterminent explicitement quelles opérations restent autorisées en remédiation.

Exemples :

- supprimer un fichier peut réduire le stockage ;
- retirer un membre peut réduire le nombre de sièges ;
- ajouter un fichier ne doit pas augmenter la consommation pendant une remédiation bloquante.

---

## 13. Trial

### 13.1 Démarrage/changement pendant l’essai

Endpoint :

```text
POST /api/workspaces/:workspaceId/subscription/trial
```

Autorisation : owner uniquement.

Body :

```json
{
  "planId": "<ObjectId>",
  "billingInterval": "monthly"
}
```

Périodicités actuellement supportées par ce workflow :

```text
monthly
yearly
```

### 13.2 Règles structurelles

- la baseline ne reçoit pas de trial ;
- le Plan cible doit être actif ;
- `trialEnabled` doit être vrai ;
- la durée doit être strictement positive ;
- aucun moyen de paiement n’est requis par le mécanisme V1 pour commencer un trial ;
- `TrialEligibility` empêche la recréation artificielle des essais ;
- changer de Plan pendant un trial ne réinitialise jamais `trialEndsAt` ;
- le transfert d’ownership ne recrée ni ne prolonge le trial ;
- une Subscription commerciale active/past_due n’ouvre pas un nouveau trial ;
- le backend reste l’autorité de l’éligibilité.

### 13.3 Retour volontaire à la baseline

Endpoint :

```text
POST /api/workspaces/:workspaceId/subscription/trial/end-to-free
```

Le nom historique de route contient `free`, mais la règle métier correspond au retour vers la baseline V1.

Le retour volontaire met fin au trial et ne restaure pas l’éligibilité consommée.

Le frontend doit avertir l’owner du caractère irréversible de cette consommation d’essai.

---

## 14. TrialEligibility

La vue Workspace expose uniquement l’information nécessaire :

```json
{
  "consumed": true
}
```

Les informations internes utilisées pour empêcher la recréation frauduleuse d’un essai ne font pas partie du contrat public.

La suppression puis recréation d’un compte ne doit pas permettre de contourner cette éligibilité lorsque le mécanisme d’identité persistante du Core peut la reconnaître.

---

## 15. Résiliation programmée

### Programmer

```text
POST /api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation
```

### Révoquer

```text
DELETE /api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation
```

Autorisation : owner uniquement.

Une résiliation programmée en fin de période ne signifie pas interruption immédiate. La Subscription reste utilisable jusqu’à l’échéance effective selon les règles du domaine.

Le frontend doit afficher la date d’effet avant confirmation.

---

## 16. Downgrade programmé

### Programmer

```text
POST /api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade
```

### Révoquer

```text
DELETE /api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade
```

Autorisation : owner uniquement.

Le backend reste l’autorité pour vérifier notamment :

- appartenance de la Subscription au Workspace ;
- Subscription commerciale active ;
- période encore ouverte ;
- absence de changement incompatible déjà programmé ;
- Plan cible actif et différent ;
- compatibilité de devise/périodicité ;
- cohérence tarifaire du downgrade ;
- date d’effet.

Le frontend peut filtrer les choix impossibles pour l’UX, mais il ne remplace pas ces contrôles.

---

## 17. Owner vs admin Workspace

La lecture de Subscription peut être ouverte à owner/admin selon la permission `subscription:read`.

En revanche, les commandes qui engagent le contrat commercial du Workspace utilisent un contrôle owner-only dédié et ne sont pas délégables par simple rôle personnalisé.

Principe :

```text
admin Workspace
→ administre le tenant selon ses permissions

owner
→ peut en plus engager les commandes commerciales réservées
```

Un admin Workspace ne doit jamais pouvoir s’accorder lui-même une capability payante ni modifier un quota commercial.

---

## 18. EntitlementOverride

Une exception commerciale s’applique à un Workspace sans modifier le Plan catalogue partagé.

Résolution :

```text
Plan effectif de la Subscription
+
EntitlementOverride actifs
=
capabilities effectives du Workspace
```

### 18.1 Cibles

Un override cible exactement :

```text
feature
ou
limit
```

Feature :

```text
featureKey
featureEnabled: boolean
```

Limit :

```text
metricKey
limitValue: entier >= 0 | null
```

`null` conserve la convention « illimité ».

### 18.2 Overlay

```text
feature true
→ ajoute la capability

feature false
→ retire la capability

limit
→ remplace la valeur du Plan
```

La composition travaille sur une vue dérivée et ne modifie jamais le Plan catalogue.

### 18.3 Registre applicatif

Un override ne peut cibler qu’une capability ou une métrique connue du registre actif de l’application.

Une ancienne donnée persistée devenue incompatible avec le registre courant doit provoquer une erreur explicite plutôt qu’accorder silencieusement un droit inconnu du logiciel.

### 18.4 Temporalité

Un override est effectif lorsqu’il est actif à l’instant courant, notamment selon le principe :

```text
startsAt <= now
ET
endsAt est null OU now < endsAt
ET
non révoqué
```

L’expiration ne restaure pas une ancienne valeur mémorisée. Le système recalcule l’entitlement depuis le Plan effectif puis applique uniquement les overrides encore actifs.

### 18.5 Historique

Un override expiré ou révoqué devient historique et n’est pas réécrit pour simuler une nouvelle exception.

---

## 19. Administration Platform des EntitlementOverride

Endpoints :

```text
GET    /api/platform/entitlement-overrides
GET    /api/platform/entitlement-overrides/workspaces/:workspaceId/context
GET    /api/platform/entitlement-overrides/:overrideId
POST   /api/platform/entitlement-overrides
PATCH  /api/platform/entitlement-overrides/:overrideId
PATCH  /api/platform/entitlement-overrides/:overrideId/revoke
```

Permissions :

```text
platform:entitlement_overrides:read
platform:entitlement_overrides:create
platform:entitlement_overrides:update
platform:entitlement_overrides:revoke
```

La politique V1 attribue ces permissions au seul `super_admin`.

Les opérations sensibles conservent un motif et une traçabilité. Création, modification et révocation doivent être auditées selon le service courant.

Le trial reste un mécanisme Subscription et ne doit pas être simulé par un EntitlementOverride.

---

## 20. UsageMetric et quotas

`UsageMetric` reste Workspace-scoped.

Une métrique doit appartenir au registre applicatif actif et définir la sémantique nécessaire à son contrôle.

Le moteur de quotas doit résoudre la limite **effective**, donc prendre en compte les overrides applicables lorsqu’ils affectent une limite.

Les réservations qui protègent un quota soumis à concurrence doivent rester atomiques lorsque le domaine l’exige.

Le frontend peut afficher la consommation mais ne doit jamais être l’autorité qui décide si une nouvelle consommation est acceptée.

---

## 21. Administration Platform des Plans

Endpoints :

```text
GET    /api/platform/plans/capabilities
GET    /api/platform/plans
POST   /api/platform/plans
PATCH  /api/platform/plans/:planId
PATCH  /api/platform/plans/:planId/archive
```

### 21.1 Création

Le payload Platform **ne contient pas `key`**.

Le backend génère l’identité technique interne.

Les champs commerciaux pilotables incluent les données prévues par le schéma : nom, description, visibilité, ordre, trial, devise, prix, features et limites.

### 21.2 Validation des capabilities

Les features et métriques sont validées contre le registre applicatif actif.

Une clé arbitraire envoyée par HTTP ne crée jamais une capability.

### 21.3 Archivage

Un Plan archivé sort du cycle normal de modification et du catalogue public selon les règles du service Platform.

Les Subscriptions historiques doivent conserver leur cohérence ; l’archivage d’un catalogue ne doit pas effacer l’histoire contractuelle.

---

## 22. Administration Platform des Subscriptions

Endpoints :

```text
GET    /api/platform/subscriptions
POST   /api/platform/subscriptions/grant-trial
GET    /api/platform/subscriptions/:subscriptionId
PATCH  /api/platform/subscriptions/:subscriptionId
PATCH  /api/platform/subscriptions/:subscriptionId/cancel
PATCH  /api/platform/subscriptions/:subscriptionId/resume
```

La politique effective V1 est `super_admin` uniquement.

Le grant trial administratif reste distinct du parcours normal owner et ne doit pas contourner les invariants d’éligibilité du backend.

Les mutations Platform sont des commandes administratives sensibles ; elles ne deviennent pas une autorité financière de paiement.

---

## 23. Billing / Payment : frontière stricte

Le domaine commercial actuel gère :

```text
Plan
Subscription
Trial
Entitlement
quotas
overrides
```

Il **ne constitue pas encore** un domaine complet de paiement/facturation.

Restent distincts :

```text
moyens de paiement
provider de paiement
encaissement réel
factures
TVA / fiscalité
remboursements / crédits
webhooks provider
preuve d’échec ou succès de paiement
revenu comptable
```

Un prix de Subscription ou une estimation contractuelle n’est pas une preuve d’encaissement.

La dette de Billing/Payment réel est suivie dans `docs/DEBT.md`.

---

## 24. Catalogue dérivé et absence de valeurs universelles

Les anciennes références suivantes peuvent exister dans l’historique du projet :

```text
Free
Premium
IA
79 € HT / mois
5 Workspaces
```

Elles ne sont pas des invariants universels du Core.

Une application dérivée doit pouvoir définir :

```text
noms de plans
prix
devises
trial
features
limits
ordre d’affichage
visibilité
catalogue final
```

sans modifier le moteur générique.

---

## 25. `.env` vs catalogue commercial

`.env` est destiné principalement :

```text
secrets
URLs
paramètres techniques de déploiement
configuration infrastructure
```

La base/seeds/administration Platform portent :

```text
Plans
prix
devises
trial
features
limits
visibilité
ordre d’affichage
```

Les prix et quotas ordinaires ne doivent pas être déplacés dans `.env` pour simuler de la configurabilité.

---

## 26. Seeds

Un seed peut initialiser une instance exploitable, notamment sa baseline.

Mais un seed :

- ne transforme pas une valeur initiale en constante métier ;
- ne doit pas réécrire silencieusement un Plan déjà administré ;
- doit rester idempotent selon son contrat ;
- doit être compatible avec l’administration Platform du catalogue.

Les opérations détaillées de seed seront consolidées dans `docs/operations/OPERATIONS.md`.

---

## 27. Garde-fous

Ne jamais :

```text
accorder une feature avec plan.name
accorder une feature avec plan.key
faire saisir la clé technique interne du Plan par le SUPER_ADMIN
modifier un Plan partagé pour un seul Workspace
confondre RBAC et entitlement
laisser le frontend appliquer seul un quota
inventer une capability depuis Platform
utiliser un override pour simuler un trial
réintroduire CommercialAccount sans besoin produit démontré
considérer un prix historique comme invariant du Core
présenter une estimation contractuelle comme revenu encaissé
```

Toujours :

```text
utiliser l’identité MongoDB pour référencer le Plan
utiliser systemRole/isBaseline pour la baseline
résoudre l’entitlement côté backend
appliquer les overrides sur une vue dérivée
valider les capabilities contre le registre actif
maintenir la traçabilité des mutations sensibles
séparer paiement réel et entitlement
```

---

## 28. Documents historiques absorbés

Ce contrat consolide progressivement :

```text
commercial-configuration-contract.md
commercial-plans-entitlements-platform-admin.md
frontend-backend-subscription-contract.md
```

Les aspects Platform transversaux sont également recoupés avec `frontend-platform-admin-contract.md` et le code courant.

Ces anciens fichiers restent présents jusqu’à validation explicite de leur suppression.

---

## 29. Règle de maintenance

Toute modification de :

```text
Plan
Subscription
TrialEligibility
UsageMetric
EntitlementOverride
resolver d’entitlement
contrat public /api/plans
contrat Workspace subscription
routes commerciales Platform
```

doit vérifier si le présent document doit être mis à jour dans le même lot.
