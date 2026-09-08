# SAAS-CORE-API — Contrat D-020 : invitations commerciales et offres privées

**Statut :** EN COURS  
**Date :** 2026-09-08  
**Périmètre :** Core clonable

## 1. Objet

D-020 fournit un mécanisme générique permettant à la Plateforme de proposer une offre commerciale privée à une personne qui ne possède encore aucun rattachement Workspace courant dans le SaaS, puis de créer son premier workspace lors de l'acceptation.

Ce domaine ne remplace ni l'authentification, ni les invitations d'équipe Platform, ni les invitations de membres d'un workspace.

## 2. Frontières de domaine

```text
PlatformInvitation != CommercialInvitation != WorkspaceInvitation
```

- `PlatformInvitation` intègre un collaborateur interne à l'équipe Platform.
- `WorkspaceInvitation` ajoute un membre dans un workspace existant.
- `CommercialInvitation` propose un Plan privé dans un parcours d'acquisition initiale et crée le premier workspace du bénéficiaire.

`CommercialInvitation` ne cible jamais un workspace existant. Les ajustements commerciaux d'un workspace existant utilisent les mécanismes `Subscription` et `EntitlementOverride` déjà prévus.

## 3. Bénéficiaire éligible

L'existence d'un compte Auth ne suffit pas à interdire D-020.

Un bénéficiaire est admissible lorsque :

- aucun compte n'existe encore pour son email canonical ; ou
- un `User` existe déjà, mais ne possède aucun `WorkspaceMember` `active` ou `suspended`.

Un utilisateur déjà rattaché à un workspace actif/suspendu est refusé. Cette règle est vérifiée à la création de l'invitation lorsqu'un User existe déjà et de nouveau lors de l'acceptation.

## 4. Offre privée

Une invitation commerciale cible uniquement un `Plan` :

- `status = active` ;
- `isPublic = false` ;
- `systemRole = null` ;
- fonctionnalités et limites explicitement définies.

Le catalogue utilisateur public reste filtré côté backend sur :

```text
status = active
isPublic = true
```

Un Plan privé Découverte ne doit donc jamais être envoyé au sélecteur public des plans disponibles.

Une offre privée peut être gratuite sans devenir la baseline. `EntitlementOverride` reste réservé aux exceptions individuelles et ne représente pas une offre réutilisable.

## 5. Contrats temporels Subscription

Une Subscription distingue explicitement :

```text
fixed
open_ended
```

### 5.1 `fixed`

Utilisé lorsqu'une échéance existe. Une Subscription commerciale active `fixed` doit posséder une `currentPeriodEnd` valide.

Un vrai trial est :

```text
termType = fixed
status = trialing
trialEndsAt = date future
currentPeriodEnd = trialEndsAt
```

### 5.2 `open_ended`

D-020 autorise `open_ended` uniquement pour un accès commercial durable :

- gratuit ;
- `status = active` ;
- `billingInterval = none` ;
- `provider = manual` ;
- `currentPeriodEnd = null` ;
- `trialEndsAt = null` ;
- `cancelAtPeriodEnd = false` ;
- sans consommation de `TrialEligibility`.

Le resolver vérifie l'ensemble de ces invariants avant de reconnaître une commerciale `open_ended`. Une configuration incohérente retombe sur la baseline au lieu d'accorder des droits permanents.

Une `open_ended` ne peut pas être résiliée « en fin de période », puisqu'elle n'en possède pas. Elle peut être annulée immédiatement via le lifecycle prévu.

## 6. Migration `termType`

Les Subscriptions historiques peuvent précéder le champ `termType`. D-020 fournit une migration dédiée et idempotente :

```bash
npm run migration:subscription-term-type
```

Précondition : `migration:subscription-kind` déjà appliquée.

Backfill :

```text
kind = baseline   → termType = open_ended
kind = commercial → termType = fixed
```

La migration refuse de deviner pour une Subscription sans `termType` dont `kind` est absent ou inconnu.

Ordre opérationnel de référence :

```text
1. subscription-kind déjà appliquée
2. migration:subscription-term-type
3. déployer / activer le code D-020
4. npm run seed:platform-roles
```

## 7. Invitation et durée de l'offre

L'expiration de `CommercialInvitation` protège uniquement le lien d'onboarding :

```text
invitation.expiresAt != subscription.currentPeriodEnd
```

Une invitation temporaire peut donc créer un accès gratuit durable.

La création conserve également un `reason` administratif obligatoire expliquant pourquoi l'accès privé est accordé. Ce motif reste interne à l'administration et à l'audit ; il n'est pas exposé dans la preview publique.

## 8. Sécurité du secret

- secret généré avec `crypto.randomBytes(32)` ;
- seule son empreinte SHA-256 est persistée ;
- aucun secret brut dans AuditLog ;
- resend = nouveau secret, nouveau hash et invalidation immédiate de l'ancien lien ;
- révocation d'une invitation pending interdit son acceptation ;
- preview et accept sont rate-limités ;
- le token est envoyé dans le body HTTP des appels API, jamais dans un path.

Le lien email utilise :

```text
/commercial-invitations/accept#token=<secret>
```

Le fragment URL n'est pas transmis au serveur HTTP par le navigateur. Le frontend doit le lire, conserver le secret uniquement le temps du parcours, puis nettoyer immédiatement l'URL avec `history.replaceState`.

Le secret ne doit jamais être placé dans Redux persistant, localStorage, des logs ou une query string.

## 9. Preview publique

`POST /api/commercial-invitations/preview` :

- est public mais rate-limité ;
- reçoit le token dans le body ;
- exige une validation Zod stricte ;
- revalide le Plan et le snapshot ;
- ne renvoie ni email du bénéficiaire ni motif administratif.

Une modification significative du Plan après l'envoi rend l'invitation non acceptable et impose une nouvelle invitation.

## 10. Autorité utilisateur

L'acceptation ne crée jamais de mot de passe et ne contourne pas Auth.

Le bénéficiaire :

1. utilise le workflow Auth normal ;
2. s'inscrit si nécessaire ou se connecte à un compte existant sans workspace ;
3. revient sur le parcours D-020 ;
4. accepte avec une session authentifiée ;
5. l'email canonical du User doit correspondre exactement à l'invitation.

Le service recharge aussi le `User` dans la transaction et exige `status = active`. Une désactivation concurrente après le middleware `authenticate` ne peut donc pas créer un tenant.

## 11. Snapshot de proposition

`offerSnapshot` conserve :

- nom du Plan ;
- devise ;
- périodicité ;
- prix ;
- configuration trial ;
- fonctionnalités ;
- limites.

Avant resend, preview et accept, le backend compare les conditions significatives avec le Plan courant. Un simple renommage reste autorisé ; une modification de prix, trial, périodicité, fonctionnalités ou limites impose une nouvelle invitation.

La Subscription et le Plan restent l'autorité runtime après acceptation.

## 12. Acceptation atomique

L'acceptation appartient à une transaction MongoDB unique :

1. rechargement du User et validation `active` ;
2. validation conditionnelle de l'invitation `pending` et non expirée ;
3. correspondance email canonical ;
4. absence de membership Workspace `active` ou `suspended` ;
5. revalidation du Plan et du snapshot ;
6. précontrôle `TrialEligibility` avant provisioning pour un vrai trial ;
7. création Workspace ;
8. création des rôles système ;
9. création du membership owner ;
10. création de la Subscription baseline ;
11. réservation de la métrique `members` pour l'owner ;
12. création de la Subscription commerciale ;
13. consommation de `TrialEligibility` uniquement pour un vrai trial ;
14. transition conditionnelle de l'invitation vers `accepted` ;
15. audits.

L'index unique de `TrialEligibility` et la transition conditionnelle de l'invitation restent les derniers gardes contre les courses concurrentes.

Tout échec annule l'ensemble.

## 13. Permissions Platform

Permissions dédiées :

```text
platform:commercial_invitations:read
platform:commercial_invitations:create
platform:commercial_invitations:resend
platform:commercial_invitations:revoke
```

Aucune route D-020 n'utilise `TEAM_*` comme substitut.

Les presets système délèguent ces permissions au `super_admin`, au `platform_admin` et au `commercial_support` selon leur rôle. Après déploiement du code, `npm run seed:platform-roles` resynchronise uniquement les rôles système du Core ; les rôles personnalisés ne sont pas modifiés.

## 14. Validation HTTP et autorité backend

Le frontend administratif peut fournir uniquement :

- email ;
- Plan existant ;
- nom proposé du premier workspace ;
- périodicité autorisée ;
- motif administratif.

Il ne peut pas fournir directement :

- capabilities ;
- limites ;
- prix ;
- statut Subscription ;
- dates contractuelles ;
- provider ;
- `termType` ;
- état d'éligibilité trial.

Toutes ces valeurs sont dérivées et revalidées par le backend.

## 15. Audit minimal

Événements :

```text
COMMERCIAL_INVITATION_CREATED
COMMERCIAL_INVITATION_RESENT
COMMERCIAL_INVITATION_REVOKED
COMMERCIAL_INVITATION_ACCEPTED
SUBSCRIPTION_CREATED
```

L'audit peut conserver acteur, bénéficiaire, Plan, Workspace, Subscription, motif et dates nécessaires. Il ne conserve jamais le token brut.

## 16. Frontend cible

Administration Platform :

- `DataTable` partagé pour la liste ;
- formulaires/confirmations partagés existants ;
- RTK Query pour l'état serveur ;
- sélection uniquement parmi les Plans privés exploitables ;
- resend/revoke conditionnels selon le lifecycle ;
- backend autorité finale.

Parcours `/commercial-invitations/accept` :

- extraction du token depuis le fragment URL ;
- nettoyage immédiat de l'URL ;
- preview de l'offre ;
- orientation login/register si nécessaire ;
- retour au parcours ;
- accept authentifié ;
- suppression du secret local dès succès, révocation, expiration ou abandon explicite.

## 17. Relation avec D-002

D-020 ne modifie pas la corbeille Files.

D-002 reste un bloc séparé mais obligatoire avant la première dérivation du Core. Sa restauration devra respecter D-019 : un fichier soft-deleted dont le contenu physique existe encore continue à consommer `storage_bytes`; une restauration avant purge ne réserve donc pas le stockage une seconde fois.

## 18. Critère de validation D-020

D-020 pourra être déclaré `VALIDÉ` uniquement lorsque :

- backend complet ;
- migration `termType` et procédure opérationnelle documentées ;
- permissions, presets et audit complets ;
- tests métier, sécurité, concurrence et routes réellement exécutés et verts ;
- frontend Platform et parcours d'acceptation intégrés ;
- lint/tests/build globaux réellement validés ;
- documentation canonique alignée avec le code final.
