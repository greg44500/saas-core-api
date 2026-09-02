# SAAS-CORE-API — Contrat d’intégration frontend/backend Subscription

**Statut :** F8.6.2 stabilisé — F8.6.3 frontend en validation  
**Date :** 2 septembre 2026  
**Backend de référence :** `saas-core-api`  
**Frontend cible :** React + Vite, JavaScript, Tailwind CSS, shadcn/ui, Redux Toolkit, RTK Query

## 1. Objet

Ce document fige le contrat HTTP observable par le frontend pour le domaine **Subscription d’un workspace**.

Il couvre :

- le catalogue public des plans ;
- la lecture consolidée de la Subscription ;
- l’entitlement effectif ;
- l’éligibilité à la période d’essai ;
- le démarrage ou changement de plan pendant une période d’essai ;
- le retour volontaire vers Free pendant l’essai ;
- la programmation/révocation d’une résiliation ;
- la programmation/révocation d’un downgrade ;
- les règles owner/admin ;
- la frontière multi-tenant ;
- la remédiation liée aux limites de plan.

Ce contrat **n’est pas un contrat Billing/Payment**. Les moyens de paiement, factures, taxes, remboursements, crédits, webhooks provider et preuves d’encaissement restent hors de ce domaine.

---

## 2. Principes d’autorité

Le backend reste l’autorité pour :

- le statut contractuel d’une Subscription ;
- la Subscription qui fournit réellement les droits ;
- la validité temporelle d’une période commerciale ou d’un essai ;
- le fallback vers la baseline Free ;
- le mode `normal` ou `remediation` ;
- les limites bloquantes et non bloquantes ;
- l’éligibilité à la période d’essai ;
- la validité d’un changement de plan ;
- la validité d’une résiliation ou d’un downgrade ;
- les autorisations owner/admin ;
- l’appartenance d’une Subscription à un workspace.

Le frontend peut simplifier l’affichage et masquer les actions manifestement impossibles, mais cette logique reste uniquement une aide UX. Toute mutation doit accepter qu’une décision serveur la refuse si l’état a changé depuis la dernière lecture.

Après une mutation Subscription réussie, le frontend doit invalider/refetch la vue consolidée au lieu de reconstruire localement l’entitlement.

---

## 3. Architecture Subscription du workspace

Un workspace peut posséder simultanément :

```text
baseline
→ offre de référence permanente
→ actuellement le plan Free

commercial
→ période d’essai ou souscription payante
→ peut coexister avec la baseline
```

Valeurs de `kind` :

```text
baseline
commercial
```

Statuts :

```text
trialing
active
past_due
canceled
expired
```

`kind` et `status` sont deux notions distinctes. Le frontend ne doit pas les fusionner dans une machine d’état cliente autonome.

---

## 4. Entitlement effectif

Règle stabilisée :

```text
commercial active et temporellement utilisable
→ prioritaire

sinon commercial trialing avec trialEndsAt strictement futur
→ prioritaire

sinon baseline active
→ fallback
```

Un document commercial encore persisté avec `status = trialing` ou `status = active` peut ne plus fournir de droits lorsque son échéance temporelle est dépassée.

Le frontend doit utiliser `effectiveEntitlement` comme source de vérité des droits réellement applicables.

---

## 5. Catalogue public des plans

## GET `/api/plans`

Cette route alimente l’affichage des offres et tarifs catalogue.

Le DTO public est explicitement projeté par le backend. Un nouveau champ interne ajouté au modèle Plan n’est jamais exposé automatiquement.

### Exemple

```json
{
  "status": "success",
  "data": {
    "plans": [
      {
        "id": "...",
        "key": "premium",
        "name": "Premium",
        "description": "...",
        "displayOrder": 10,
        "currency": "EUR",
        "priceMonthlyExclTaxMinor": 7900,
        "priceYearlyExclTaxMinor": 79000,
        "trialEnabled": true,
        "trialDurationDays": 14,
        "features": [],
        "limits": {}
      }
    ]
  }
}
```

### Règle frontend F8.6.2

Le frontend ne doit jamais déduire qu’un plan possède une période d’essai à partir de sa clé (`premium`, `ai`, etc.).

Une action de démarrage d’essai peut être présentée uniquement lorsque :

```text
trialEnabled = true
ET trialDurationDays > 0
```

Ces données renseignent les caractéristiques du plan. Elles ne prouvent pas que l’identité courante est encore éligible : cette information provient de la vue Subscription du workspace.

---

## 6. Base URL Subscription workspace

Les routes Subscription workspace sont montées sous :

```text
/api/workspaces/:workspaceId/subscription
```

Toutes sont protégées par authentification.

`workspaceId` et `subscriptionId` sont des ObjectId MongoDB sous forme de 24 caractères hexadécimaux.

---

## 7. Matrice d’autorisation

| Action | Owner | Admin | Manager | Member | Reader |
| --- | ---: | ---: | ---: | ---: | ---: |
| Lire l’état Subscription | Oui | Oui | Non | Non | Non |
| Démarrer/changer un essai | Oui | Non | Non | Non | Non |
| Quitter l’essai vers Free | Oui | Non | Non | Non | Non |
| Programmer une résiliation | Oui | Non | Non | Non | Non |
| Révoquer une résiliation | Oui | Non | Non | Non | Non |
| Programmer un downgrade | Oui | Non | Non | Non | Non |
| Révoquer un downgrade | Oui | Non | Non | Non | Non |

La lecture utilise :

```text
subscription:read
```

Cette permission est attribuée aux rôles système `owner` et `admin`.

Les commandes commerciales n’utilisent pas une permission délégable : elles passent par `authorizeWorkspaceOwner`. Un rôle personnalisé ou un admin ne doit donc jamais être considéré comme habilité à engager, modifier ou résilier le contrat commercial.

---

## 8. Frontière multi-tenant

Pour les commandes utilisant `subscriptionId`, le backend vérifie :

```text
subscription._id = subscriptionId
ET subscription.workspace = workspaceId
```

Une Subscription d’un autre workspace est traitée comme introuvable dans le workspace courant.

Un identifiant de Subscription n’est jamais une preuve d’autorisation.

---

# 9. Lecture consolidée

## GET `/api/workspaces/:workspaceId/subscription`

**Autorisation :** `subscription:read`  
**Rôles système actuels :** owner, admin  
**Disponible en remédiation :** oui

### Exemple

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
      },
      "trialEligibility": {
        "consumed": false
      }
    }
  }
}
```

`commercial` peut être `null`.

### `trialEligibility`

F8.6.2 expose uniquement :

```json
{
  "consumed": true
}
```

Ce booléen permet au frontend de ne pas reproposer artificiellement un nouvel essai après consommation.

L’empreinte HMAC d’identité, l’email canonique et tout autre détail interne de `TrialEligibility` restent hors contrat public.

### DTO Plan dans cette vue

```json
{
  "id": "...",
  "key": "...",
  "name": "...",
  "features": [],
  "limits": {}
}
```

Cette vue ne réexpose pas les prix catalogue. `/api/plans` reste la source d’affichage des tarifs et conditions commerciales publiques.

### `scheduledChange`

Lorsqu’un downgrade est programmé :

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

Les champs internes de snapshot commercial et `requestedBy` ne sont pas exposés dans cette vue owner/admin.

---

## 10. `effectiveEntitlement`

Champs :

```text
plan
subscriptionKind
subscriptionStatus
accessMode
reason
blockingLimits
nonBlockingLimits
```

`accessMode` :

```text
normal
remediation
```

`remediation` signifie que le contrat est valide mais que la consommation actuelle dépasse une ou plusieurs limites bloquantes du plan effectif.

Limites actuellement bloquantes/réductibles :

```text
members
storage_bytes
```

Limite non bloquante globalement :

```text
file_uploads_monthly
```

Le frontend ne doit pas recalculer seul le mode de remédiation à partir du catalogue.

---

# 11. Démarrer ou changer une période d’essai

## POST `/api/workspaces/:workspaceId/subscription/trial`

**Autorisation :** owner-only  
**Succès :** `201 Created`

### Body

```json
{
  "planId": "507f1f77bcf86cd799439011",
  "billingInterval": "monthly"
}
```

`billingInterval` :

```text
monthly
yearly
```

Body strict.

### Règles

- Free ne peut pas recevoir de trial ;
- le plan doit être actif ;
- `trialEnabled` doit être `true` ;
- `trialDurationDays` doit être strictement positif ;
- aucun moyen de paiement n’est requis pendant l’essai ;
- l’éligibilité est consommée une seule fois par identité ;
- un essai en cours peut changer vers un autre plan éligible ;
- ce changement ne modifie jamais `trialEndsAt` ;
- une Subscription commerciale `active` ou `past_due` interdit l’ouverture d’un nouvel essai ;
- la baseline Free reste active en parallèle.

Après succès, le frontend invalide `WorkspaceSubscription(workspaceId)`.

---

# 12. Retour volontaire vers Free pendant l’essai

## POST `/api/workspaces/:workspaceId/subscription/trial/end-to-free`

**Autorisation :** owner-only  
**Body :** aucun  
**Succès :** `200 OK`

### Règles

- la Subscription commerciale doit être réellement `trialing` ;
- l’essai doit encore être temporellement valide ;
- la Subscription commerciale devient `canceled` ;
- la baseline Free redevient effective ;
- `trialEndsAt` est conservé historiquement ;
- l’éligibilité reste consommée définitivement.

L’interface doit avertir explicitement l’owner de cette irréversibilité avant confirmation.

---

# 13. Programmer une résiliation en fin de période

## POST `/api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation`

**Autorisation :** owner-only  
**Succès :** `200 OK`

### Body

Le body peut être vide.

```json
{
  "reason": "Motif facultatif"
}
```

`reason` :

- facultatif ;
- `null` accepté ;
- trimé ;
- 1 à 500 caractères lorsqu’une chaîne non vide est envoyée.

Body strict.

### Règles

- Subscription du workspace courant ;
- `kind = commercial` ;
- `status = active` ;
- période encore ouverte ;
- aucune résiliation déjà programmée ;
- la Subscription reste `active` jusqu’à `currentPeriodEnd` ;
- `cancelAtPeriodEnd` devient `true` ;
- les droits commerciaux cessent à l’échéance même si le job de persistance est retardé.

### UX F8.6.3

La date `currentPeriodEnd` doit être affichée avant confirmation. Le frontend ne doit pas présenter cette commande comme une interruption immédiate.

---

# 14. Révoquer une résiliation programmée

## DELETE `/api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation`

**Autorisation :** owner-only  
**Body :** aucun  
**Succès :** `200 OK`

### Règles

- Subscription commerciale `active` du workspace courant ;
- `cancelAtPeriodEnd = true` ;
- période non terminée ;
- ne ressuscite jamais une Subscription `canceled` ou `expired` ;
- `cancelAtPeriodEnd` repasse à `false`.

---

# 15. Programmer un downgrade

## POST `/api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade`

**Autorisation :** owner-only  
**Succès :** `200 OK`

### Body

```json
{
  "targetPlanId": "507f1f77bcf86cd799439011"
}
```

Body strict.

### Règles

- Subscription commerciale `active` du workspace courant ;
- période encore ouverte ;
- aucune résiliation programmée ;
- aucun autre `scheduledChange` ;
- plan cible différent et actif ;
- plan cible non Free ;
- même devise ;
- même périodicité ;
- `monthly ↔ yearly` hors de ce contrat ;
- prix catalogue cible strictement inférieur au plan actuel pour la même périodicité ;
- effet à `currentPeriodEnd` ;
- aucun remboursement/crédit/prorata calculé par Subscription ;
- prix et devise cibles snapshotés côté backend ;
- un dépassement futur des limites du plan cible n’empêche pas la programmation.

### UX F8.6.3

Le frontend peut filtrer le catalogue pour ne présenter que les plans manifestement moins chers, non Free et de même devise. Ce filtrage est uniquement une aide UX : le backend revalide toutes les règles au moment du POST.

La date d’effet doit être visible avant confirmation.

---

# 16. Révoquer un downgrade programmé

## DELETE `/api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade`

**Autorisation :** owner-only  
**Body :** aucun  
**Succès :** `200 OK`

### Règles

- Subscription commerciale `active` du workspace courant ;
- `scheduledChange.type = downgrade` ;
- échéance non atteinte ;
- la révocation retire `scheduledChange` sans recréer artificiellement un ancien état contractuel.

---

## 17. Résiliation et downgrade sont mutuellement exclusifs

L’état suivant ne doit jamais être considéré comme valide :

```text
cancelAtPeriodEnd = true
ET scheduledChange != null
```

Le frontend F8.6.3 masque les actions incompatibles pour rendre l’interface lisible, mais le backend conserve l’invariant de sécurité/métier.

Après programmation ou révocation, un refetch de la vue consolidée reste obligatoire.

---

## 18. Remédiation et commandes Subscription

La lecture Subscription reste disponible en remédiation afin d’expliquer :

- le plan effectif ;
- les limites dépassées ;
- les actions de retour à conformité.

Les commandes Subscription owner-only obéissent à leurs propres règles métier et ne doivent pas être masquées globalement uniquement parce que `accessMode === "remediation"`.

---

## 19. Erreurs HTTP à gérer

Le frontend pilote sa logique avec le statut HTTP et l’endpoint concerné, pas avec le parsing du texte libre.

### `400 Bad Request`

- ObjectId invalide ;
- body incomplet ;
- `billingInterval` invalide ;
- champ inconnu ;
- motif invalide.

### `401 Unauthorized`

Authentification absente ou invalide.

### `403 Forbidden`

- absence de `subscription:read` ;
- mutation appelée par un utilisateur non owner.

### `404 Not Found`

- plan introuvable/indisponible selon le service ;
- Subscription inexistante ;
- Subscription appartenant à un autre workspace.

### `409 Conflict`

- essai non disponible/déjà consommé/expiré ;
- Subscription incompatible avec l’action ;
- résiliation déjà programmée ;
- aucune résiliation à révoquer ;
- downgrade impossible/déjà programmé ;
- échéance atteinte ;
- modification concurrente.

### `500 Internal Server Error`

Erreur technique ou incohérence interne. Le frontend ne répare jamais lui-même l’état métier.

---

## 20. Données hors contrat de lecture owner/admin

`GET /subscription` n’expose pas :

- moyen de paiement ;
- identité de facturation ;
- `providerCustomerId` ;
- `providerSubscriptionId` ;
- coupon/remise ;
- montant réellement encaissé ;
- taxe ;
- facture ;
- remboursement ;
- crédit ;
- preuve de paiement.

Les DTO restent des projections explicites.

---

## 21. Séparation Subscription / Billing / Payment

```text
Subscription
→ contrat d’accès, plan, périodes et transitions

Billing
→ montants financiers, taxes, factures, crédits, remboursements

Payment
→ provider et preuve de paiement
```

F8.6 ne doit pas fusionner ces responsabilités.

---

## 22. RTK Query

Les données Subscription sont des données serveur.

Query principale :

```text
GET /api/workspaces/:workspaceId/subscription
```

Mutations workspace :

```text
POST   /trial
POST   /trial/end-to-free
POST   /:subscriptionId/cancellation
DELETE /:subscriptionId/cancellation
POST   /:subscriptionId/downgrade
DELETE /:subscriptionId/downgrade
```

Cache recommandé :

```text
WorkspaceSubscription + workspaceId
```

Après toute mutation réussie :

```text
invalidate/refetch WorkspaceSubscription(workspaceId)
```

Éviter les mises à jour optimistes complexes : fallback, temporalité, remédiation et concurrence rendent le refetch serveur plus fiable.

---

## 23. Répartition de state frontend

### RTK Query

Pour :

- catalogue Plans ;
- lecture Subscription ;
- mutations Trial/Cancellation/Downgrade.

### `useState`

Pour :

- ouverture/fermeture des dialogues ;
- motif facultatif de résiliation ;
- plan cible sélectionné ;
- feedback transitoire ;
- choix local de périodicité pendant l’essai.

Ces valeurs ne doivent pas être placées dans Redux global.

---

## 24. États UI minimum

```text
chargement
succès
erreur
interdit
aucune subscription commerciale
période d’essai active
essai expiré/non utilisable
commercial active
résiliation programmée
downgrade programmé
remédiation
limites dépassées
subscription indisponible
```

Les libellés visibles par l’utilisateur doivent être localisés en français. Les clés techniques (`trialing`, `downgrade`, etc.) restent internes au code/API et passent par une couche de présentation lorsqu’elles doivent être affichées.

---

## 25. Ce que le frontend ne calcule pas

Le frontend ne doit pas :

- recalculer `trialEndsAt` ;
- prolonger un essai après changement de plan ;
- déterminer seul la Subscription effective ;
- recalculer `currentPeriodEnd` ;
- appliquer un downgrade arrivé à échéance ;
- décider qu’une période reste valide après sa borne temporelle ;
- transformer un dépassement en statut Subscription ;
- calculer seul la remédiation ;
- calculer un prorata financier ;
- considérer un snapshot de prix comme montant encaissé ;
- déduire un paiement du provider ;
- accorder à un admin une autorité commerciale owner-only.

---

## 26. Endpoints non exposés au frontend workspace

Ne font pas partie de F8.6 :

- activation payante réelle après paiement ;
- upgrade payant avec prorata ;
- changement `monthly ↔ yearly` ;
- annulation administrative immédiate ;
- jobs d’expiration de trial ;
- jobs de finalisation des résiliations ;
- jobs d’application des downgrades ;
- gestion réelle de `past_due` liée au provider ;
- moyens de paiement ;
- factures ;
- remboursements ;
- webhooks Billing/Payment.

---

## 27. Outil de développement pour rejouer les essais

L’outil :

```text
npm run dev:reset-trial
```

est une commande d’exploitation de développement, pas un endpoint HTTP et pas une règle du contrat utilisateur.

Il ne doit jamais être reproduit dans le frontend.

Référence : `docs/development-trial-reset.md`.

---

## 28. Règle de maintenance

Mettre ce document à jour lorsqu’un comportement observable change :

- nouvel endpoint ;
- méthode HTTP ;
- validation params/body ;
- rôle/permission ;
- statut HTTP ;
- DTO public ;
- champ public ajouté/supprimé ;
- règle d’entitlement ;
- règle de remédiation ;
- comportement de transition commerciale.

Un refactor interne sans effet observable ne nécessite pas à lui seul une nouvelle version du contrat.

---

## 29. Checkpoint F8.6

### Stabilisé et validé

```text
GET    /api/plans
GET    /api/workspaces/:workspaceId/subscription
POST   /api/workspaces/:workspaceId/subscription/trial
POST   /api/workspaces/:workspaceId/subscription/trial/end-to-free
```

Le frontend F8.6.2 consomme également :

```text
trialEnabled
trialDurationDays
trialEligibility.consumed
```

### Backend stabilisé — frontend F8.6.3 en validation

```text
POST   /api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation
DELETE /api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation
POST   /api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade
DELETE /api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade
```

Aucune intégration Billing/Payment réelle n’est incluse dans ce checkpoint.
