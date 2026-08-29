# SAAS-CORE-API — Contrat d’intégration frontend / backend

**Statut :** document de référence d’intégration  
**Date de cadrage initial :** 24 août 2026  
**Dernière mise à jour :** 29 août 2026 — lot F4 Subscription stabilisé  
**Périmètre :** backend `saas-core-api` → futur frontend React/Vite  
**Frontend cible :** React + Vite, JavaScript exclusivement, Tailwind CSS, shadcn/ui, Redux Toolkit, RTK Query

## 1. Objet du document

Ce document définit le contrat d’intégration entre le backend saas-core-api et le futur frontend.

Il décrit uniquement les comportements backend déjà suffisamment stabilisés pour être consommés par une interface cliente :

conventions HTTP et JSON ;

authentification et gestion de session ;

workspaces et frontière multi-tenant ;

rôles et permissions ;

catalogue des plans ;

subscriptions, trials et entitlement effectif ;

fonctionnalités et quotas ;

upload de fichiers ;

principes de gestion des erreurs ;

responsabilités respectives du frontend et du backend.

Ce document ne définit pas le design visuel, les thèmes Tailwind, la configuration shadcn/ui, les layouts, la navigation finale, les pages métier futures ni les composants graphiques définitifs.

## 2. Principes d’intégration

Le backend reste l’autorité pour l’authentification, l’autorisation, les rôles et permissions, le statut des workspaces, les capacités des plans, les quotas, la validation définitive des données, la sécurité des fichiers, l’audit et les contraintes métier.

Le frontend peut effectuer des validations préalables pour améliorer l’expérience utilisateur, mais elles ne constituent jamais une barrière de sécurité.

Répartition cible de l’état :

useState
→ état strictement local au composant

Redux Toolkit
→ véritable état global client

RTK Query
→ données et état provenant du serveur

Les ressources comme l’utilisateur courant, les workspaces, les membres, les plans, les subscriptions, l’entitlement effectif et les fichiers doivent être traitées comme des données serveur et consommées via RTK Query.

Le frontend ne doit pas dupliquer dans Redux Toolkit une donnée déjà détenue et mise en cache par RTK Query.

## 3. Base URL actuelle

Les routes applicatives sont montées sous :

/api

Principaux préfixes actuels :

/api/auth
/api/plans
/api/workspaces
/api/workspaces/:workspaceId/files
/api/platform
/api/health

Le contrat HTTP Subscription du workspace est désormais exposé et stabilisé sous `/api/workspaces/:workspaceId/subscription`. Le détail normatif des endpoints, validations, permissions, DTO et erreurs est maintenu dans `docs/frontend-backend-subscription-contract.md`. Le frontend ne doit pas inventer d’autres routes Subscription en dehors de ce contrat.

Le frontend ne doit pas reconstruire les URLs de manière dispersée dans les composants. La future configuration RTK Query devra centraliser la baseUrl.

## 4. Conventions de réponse

Succès avec données

{
  "status": "success",
  "data": {}
}

Exemples : data.user, data.workspace, data.workspaces, data.members, data.plans, data.file.

Succès sans contenu

Certaines opérations retournent 204 No Content, notamment logout, logout-all et change-password. Le frontend ne doit pas tenter de parser du JSON après une réponse 204.

Succès avec message

Certains workflows publics retournent :

{
  "status": "success",
  "message": "..."
}

## 5. Conventions d’erreur

Une erreur opérationnelle expose généralement :

{
  "status": "fail",
  "message": "Message exploitable par le client"
}

Une erreur technique non opérationnelle en production expose :

{
  "status": "error",
  "message": "Une erreur interne est survenue"
}

Le frontend doit s’appuyer en priorité sur le statut HTTP et le contrat de l’endpoint. Il ne doit pas construire de logique métier en analysant le texte libre de message.

En développement, le backend peut exposer une propriété stack. Elle ne fait pas partie du contrat frontend de production.

## 6. Authentification

Préfixe :

/api/auth

Inscription

POST /api/auth/register

Réponse de succès :

201 Created

{
  "status": "success",
  "data": {
    "user": {
      "id": "...",
      "firstName": "...",
      "lastName": "...",
      "email": "...",
      "emailVerifiedAt": null
    }
  }
}

L’inscription ne crée pas automatiquement un workspace.

Login

POST /api/auth/login

Réponse :

200 OK

{
  "status": "success",
  "data": {
    "user": {
      "id": "...",
      "firstName": "...",
      "lastName": "...",
      "email": "...",
      "emailVerifiedAt": null
    },
    "accessToken": "..."
  }
}

Le backend utilise deux credentials distincts :

access token
→ retourné dans le JSON

refresh token
→ cookie HttpOnly
→ jamais retourné dans le JSON

Le frontend ne doit jamais chercher à lire le refresh token depuis JavaScript.

## 7. Access token et refresh

Les routes protégées utilisent :

Authorization: Bearer <accessToken>

Le refresh s’effectue via :

POST /api/auth/refresh

Cette route ne dépend pas d’un access token valide. Elle lit le refresh token depuis le cookie HttpOnly, effectue une rotation et retourne un nouvel access token.

Réponse :

{
  "status": "success",
  "data": {
    "user": {
      "id": "...",
      "firstName": "...",
      "lastName": "...",
      "email": "...",
      "emailVerifiedAt": null
    },
    "accessToken": "..."
  }
}

La future couche RTK Query devra centraliser :

requête API
→ access token refusé / expiré
→ tentative de refresh
→ nouvel access token
→ répétition contrôlée de la requête initiale

Il faudra éviter que plusieurs requêtes simultanées déclenchent des refresh concurrents non coordonnés.

## 8. Utilisateur courant

GET /api/auth/me

Route protégée.

Réponse :

{
  "status": "success",
  "data": {
    "user": {
      "id": "...",
      "firstName": "...",
      "lastName": "...",
      "email": "...",
      "emailVerifiedAt": null
    }
  }
}

## 9. Logout

Session courante :

POST /api/auth/logout

Réponse :

204 No Content

Toutes les sessions :

POST /api/auth/logout-all

Route protégée.

Réponse :

204 No Content

## 10. Changement de mot de passe

POST /api/auth/change-password

Route protégée.

Après changement du mot de passe, les sessions existantes sont révoquées et le cookie refresh est supprimé.

Réponse :

204 No Content

Le frontend doit considérer l’utilisateur comme déconnecté après succès et demander une nouvelle authentification.

## 11. Mot de passe oublié / reset

Demande :

POST /api/auth/forgot-password

Validation d’un nouveau mot de passe :

POST /api/auth/reset-password

Le token de reset est à usage unique et n’est jamais persisté en clair côté backend.

Après reset réussi, les sessions existantes sont invalidées.

## 12. Workspaces

Un utilisateur peut avoir accès à plusieurs workspaces. Le login ne choisit pas automatiquement le workspace courant.

Le frontend devra donc prévoir un sélecteur de workspace lorsque plusieurs workspaces sont accessibles.

Toute ressource tenant-scoped doit être consommée dans le contexte explicite du workspace courant.

Exemples actuels :

GET /api/workspaces

GET /api/workspaces/:workspaceId

PATCH /api/workspaces/:workspaceId

GET /api/workspaces/:workspaceId/members

La réponse de listing des membres utilise une pagination serveur et contient un objet `meta`.

## 13. Rôles et permissions

Les rôles système connus comprennent notamment :

owner
admin
manager
member
reader

Exemples de permissions actuellement utilisées :

workspace:read
workspace:update
member:read
subscription:read
file:upload

`subscription:read` est actuellement attribuée aux rôles système owner et admin. Les commandes commerciales Subscription ne reposent pas sur une permission délégable : elles sont protégées par une barrière owner-only indépendante des permissions administrables.

Le frontend peut adapter l’interface selon les permissions, mais cela reste uniquement une couche UX. Le backend effectue toujours la protection réelle.

## 14. Catalogue des plans

`GET /api/plans`

Route publique.

Réponse :

```json
{
  "status": "success",
  "data": {
    "plans": [
      {
        "id": "...",
        "key": "...",
        "name": "...",
        "description": "...",
        "displayOrder": 0,
        "trialEnabled": true,
        "trialDurationDays": 14,
        "currency": "EUR",
        "priceMonthlyExclTaxMinor": 0,
        "priceYearlyExclTaxMinor": 0,
        "features": [],
        "limits": {}
      }
    ]
  }
}
```

Les prix sont exprimés en unités monétaires mineures.

Exemple : `1299` → `12,99 EUR`.

Le frontend doit formater l’affichage à partir du montant mineur et de `currency`. Il ne doit jamais utiliser des nombres décimaux comme source de vérité monétaire.

`trialEnabled` indique si le plan est éligible à un trial. `trialDurationDays` décrit la durée catalogue proposée par le plan ; cette valeur ne doit jamais être utilisée par le frontend pour recalculer la fin d’un trial déjà accordé. Pour un trial concret, seule la Subscription retournée par le backend fait autorité.

## 15. Architecture Subscription stabilisée

Le backend distingue désormais deux rôles de Subscription dans un workspace :

```text
baseline
→ offre de référence permanente du workspace
→ actuellement le plan Free

commercial
→ offre commerciale en trial ou payante
→ peut coexister avec la baseline
```

La baseline Free n’est pas supprimée lorsqu’un workspace démarre un trial ou active un plan payant. Elle sert de fallback lorsque plus aucune Subscription commerciale utilisable ne fournit les droits effectifs.

Le frontend ne doit donc pas modéliser le workspace avec un unique champ conceptuel « abonnement courant » qui écraserait l’historique ou la baseline. L’API publique workspace expose désormais explicitement :

- la Subscription `baseline` ;
- la Subscription `commercial` ;
- l’entitlement effectif calculé par le backend.

Les valeurs de `kind` stabilisées sont :

```text
baseline
commercial
```

Les principaux statuts stabilisés sont :

```text
trialing
active
past_due
canceled
expired
```

`kind` décrit le rôle de la Subscription. `status` décrit son état dans son cycle de vie. Ces deux notions ne doivent pas être confondues dans le frontend.

## 16. Entitlement effectif du workspace

L’entitlement correspond au plan dont les features et limites sont réellement applicables au workspace à l’instant de la requête.

Règle actuellement stabilisée :

```text
commercial active et temporellement utilisable
→ prioritaire

sinon commercial trialing avec trialEndsAt strictement futur
→ prioritaire

sinon baseline active
→ fallback
```

Un trial dont `trialEndsAt` est atteint ou dépassé ne peut plus fournir de droits commerciaux, même si un job de réconciliation n’a pas encore persisté son statut `expired`.

Cette règle est fondamentale : **le frontend ne décide jamais qu’un trial est encore utilisable**. Il peut afficher un compte à rebours ou une date informative, mais la décision d’accès reste exclusivement backend.

De même, le frontend peut masquer ou désactiver une fonctionnalité pour améliorer l’UX, mais il doit toujours accepter qu’une requête soit refusée par le backend si l’entitlement a changé entre-temps.

## 17. Trial commercial

Un trial concerne uniquement une Subscription `commercial`. Le plan Free ne bénéficie jamais d’un trial.

Règles métier stabilisées :

- un plan doit être actif et explicitement éligible au trial ;
- aucun moyen de paiement n’est requis pour démarrer le trial ;
- l’éligibilité est consommée une seule fois par identité ;
- changer de plan éligible pendant un trial ne réinitialise jamais `trialEndsAt` ;
- un transfert d’ownership du workspace ne recrée pas et ne prolonge pas le trial ;
- un retour volontaire vers Free pendant le trial met fin définitivement à ce trial ;
- à l’expiration naturelle, la Subscription commerciale devient `expired` lors de la réconciliation persistante et l’entitlement retombe sur la baseline Free ;
- `trialEndsAt` reste une donnée historique et n’est pas réécrite pour simuler une prolongation.

Le frontend ne doit pas recalculer `trialEndsAt` à partir de `trialDurationDays`, ni considérer un changement de plan comme un nouveau trial.

## 18. Activation payante pendant un trial

Un utilisateur peut choisir de devenir payant avant la fin de son trial. La transition métier stabilisée est :

```text
commercial / trialing
→ paiement confirmé par la couche de paiement
→ commercial / active
```

Le plan payant activé peut être différent du plan testé pendant le trial.

La date réelle de confirmation du paiement (`paidAt`) devient l’origine du cycle contractuel :

```text
currentPeriodStart = paidAt
```

`currentPeriodEnd` est calculé selon la périodicité choisie :

```text
monthly → même ancrage calendaire le mois suivant
yearly  → même ancrage calendaire l’année suivante
```

Le backend gère les cas calendaires particuliers, notamment les fins de mois et les années bissextiles. Le frontend ne doit pas calculer lui-même la prochaine échéance contractuelle.

Lors de l’activation payante :

- `status` devient `active` ;
- `billingInterval` devient `monthly` ou `yearly` ;
- `currency` est snapshotée depuis le Plan ;
- `priceExclTaxMinor` est snapshoté depuis le tarif catalogue correspondant au moment de l’activation ;
- `trialEndsAt` est conservé comme donnée historique ;
- l’éligibilité au trial reste consommée ;
- la baseline Free reste présente mais n’est plus l’entitlement effectif.

Le prix exact des offres n’est pas encore figé. Le frontend ne doit donc jamais coder en dur les montants commerciaux : il doit toujours utiliser les valeurs retournées par l’API.

Le montant réellement encaissé, les remises, coupons, proratas, taxes, factures et références du provider appartiendront au futur domaine Billing/Payment et ne doivent pas être déduits de `priceExclTaxMinor` seul.

## 19. Contrat public Subscription désormais exposé

Le contrat HTTP workspace est désormais stabilisé sous :

```text
GET    /api/workspaces/:workspaceId/subscription
POST   /api/workspaces/:workspaceId/subscription/trial
POST   /api/workspaces/:workspaceId/subscription/trial/end-to-free
POST   /api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation
DELETE /api/workspaces/:workspaceId/subscription/:subscriptionId/cancellation
POST   /api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade
DELETE /api/workspaces/:workspaceId/subscription/:subscriptionId/downgrade
```

Le contrat détaillé de ces routes est maintenu dans `docs/frontend-backend-subscription-contract.md`.

Les DTO de mutation owner-only peuvent exposer des snapshots contractuels tels que `currency`, `priceExclTaxMinor` ou `provider`, mais ces champs ne constituent ni une preuve de paiement ni une API Billing. La lecture consolidée owner/admin filtre volontairement les données financières/provider.

Règles frontend :

- traiter les dates comme des données serveur ;
- ne pas dériver un droit d’accès uniquement depuis `status` ou `trialEndsAt` ;
- ne pas supposer que `priceExclTaxMinor` représente le montant final encaissé ;
- ne pas supposer que `provider` restera `manual` ;
- ne pas supprimer visuellement la baseline simplement parce qu’une Subscription commerciale existe.

## 20. Features et limites des plans

Chaque plan expose :

{
  "features": [],
  "limits": {}
}

Exemples actuels de métriques :

members
storage_bytes
file_uploads_monthly

Une feature répond à la question : « le plan autorise-t-il cette capacité ? »

Une limite répond à la question : « quelle quantité de cette ressource peut être consommée ? »

Le frontend peut afficher ces informations, mais la validation réelle reste côté backend.

## 21. Upload de fichiers

Endpoint actuel :

POST /api/workspaces/:workspaceId/files

Content-Type :

multipart/form-data

Champ fichier :

file

Ordre de protection backend :

authenticate
→ validation workspaceId
→ chargement du contexte workspace
→ permission file:upload
→ vérification de la feature du plan
→ Multer
→ validation des métadonnées multipart
→ inspection et persistance

Le pipeline backend comprend notamment :

taille maximale ;

MIME déclaré ;

type réel ;

cohérence extension / MIME / contenu ;

scan antivirus ;

checksum ;

quotas du plan ;

stockage physique ;

persistance MongoDB ;

AuditLog.

Le frontend peut filtrer la sélection de fichiers pour l’UX, mais ne remplace jamais ces contrôles.

## 22. Réponse d’un upload réussi

201 Created

{
  "status": "success",
  "data": {
    "file": {
      "id": "...",
      "originalName": "...",
      "mimeType": "...",
      "extension": "...",
      "sizeBytes": 0,
      "category": "...",
      "status": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}

Le contrat public n’expose pas les informations physiques internes de stockage.

## 23. Rejets d’upload

Fichier trop volumineux

413 Payload Too Large

{
  "status": "fail",
  "message": "Le fichier dépasse la taille maximale autorisée."
}

Ce rejet est audité côté backend avec :

FILE_UPLOAD_REJECTED
reason = FILE_TOO_LARGE

Une panne de l’AuditLog ne transforme pas ce rejet en succès.

Type MIME déclaré non autorisé

Le filtrage préliminaire peut répondre :

415 Unsupported Media Type

{
  "status": "fail",
  "message": "Le type de fichier déclaré n’est pas autorisé."
}

Le backend effectue ensuite une inspection du contenu réel pour les fichiers admis par ce premier filtre.

Quotas

Le backend peut refuser l’upload lorsque les limites du plan sont atteintes. Le frontend doit considérer ce refus comme une décision serveur autoritaire.

## 24. AuditLog

L’AuditLog est un mécanisme backend. Le frontend ne doit pas créer directement les événements d’audit correspondant aux opérations métier classiques.

Exemples actuels :

LOGIN_FAILED
PASSWORD_RESET_COMPLETED
SESSION_REUSE_DETECTED
WORKSPACE_CREATED
FILE_UPLOADED
FILE_UPLOAD_REJECTED

Une future interface d’administration pourra consulter les événements uniquement lorsqu’une API dédiée existera.

Aucun endpoint frontend de consultation des AuditLogs n’est défini dans ce contrat à ce stade.

## 25. Multi-tenant : règle fondamentale

Toute ressource appartenant à un workspace doit être consommée dans le contexte du workspace courant.

Le frontend devra donc disposer conceptuellement d’un :

currentWorkspaceId

mais ce choix client ne constitue jamais une preuve d’accès.

Le backend revalide à chaque requête :

le workspace ;

l’utilisateur ;

le membership ;

le rôle ;

les permissions ;

le statut du workspace.

Pour les commandes Subscription utilisant un `subscriptionId`, le backend vérifie en plus que cette Subscription appartient au `workspaceId` courant avant toute transition métier.

## 26. Statut du workspace

Un workspace peut devenir indisponible indépendamment de l’état affiché dans le frontend.

Le frontend devra pouvoir réagir à un refus serveur en invalidant les données concernées, affichant l’état indisponible et proposant éventuellement un retour au sélecteur de workspaces.

## 27. Contrat RTK Query futur

La couche API devra être centralisée et organisée par domaines, par exemple :

services/api/
└── baseApi.js

features/auth/api/
features/workspaces/api/
features/plans/api/
features/subscription/api/
features/files/api/

Le domaine `features/subscription/` peut désormais consommer le contrat stabilisé décrit dans `docs/frontend-backend-subscription-contract.md`. Un futur domaine `features/billing/` devra rester distinct et sera introduit lorsque le contrat Payment/Billing sera stabilisé.

Les composants React ne doivent pas appeler fetch() directement de manière dispersée.

RTK Query devra gérer :

requêtes ;

mutations ;

cache ;

invalidation ;

loading ;

erreurs serveur ;

refetch.

Pour Subscription, après une mutation réussie, la stratégie recommandée est d’invalider/refetch la vue consolidée du workspace plutôt que de reconstruire localement le fallback, la temporalité ou la remédiation.

## 28. Cookies et navigateur

Le refresh token étant dans un cookie HttpOnly, les appels dépendant de ce cookie devront être configurés de manière compatible avec l’envoi des credentials navigateur.

La configuration exacte dépendra de l’environnement frontend/backend et de la politique CORS finale. Elle devra être traitée dans la couche API, jamais composant par composant.

## 29. États UI exigés par le contrat backend

Chaque feature consommatrice devra prévoir au minimum :

idle
loading
success
empty
error
forbidden
unauthenticated

Selon le contexte :

workspace unavailable
plan feature unavailable
quota reached
trial expired
subscription unavailable
payment required
validation rejected
remediation
cancellation scheduled
downgrade scheduled

La traduction graphique de ces états appartiendra au futur design system Tailwind + shadcn/ui.

## 30. Données sensibles

Le frontend ne doit jamais attendre du backend :

passwordHash ;

refresh token brut ;

token de reset stocké ;

chemins de fichiers internes ;

secrets ;

données techniques antivirus sensibles ;

données internes AuditLog non explicitement exposées ;

moyens de paiement ou identifiants Billing/Payment via la lecture Subscription owner/admin.

Une absence de champ sensible doit être considérée comme intentionnelle.

## 31. Contrats non encore figés

Ne doivent pas encore être considérés comme des contrats frontend définitifs :

administration globale ;

interface complète AuditLog ;

invitations ;

gestion avancée des rôles ;

mutation des plans ;

activation payante HTTP réelle après confirmation de paiement ;

upgrade payant avec prorata ;

changement de périodicité monthly/yearly ;

cycle `past_due` définitif ;

billing externe, moyens de paiement, factures et webhooks ;

listing / téléchargement / suppression complet des fichiers ;

organisations ;

notifications ;

API keys ;

webhooks ;

fonctionnalités métier propres aux futurs SaaS utilisant ce core.

Le frontend ne doit pas être conçu aujourd’hui autour d’endpoints supposés pour ces fonctionnalités.

## 32. Stabilisation F4 — Subscription workspace

Le lot F4 fige désormais comme contrat frontend observable :

- la lecture consolidée baseline/commercial/effectiveEntitlement ;
- `subscription:read` pour owner/admin ;
- les commandes commerciales owner-only non délégables ;
- le démarrage/changement d’un trial ;
- le retour volontaire vers Free pendant un trial ;
- la résiliation programmée et sa révocation ;
- le downgrade programmé et sa révocation ;
- la vérification multi-tenant `workspaceId + subscriptionId` ;
- `accessMode`, `blockingLimits` et `nonBlockingLimits` ;
- la séparation stricte entre Subscription et le futur domaine Billing/Payment.

Le document normatif spécialisé est :

```text
docs/frontend-backend-subscription-contract.md
```

## 33. Règle de maintenance

Ce document doit évoluer uniquement lorsqu’un contrat observable par le frontend change.

Nécessitent une mise à jour :

nouvel endpoint
endpoint supprimé
payload modifié
statut HTTP modifié
nouveau champ public
nouveau mécanisme d’authentification
nouvelle convention d’erreur
nouvelle permission exposée au frontend

Ne nécessitent normalement pas de mise à jour :

refactor interne de service
nouveau helper privé
réorganisation de tests
