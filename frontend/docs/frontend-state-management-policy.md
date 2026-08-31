# SAAS-CORE-API — Politique de gestion d’état Frontend

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1 et futurs modules métier

## 1. Objectif

Ce document fixe la politique de gestion d’état du frontend afin d’éviter :

- la multiplication des sources de vérité ;
- la duplication de données serveur dans des stores clients ;
- la création systématique de slices Redux ;
- la persistance navigateur non maîtrisée ;
- l’introduction de plusieurs bibliothèques concurrentes pour le même type d’état ;
- les désynchronisations entre URL, cache serveur, composants et état global client.

La règle directrice est : **chaque état doit appartenir au niveau le plus naturel et le plus restreint capable de le gérer correctement**.

## 2. Décision technologique

La stack retenue pour la gestion d’état est :

```text
React local state
+ URL / router state
+ form state dédié
+ Redux Toolkit
+ RTK Query
```

TanStack Query n’est pas utilisé parallèlement à RTK Query.

TanStack Query a été envisagé lors de cadrages antérieurs comme alternative de gestion du server state. La décision actuelle du projet retient RTK Query afin d’avoir une seule stratégie de cache serveur intégrée à Redux Toolkit. Une future réévaluation reste possible uniquement si un besoin concret démontre que RTK Query ne couvre plus correctement le besoin ; elle devra alors faire l’objet d’une décision d’architecture explicite.

## 3. Catégories d’état

Tout nouvel état doit être classé avant implémentation.

### 3.1 État serveur

Exemples :

```text
current user
workspaces
workspace
members
invitations
roles
permissions
plans
subscription
entitlement
files
audit logs
platform users
platform workspaces
```

Propriétaire : **RTK Query**.

RTK Query gère notamment :

- récupération ;
- cache ;
- partage entre composants ;
- loading/error state ;
- mutations ;
- invalidation ;
- refetch ;
- synchronisation avec l’API.

Règle : une donnée venant du backend ne doit pas être recopiée dans une slice Redux uniquement pour la rendre globale.

Mauvais flux :

```text
API
→ RTK Query
→ copie dans une slice Redux
→ composants
```

Flux attendu :

```text
API
→ RTK Query
→ composants
```

## 4. État global client

Propriétaire : **Redux Toolkit** uniquement lorsqu’un état est réellement transverse et client.

Une nouvelle slice Redux doit être justifiée par les questions suivantes :

1. l’état appartient-il au frontend plutôt qu’au backend ?
2. plusieurs zones éloignées de l’application en ont-elles réellement besoin ?
3. doit-il survivre au démontage d’un composant ?
4. ni l’URL, ni RTK Query, ni l’état local, ni le système de formulaire ne sont-ils une meilleure source de vérité ?

Si ces conditions ne sont pas remplies, une slice Redux ne doit pas être créée.

Redux Toolkit ne doit jamais devenir un entrepôt générique de tout l’état de l’application.

## 5. État local UI

Propriétaire : `useState` ou `useReducer`.

Exemples :

```text
modale ouverte/fermée
onglet local
section dépliée
mot de passe visible/masqué
état temporaire d’un composant
```

Un état limité à un composant ou à un petit sous-arbre ne doit pas être remonté artificiellement dans Redux.

`useReducer` est pertinent lorsqu’un état local possède plusieurs transitions liées ou une logique de transition plus claire sous forme de reducer.

## 6. État de navigation et URL

Propriétaire : le router et l’URL lorsque l’état doit être rechargeable, partageable ou navigable.

Exemples :

```text
workspaceId courant
page
recherche
tri
filtres partageables
onglet représentant une vraie sous-vue navigable
```

Exemple :

```text
/platform/users?page=2&status=active&search=greg
```

est préférable à la conservation de ces mêmes paramètres uniquement dans Redux lorsque l’utilisateur doit pouvoir recharger, partager, mettre en favori ou parcourir l’historique de cette vue.

### 6.1 Workspace courant

Pour les routes workspace, `:workspaceId` doit être la source de vérité du contexte navigué :

```text
/app/workspaces/:workspaceId/dashboard
/app/workspaces/:workspaceId/members
/app/workspaces/:workspaceId/files
```

Le workspace lui-même reste une donnée serveur chargée par RTK Query.

Une éventuelle préférence « dernier workspace utilisé » pourra être traitée séparément ; elle ne doit jamais entrer en compétition avec le `workspaceId` explicite de l’URL.

## 7. État de formulaire

L’état d’un formulaire ne doit pas être stocké dans Redux par défaut.

Exemples :

```text
valeurs saisies
erreurs de champs
dirty
touched
état de soumission
```

Un système de formulaire dédié sera retenu lors du cadrage correspondant.

Flux attendu :

```text
form state
→ validation client
→ mutation RTK Query
→ backend
→ invalidation ou mise à jour du cache serveur
```

La validation frontend améliore l’UX mais le backend reste l’autorité finale.

## 8. État dérivé

Un état calculable de manière fiable depuis une source de vérité existante ne doit pas être persisté comme une seconde source de vérité.

Exemple :

```text
permissions serveur
→ dérivation canInviteMembers
→ pas de stockage séparé de canInviteMembers dans Redux
```

Les dérivations partagées peuvent être centralisées dans un selector, helper ou hook selon leur niveau de responsabilité.

## 9. Persistance navigateur

La persistance dans `localStorage`, `sessionStorage` ou une autre API navigateur est **interdite par défaut**.

Toute exception doit documenter :

- la donnée persistée ;
- la raison de la persistance ;
- sa durée de vie ;
- son nettoyage ;
- son niveau de sensibilité ;
- le comportement en cas de valeur obsolète ou invalide.

Aucun secret ne doit être persisté côté client.

## 10. Authentification et tokens

Le contrat backend actuel sépare :

```text
access token
→ retourné dans le JSON

refresh token
→ cookie HttpOnly
```

### Refresh token

Le refresh token :

- n’appartient jamais au state React ou Redux ;
- ne doit jamais être lu par JavaScript ;
- reste dans le cookie HttpOnly géré selon le contrat backend.

### Access token

L’access token doit être conservé en mémoire et ne doit pas être persisté dans `localStorage`, `sessionStorage` ou IndexedDB.

Sa stratégie exacte de stockage mémoire et son intégration avec `baseApi` seront figées lors du lot Auth/session.

La suppression de l’état d’authentification local devra être gérée notamment après :

```text
logout
logout-all
change password
échec définitif du refresh
session devenue invalide
```

## 11. RTK Query — règles structurelles

Une base API centralisée sera créée pour le backend Core.

Organisation cible :

```text
services/api/
└── baseApi.js

features/auth/api/
features/workspaces/api/
features/members/api/
features/files/api/
features/subscription/api/
features/platform/api/
```

Les domaines injectent ou déclarent leurs endpoints selon l’architecture retenue, mais partagent la même politique de base API, d’authentification, d’erreurs et de cache.

Les composants React ne doivent pas disperser des appels `fetch()` directs lorsqu’un endpoint appartient à la couche API de l’application.

Les tags et invalidations doivent être définis par domaine et uniquement lorsque le besoin réel est connu.

## 12. TanStack Query

TanStack Query reste une solution techniquement valide de gestion du server state, mais elle n’est pas retenue dans l’architecture actuelle.

Règle : ne pas introduire simultanément TanStack Query et RTK Query pour des données du même backend sans décision d’architecture formelle.

Le projet doit éviter :

```text
deux caches serveur
deux systèmes d’invalidation
deux conventions de query keys/tags
deux stratégies de mutation et refetch
```

## 13. Matrice de décision

```text
Nouvel état
   │
   ▼
Vient-il du backend ?
   │
   ├─ oui → RTK Query
   │
   └─ non
       │
       ▼
Doit-il être dans l’URL ?
       │
       ├─ oui → Router / URL
       │
       └─ non
           │
           ▼
Est-ce un état de formulaire ?
           │
           ├─ oui → Form state
           │
           └─ non
               │
               ▼
Est-il local au composant ?
               │
               ├─ oui → useState / useReducer
               │
               └─ non
                   │
                   ▼
Est-il réellement global côté client ?
                   │
                   ├─ oui → Redux Toolkit
                   │
                   └─ non → reconsidérer la nécessité de le stocker
```

À chaque niveau, poser aussi la question :

```text
Peut-il être dérivé d’une source existante ?
→ oui : calculer, ne pas dupliquer.
```

## 14. Exemples de classement pour le Core

| État | Gestion recommandée |
| --- | --- |
| utilisateur courant | RTK Query |
| liste des workspaces | RTK Query |
| workspace courant | `workspaceId` URL + donnée RTK Query |
| membres du workspace | RTK Query |
| permissions | RTK Query puis dérivation |
| subscription / entitlement | RTK Query |
| fichiers | RTK Query |
| pagination d’une liste partageable | URL |
| filtre de statut partageable | URL |
| modale ouverte | `useState` |
| champ mot de passe visible | `useState` |
| valeurs de formulaire | form state |
| préférence UI réellement globale | Redux Toolkit si le besoin le justifie |
| refresh token | cookie HttpOnly, jamais state JS |
| access token | mémoire uniquement, stratégie Auth à figer |

## 15. Règle de revue

Toute PR ou modification introduisant un nouvel état global doit permettre de répondre clairement à :

```text
Quelle est la source de vérité ?
Pourquoi cet état doit-il être stocké ?
Pourquoi ce niveau de stockage est-il le bon ?
Existe-t-il déjà dans RTK Query, l’URL ou un parent local ?
Peut-il être dérivé ?
Doit-il être persisté ?
Comment est-il invalidé ou nettoyé ?
```

Une nouvelle slice Redux ou une nouvelle persistance navigateur sans justification explicite doit déclencher une revue d’architecture.

## 16. Principe final

La politique du projet est :

```text
server state        → RTK Query
navigation state    → URL / router
form state          → outil de formulaire dédié
local UI state      → useState / useReducer
global client state → Redux Toolkit, seulement si justifié
derived state       → calculé depuis la source
browser persistence → interdite par défaut
```

Cette politique constitue le garde-fou de référence pour tout le développement frontend du Core et des futurs modules métier.