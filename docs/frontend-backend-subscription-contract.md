# SAAS-CORE-API — Contrat d’intégration frontend/backend Subscription

**Statut :** contrat frontend stabilisé — lot F4  
**Date :** 29 août 2026  
**Backend de référence :** `saas-core-api`  
**Frontend cible :** React + Vite, JavaScript, Tailwind CSS, shadcn/ui, Redux Toolkit, RTK Query

## 1. Objet

Ce document fige le contrat HTTP actuellement exposé au frontend pour le domaine **Subscription d’un workspace**.

Il documente uniquement les comportements réellement implémentés et testés :

- lecture consolidée de la Subscription d’un workspace ;
- entitlement effectif ;
- trial commercial ;
- retour volontaire au plan Free pendant un trial ;
- résiliation programmée ;
- révocation d’une résiliation programmée ;
- downgrade programmé ;
- révocation d’un downgrade programmé ;
- autorisation owner/admin ;
- frontière multi-tenant ;
- remédiation liée aux limites de plan.

Ce contrat **n’est pas un contrat Billing/Payment**. Les moyens de paiement, identifiants client d’un provider, factures, taxes, remboursements, crédits, webhooks de paiement et preuves d’encaissement restent hors périmètre de F4.

---

## 2. Principes d’autorité

Le frontend ne doit jamais reconstruire les règles de Subscription à partir de données partielles.

Le backend reste l’autorité pour :

- le statut contractuel de la Subscription ;
- le choix de la Subscription qui fournit réellement les droits ;
- l’expiration temporelle d’un trial ou d’une période commerciale ;
- le fallback vers la baseline Free ;
- le mode `normal` ou `remediation` ;
- les limites bloquantes et non bloquantes ;
- l’éligibilité au trial ;
- les transitions de résiliation et de downgrade ;
- les autorisations owner/admin ;
- l’appartenance d’une Subscription à un workspace.

Le frontend peut adapter l’UX, mais toute mutation doit accepter qu’une décision serveur refuse l’opération si l’état a changé depuis le dernier affichage.

---

## 3. Architecture Subscription du workspace

Un workspace peut posséder simultanément :

```text
baseline
→ offre de référence permanente
→ actuellement le plan Free

commercial
→ trial ou souscription payante
→ peut coexister avec la baseline
```

Les valeurs de `kind` stabilisées sont :

```text
baseline
commercial
```

Les statuts stabilisés sont :

```text
trialing
active
past_due
canceled
expired
```

`kind` décrit le rôle de la Subscription. `status` décrit son état dans le cycle de vie.

Le frontend ne doit pas modéliser ces deux notions comme un unique champ « plan courant ».

---

## 4. Entitlement effectif

Le backend résout le plan réellement applicable au workspace.

Règle stabilisée :

```text
commercial active et temporellement utilisable
→ prioritaire

sinon commercial trialing avec trialEndsAt strictement futur
→ prioritaire

sinon baseline active
→ fallback
```

Le frontend ne doit jamais décider lui-même qu’une Subscription commerciale est encore utilisable.

Un trial dont `trialEndsAt` est atteint ne fournit plus de droits commerciaux, même si son statut persistant n’a pas encore été réconcilié vers `expired`.

Une Subscription `active` dont la période est terminée ne doit pas être considérée comme utilisable uniquement parce que son champ `status` vaut encore `active`.

---

## 5. Base URL Subscription workspace

Les routes sont réellement montées sous :

```text
/api/workspaces/:workspaceId/subscription
```

Toutes les routes sont protégées par authentification.

`workspaceId` et, lorsqu’il existe, `subscriptionId` doivent être des ObjectId MongoDB représentés par 24 caractères hexadécimaux.

---

## 6. Matrice d’autorisation

| Action | Owner | Admin | Manager | Member | Reader |
| --- | ---: | ---: | ---: | ---: | ---: |
| Lire l’état Subscription | Oui | Oui | Non | Non | Non |
| Démarrer/changer un trial | Oui | Non | Non | Non | Non |
| Quitter volontairement le trial vers Free | Oui | Non | Non | Non | Non |
| Programmer une résiliation | Oui | Non | Non | Non | Non |
| Révoquer une résiliation programmée | Oui | Non | Non | Non | Non |
| Programmer un downgrade | Oui | Non | Non | Non | Non |
| Révoquer un downgrade programmé | Oui | Non | Non | Non | Non |

La lecture utilise la permission :

```text
subscription:read
```

Cette permission est attribuée aux rôles système `owner` et `admin`.

Les commandes commerciales **n’utilisent pas une permission délégable**. Elles passent par une barrière owner-only qui exige le rôle système `owner`. Un admin ou un rôle personnalisé ne peut donc pas recevoir indirectement le droit d’engager, modifier ou résilier le contrat commercial.

Cette séparation devra être conservée lors de l’introduction future de Billing/Payment.

---

## 7. Frontière multi-tenant

Pour les commandes qui utilisent un `subscriptionId`, le backend vérifie que :

```text
subscription._id = subscriptionId
ET
subscription.workspace = workspaceId
```

Une Subscription appartenant à un autre workspace est donc traitée comme introuvable dans le workspace courant.

Le frontend ne doit jamais considérer un identifiant de Subscription comme une preuve d’accès.

---

# 8. Lecture consolidée

## GET `/api/workspaces/:workspaceId/subscription`

**Autorisation :** `subscription:read`  
**Rôles système actuels :** owner, admin  
**Disponible en remédiation :** oui

### Succès

`200 OK`

```json
{
  "status": "success",
  "data": {
    "subscription": {
      "baseline": {
        "id": "...",
        "kind": "baseline",
        "status": "active",
        "plan": {
          "id": "...",
          "key": "free",
          "name": "Free",
          "features": [],
          "limits": {}
        },
        "currentPeriodStart": "...",
        "currentPeriodEnd": null,
        "trialEndsAt": null,
        "cancelAtPeriodEnd": false,
        "billingInterval": "none",
        "scheduledChange": null
      },
      "commercial": null,
      "effectiveEntitlement": {
        "plan": {
          "id": "...",
          "key": "free",
          "name": "Free",
          "features": [],
          "limits": {}
        },
        "subscriptionKind": "baseline",
        "subscriptionStatus": "active",
        "accessMode": "normal",
        "reason": null,
        "blockingLimits": [],
        "nonBlockingLimits": []
      }
    }
  }
}
```

`commercial` peut être `null`.

### DTO Plan public dans cette vue

```json
{
  "id": "...",
  "key": "...",
  "name": "...",
  "features": [],
  "limits": {}
}
```

La vue Subscription ne réexpose volontairement pas les prix catalogue ni la devise du Plan. Le catalogue public `/api/plans` reste la source prévue pour l’affichage des offres et tarifs catalogue.

### `scheduledChange` dans la vue consolidée

Lorsqu’un changement est programmé :

```json
{
  "type": "downgrade",
  "targetPlan": {
    "id": "...",
    "key": "...",
    "name": "...",
    "features": [],
    "limits": {}
  },
  "targetBillingInterval": "monthly",
  "effectiveAt": "...",
  "requestedAt": "..."
}
```

Les champs internes `targetCurrency`, `targetPriceExclTaxMinor` et `requestedBy` ne sont pas exposés dans cette **vue de lecture owner/admin**.

---

## 9. `effectiveEntitlement`

Le frontend doit utiliser `effectiveEntitlement` pour savoir quel plan et quelles limites sont réellement applicables.

### Champs

```text
plan
subscriptionKind
subscriptionStatus
accessMode
reason
blockingLimits
nonBlockingLimits
```

### `accessMode`

Valeurs stabilisées :

```text
normal
remediation
```

`remediation` indique que le contrat a bien évolué mais que la consommation actuelle dépasse une ou plusieurs limites bloquantes du plan effectif.

La Subscription peut donc rester `active` tout en ayant :

```text
accessMode = remediation
```

Le frontend ne doit pas transformer cette situation en statut Subscription artificiel.

### Limites actuellement classées

Bloquantes/réductibles :

```text
members
storage_bytes
```

Non bloquante globalement :

```text
file_uploads_monthly
```

Un dépassement de `file_uploads_monthly` bloque une consommation supplémentaire de cette métrique mais ne déclenche pas à lui seul le mode global `remediation`.

Le frontend ne doit pas calculer seul le mode de remédiation à partir des limites catalogue.

---

# 10. Démarrer ou changer un trial

## POST `/api/workspaces/:workspaceId/subscription/trial`

**Autorisation :** owner-only  
**Statut de succès :** `201 Created`

### Body

```json
{
  "planId": "507f1f77bcf86cd799439011",
  "billingInterval": "monthly"
}
```

`billingInterval` accepte uniquement :

```text
monthly
yearly
```

Le body est strict : tout champ inconnu est rejeté.

### Règles métier stabilisées

- Free ne peut pas recevoir de trial ;
- le Plan doit être actif ;
- `trialEnabled` doit être `true` ;
- `trialDurationDays` doit être un entier strictement positif ;
- aucun moyen de paiement n’est requis ;
- l’éligibilité au trial est consommée une seule fois par identité ;
- un trial commercial existant peut changer vers un autre plan éligible ;
- un changement de plan pendant le trial ne modifie jamais `trialEndsAt` ;
- une Subscription commerciale `active` ou `past_due` empêche l’ouverture d’un nouveau trial ;
- la baseline Free reste active en parallèle.

### Réponse

```json
{
  "status": "success",
  "data": {
    "subscription": {
      "id": "...",
      "workspace": "...",
      "plan": "...",
      "kind": "commercial",
      "status": "trialing",
      "currentPeriodStart": "...",
      "currentPeriodEnd": "...",
      "trialEndsAt": "...",
      "billingInterval": "monthly",
      "currency": "EUR",
      "priceExclTaxMinor": 0,
      "provider": "manual",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

`currency`, `priceExclTaxMinor` et `provider` décrivent ici le snapshot contractuel de la Subscription. Ils ne prouvent aucun encaissement et ne remplacent pas le futur contrat Billing/Payment.

Après succès, le frontend doit invalider/refetch la lecture consolidée du workspace au lieu de reconstruire localement l’entitlement.

---

# 11. Retour volontaire vers Free pendant un trial

## POST `/api/workspaces/:workspaceId/subscription/trial/end-to-free`

**Autorisation :** owner-only  
**Body :** aucun  
**Statut de succès :** `200 OK`

### Règles métier stabilisées

- seule une Subscription commerciale réellement `trialing` peut utiliser cette commande ;
- le trial doit encore être temporellement valide ;
- la Subscription commerciale devient `canceled` ;
- la baseline Free existante redevient l’offre effective ;
- `trialEndsAt` est conservé historiquement ;
- l’éligibilité déjà consommée n’est jamais restaurée ;
- un retour ultérieur vers un plan payant ne crée donc pas un nouveau trial pour cette identité.

### Réponse

```json
{
  "status": "success",
  "data": {
    "subscription": {
      "id": "...",
      "kind": "commercial",
      "status": "canceled",
      "currentPeriodEnd": "...",
      "trialEndsAt": "...",
      "effectiveSubscription": {
        "id": "...",
        "kind": "baseline",
        "status": "active"
      },
      "updatedAt": "..."
    }
  }
}
```

Le frontend doit refetch la vue consolidée après succès.

---

# 12. Programmer une résiliation en fin de période

## POST `/api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation`

**Autorisation :** owner-only  
**Statut de succès :** `200 OK`

### Body

Le body peut être omis.

```json
{
  "reason": "Motif facultatif"
}
```

`reason` :

- facultatif ;
- `null` accepté ;
- chaîne trimée ;
- 1 à 500 caractères lorsqu’une chaîne est fournie.

Le body est strict : tout champ inconnu est rejeté.

### Règles métier stabilisées

- la Subscription doit appartenir au workspace courant ;
- elle doit être `commercial` ;
- elle doit être `active` ;
- sa période contractuelle doit être encore ouverte ;
- une résiliation déjà programmée ne peut pas être programmée une seconde fois ;
- la Subscription reste `active` jusqu’à `currentPeriodEnd` ;
- `cancelAtPeriodEnd` devient `true` ;
- les droits commerciaux cessent temporellement à l’échéance même si le job de persistance est retardé.

### Réponse

```json
{
  "status": "success",
  "data": {
    "subscription": {
      "id": "...",
      "workspace": "...",
      "plan": "...",
      "kind": "commercial",
      "status": "active",
      "currentPeriodStart": "...",
      "currentPeriodEnd": "...",
      "trialEndsAt": "...",
      "cancelAtPeriodEnd": true,
      "billingInterval": "monthly",
      "currency": "EUR",
      "priceExclTaxMinor": 0,
      "provider": "manual",
      "updatedAt": "..."
    }
  }
}
```

---

# 13. Révoquer une résiliation programmée

## DELETE `/api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation`

**Autorisation :** owner-only  
**Body :** aucun  
**Statut de succès :** `200 OK`

### Règles métier stabilisées

- la Subscription doit appartenir au workspace courant ;
- elle doit encore être une Subscription commerciale `active` ;
- `cancelAtPeriodEnd` doit être `true` ;
- la période ne doit pas être terminée ;
- cette commande ne ressuscite jamais une Subscription déjà `canceled` ou `expired` ;
- `cancelAtPeriodEnd` repasse à `false`.

La réponse utilise le même DTO de cycle de vie que la programmation de résiliation, avec `cancelAtPeriodEnd: false`.

---

# 14. Programmer un downgrade

## POST `/api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade`

**Autorisation :** owner-only  
**Statut de succès :** `200 OK`

### Body

```json
{
  "targetPlanId": "507f1f77bcf86cd799439011"
}
```

Le body est strict.

### Règles métier stabilisées

- la Subscription doit appartenir au workspace courant ;
- elle doit être commerciale et `active` ;
- la période doit être encore ouverte ;
- aucune résiliation ne doit déjà être programmée ;
- aucun autre `scheduledChange` ne doit déjà exister ;
- le plan cible doit être différent ;
- le plan cible doit être actif ;
- le plan cible ne peut pas être Free ;
- la devise doit rester identique ;
- la périodicité reste identique ;
- `monthly ↔ yearly` n’est pas géré par ce contrat ;
- le prix catalogue cible doit être strictement inférieur au prix catalogue du plan actuel pour la même périodicité ;
- le changement prend effet à `currentPeriodEnd` ;
- aucun remboursement ni crédit automatique n’est calculé ;
- le prix et la devise cibles sont snapshotés au moment de la programmation ;
- un dépassement futur des limites du plan cible n’empêche pas la programmation du downgrade.

### Réponse

```json
{
  "status": "success",
  "data": {
    "subscription": {
      "id": "...",
      "workspace": "...",
      "plan": "...",
      "status": "active",
      "billingInterval": "monthly",
      "currentPeriodEnd": "...",
      "cancelAtPeriodEnd": false,
      "scheduledChange": {
        "type": "downgrade",
        "targetPlan": "...",
        "targetBillingInterval": "monthly",
        "targetCurrency": "EUR",
        "targetPriceExclTaxMinor": 0,
        "effectiveAt": "...",
        "requestedAt": "...",
        "requestedBy": "..."
      }
    }
  }
}
```

La réponse de cette commande est owner-only. Les snapshots commerciaux internes exposés ici ne doivent pas être confondus avec une facture ou une preuve de paiement.

---

# 15. Révoquer un downgrade programmé

## DELETE `/api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade`

**Autorisation :** owner-only  
**Body :** aucun  
**Statut de succès :** `200 OK`

### Règles métier stabilisées

- la Subscription doit appartenir au workspace courant ;
- elle doit être commerciale et `active` ;
- un `scheduledChange` doit exister ;
- ce changement doit être de type `downgrade` ;
- son échéance ne doit pas avoir été atteinte ;
- la révocation retire `scheduledChange` sans restaurer artificiellement d’anciennes données contractuelles.

La réponse utilise le DTO de downgrade avec :

```json
{
  "scheduledChange": null
}
```

---

## 16. Résiliation et downgrade sont mutuellement exclusifs

Le backend protège l’invariant suivant :

```text
cancelAtPeriodEnd = true
ET scheduledChange != null
```

ne doivent pas coexister sur la même Subscription.

Le frontend peut désactiver les actions incompatibles pour l’UX mais ne doit jamais considérer cette désactivation comme une validation métier suffisante.

Après chaque commande réussie, un refetch de la vue consolidée reste la source de vérité.

---

## 17. Remédiation et commandes Subscription

La vue Subscription est disponible pendant la remédiation afin de permettre à l’interface d’expliquer :

- le plan effectif ;
- les limites dépassées ;
- les actions permettant un retour à la conformité.

Les routes commerciales F3 ne sont pas protégées par le middleware général de blocage des mutations de workspace. Leur admissibilité est déterminée par les règles métier propres aux services Subscription.

Le frontend ne doit donc pas masquer systématiquement toute gestion de Subscription lorsque `accessMode === "remediation"`.

Exemple important : un workspace en remédiation à la suite d’un downgrade doit pouvoir conserver l’accès aux informations nécessaires pour comprendre et corriger son dépassement.

---

## 18. Erreurs HTTP à gérer

Le frontend doit piloter sa logique en priorité avec le statut HTTP et l’endpoint concerné, jamais par parsing du texte libre du message.

### `400 Bad Request`

Validation HTTP/Zod invalide :

- ObjectId invalide ;
- body incomplet ;
- valeur de `billingInterval` invalide ;
- champ inconnu dans un body strict ;
- `reason` invalide.

### `401 Unauthorized`

Authentification absente ou invalide.

### `403 Forbidden`

Exemples :

- absence de `subscription:read` pour la lecture ;
- commande commerciale appelée par un utilisateur qui n’est pas le rôle système `owner`.

### `404 Not Found`

Exemples :

- plan demandé introuvable/indisponible lorsqu’un service expose ce cas en 404 ;
- Subscription inexistante ;
- `subscriptionId` appartenant à un autre workspace.

### `409 Conflict`

Conflit avec l’état métier courant, par exemple :

- trial non disponible ou déjà consommé ;
- trial expiré ;
- Subscription commerciale incompatible avec l’action ;
- résiliation déjà programmée ;
- aucune résiliation à révoquer ;
- downgrade impossible ou déjà programmé ;
- échéance déjà atteinte ;
- modification concurrente détectée.

### `500 Internal Server Error`

Incohérence interne ou erreur technique. Le frontend ne doit pas tenter de réparer lui-même l’état métier.

---

## 19. Données explicitement hors contrat de lecture owner/admin

`GET /subscription` ne doit pas être utilisé pour obtenir :

- un moyen de paiement ;
- une identité de facturation ;
- un `providerCustomerId` ;
- un `providerSubscriptionId` ;
- une remise/coupon ;
- le montant réellement encaissé ;
- une taxe ;
- une facture ;
- un remboursement ;
- un crédit commercial ;
- une preuve de paiement.

Le fait qu’un modèle interne Subscription possède ou acquière de nouveaux champs ne les rend jamais publics automatiquement. Les DTO sont des projections explicites.

---

## 20. Séparation Subscription / Billing / Payment

Le frontend devra conserver trois responsabilités conceptuelles distinctes :

```text
Subscription
→ état du contrat d’accès et périodes

Billing
→ montants financiers, taxes, factures, crédits, remboursements

Payment
→ interaction avec le provider et preuve de paiement
```

F4 ne crée que le contrat frontend du premier domaine.

Les données futures Billing/Payment seront réservées au propriétaire du workspace ou, lorsqu’un modèle Organization existera, au représentant explicitement autorisé de l’organisation propriétaire.

Aucune permission générique administrable ne doit être supposée pour accéder à ces futures données.

---

## 21. Recommandation RTK Query

Les données Subscription sont des données serveur.

Structure cible :

```text
features/subscription/api/
```

La query principale devra représenter :

```text
GET /api/workspaces/:workspaceId/subscription
```

Les six commandes doivent être implémentées comme mutations RTK Query.

Recommandation de cache :

```text
Subscription + workspaceId
```

Après toute mutation réussie :

```text
invalidate/refetch Subscription(workspaceId)
```

Éviter les mises à jour optimistes complexes du cycle de vie Subscription. Les règles de fallback, de remédiation, de concurrence et de temporalité rendent un refetch serveur plus fiable qu’une reconstruction locale.

Le catalogue `/api/plans` peut conserver son propre cache car une mutation Subscription ne modifie pas le catalogue.

---

## 22. États UI à prévoir

Le frontend devra au minimum pouvoir représenter :

```text
loading
success
error
unauthenticated
forbidden
no commercial subscription
trial active
trial expired / no longer usable
commercial active
cancellation scheduled
downgrade scheduled
remediation
plan limits exceeded
subscription unavailable
```

Ces états sont des traductions UX. Ils ne deviennent jamais une machine d’état métier autonome côté client.

---

## 23. Ce que le frontend ne doit pas calculer

Le frontend ne doit pas :

- recalculer `trialEndsAt` depuis `trialDurationDays` ;
- prolonger un trial après un changement de plan ;
- déterminer seul la Subscription effective ;
- recalculer `currentPeriodEnd` ;
- appliquer lui-même un downgrade arrivé à échéance ;
- décider qu’une période active reste utilisable après sa borne temporelle ;
- transformer un dépassement de limites en statut Subscription ;
- calculer seul la remédiation ;
- calculer un prorata financier ;
- considérer `priceExclTaxMinor` comme montant réellement encaissé ;
- déduire un paiement du champ `provider` ;
- permettre à un admin de simuler une autorité commerciale owner-only.

---

## 24. Endpoints Subscription non exposés au frontend workspace

Les primitives internes et opérations plateforme ne doivent pas être appelées ou reproduites par le frontend workspace en inventant des URLs.

Ne font notamment pas partie de F4 :

- activation payante réelle après confirmation de paiement ;
- upgrade payant avec prorata ;
- changement `monthly ↔ yearly` ;
- annulation administrative immédiate ;
- jobs d’expiration de trial ;
- jobs de finalisation des résiliations ;
- jobs d’application des downgrades ;
- gestion de `past_due` liée au futur provider ;
- moyens de paiement ;
- factures ;
- remboursements ;
- webhooks Billing/Payment.

Ces éléments seront documentés uniquement lorsqu’un contrat HTTP réel les exposera.

---

## 25. Règle de maintenance de ce contrat

Ce document doit être modifié lorsqu’un comportement observable par le frontend Subscription change :

- nouvel endpoint ;
- endpoint supprimé ;
- méthode HTTP modifiée ;
- validation de paramètres/body modifiée ;
- rôle ou permission modifié ;
- statut HTTP modifié ;
- DTO modifié ;
- champ public ajouté/supprimé ;
- changement de règle d’entitlement visible par le frontend ;
- évolution du comportement de remédiation.

Un refactor interne, un changement de helper privé, une réorganisation des tests ou un changement de job sans effet sur le contrat HTTP ne nécessitent pas à eux seuls une nouvelle version de ce document.

---

## 26. Checkpoint F4

À la clôture de F4, le frontend peut considérer comme stabilisés les endpoints suivants :

```text
GET    /api/workspaces/:workspaceId/subscription
POST   /api/workspaces/:workspaceId/subscription/trial
POST   /api/workspaces/:workspaceId/subscription/trial/end-to-free
POST   /api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation
DELETE /api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation
POST   /api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade
DELETE /api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade
```

Le prochain domaine à cadrer après ce checkpoint est **Billing**, sans fusionner ses responsabilités avec Subscription.
