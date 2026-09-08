# SAAS-CORE-API — Contrat D-020 : invitations commerciales et offres privées

**Statut :** EN COURS  
**Date :** 2026-09-08  
**Périmètre :** Core clonable

## 1. Objet

D-020 fournit un mécanisme générique permettant à la Plateforme de proposer une offre commerciale privée à une personne qui n'utilise pas encore le SaaS, puis de créer son premier workspace lors de l'acceptation.

Ce domaine ne remplace ni l'authentification, ni les invitations d'équipe Platform, ni les invitations de membres d'un workspace.

## 2. Invariants

```text
PlatformInvitation != CommercialInvitation != WorkspaceInvitation
```

- `PlatformInvitation` sert à intégrer un collaborateur interne à l'équipe Platform.
- `WorkspaceInvitation` sert à inviter un membre dans un workspace existant.
- `CommercialInvitation` sert à proposer un Plan privé à un futur client et à créer son premier workspace.

Aucun de ces modèles ne doit être réutilisé pour représenter un autre domaine.

## 3. Offre privée

Une invitation commerciale D-020 cible uniquement un `Plan` :

- `status = active` ;
- `isPublic = false` ;
- `systemRole = null` ;
- capabilities et limites explicitement définies dans le Plan.

Une offre privée peut être gratuite sans devenir le Plan baseline. Le Plan baseline reste le fallback structurel commun aux workspaces.

`EntitlementOverride` reste réservé aux exceptions individuelles ; il ne représente pas une offre commerciale réutilisable.

## 4. Deux contrats temporels

Une Subscription distingue explicitement :

```text
fixed
open_ended
```

### fixed

Utilisé lorsqu'une échéance commerciale existe. Une Subscription `fixed` doit posséder une `currentPeriodEnd` valide.

Un trial est temporaire : `trialEndsAt` doit exister et rester l'autorité de fin d'essai.

### open_ended

Utilisé pour un accès sans expiration automatique. Dans D-020, une Subscription commerciale `open_ended` est limitée à une offre :

- gratuite ;
- `billingInterval = none` ;
- `provider = manual` ;
- sans `trialEndsAt` ;
- sans consommation de `TrialEligibility`.

Cette règle empêche qu'une offre payante mal configurée devienne accidentellement permanente.

## 5. Invitation et durée de l'offre

L'expiration de `CommercialInvitation` protège le lien d'onboarding. Elle est indépendante de la durée de la Subscription créée.

```text
invitation expiresAt != subscription currentPeriodEnd
```

Une offre gratuite durable peut donc être créée par une invitation temporaire.

## 6. Sécurité du token

- secret aléatoire cryptographiquement sûr ;
- secret brut transmis uniquement au destinataire ;
- seule l'empreinte SHA-256 est persistée ;
- aucun secret brut dans les logs ou l'audit ;
- resend = nouveau secret + nouveau hash + invalidation immédiate de l'ancien lien ;
- révocation d'une invitation pending interdit toute acceptation ultérieure.

## 7. Autorité utilisateur

L'acceptation ne crée jamais un mot de passe et ne contourne pas Auth.

Le bénéficiaire :

1. crée son compte via le workflow Auth normal s'il n'existe pas ;
2. se connecte ;
3. accepte l'invitation avec une session authentifiée ;
4. l'email canonical du User authentifié doit correspondre exactement à l'invitation.

D-020 ne rattache pas un utilisateur à un workspace existant. L'acceptation crée son premier workspace. Les invitations ultérieures dans un workspace utilisent `WorkspaceInvitation`.

## 8. Snapshot de proposition

`CommercialInvitation.offerSnapshot` conserve les conditions présentées lors de l'envoi :

- nom du Plan ;
- devise ;
- périodicité ;
- prix ;
- trial ;
- fonctionnalités ;
- limites.

Le snapshot sert à détecter une dérive significative du Plan avant acceptation et à éviter qu'une modification du catalogue transforme silencieusement une proposition déjà envoyée.

La Subscription reste toutefois l'autorité runtime après acceptation.

## 9. Acceptation atomique

L'acceptation doit appartenir à une unique transaction MongoDB et couvrir :

1. validation conditionnelle de l'invitation `pending` et non expirée ;
2. correspondance de l'identité authentifiée ;
3. revalidation du Plan ;
4. vérification qu'aucun workspace actif/suspendu n'est déjà associé au User dans ce parcours initial ;
5. création Workspace ;
6. création des rôles système ;
7. création du membership owner ;
8. création de la Subscription baseline ;
9. réservation de la métrique `members` pour l'owner ;
10. création de la Subscription commerciale ;
11. consommation de `TrialEligibility` uniquement pour un vrai trial ;
12. passage de l'invitation à `accepted` ;
13. audit.

Tout échec annule l'ensemble.

## 10. Permissions Platform

Les permissions sont dédiées :

```text
platform:commercial_invitations:read
platform:commercial_invitations:create
platform:commercial_invitations:resend
platform:commercial_invitations:revoke
```

Aucune route D-020 ne doit s'appuyer sur une simple vérification de rôle ou sur les permissions `TEAM_*`.

## 11. Validation HTTP

Zod reste strict. Le frontend peut fournir uniquement les choix métier explicitement autorisés, notamment :

- email ;
- Plan existant ;
- nom proposé du premier workspace ;
- périodicité lorsque le Plan la nécessite.

Il ne peut pas fournir directement :

- capabilities ;
- limites ;
- prix ;
- statut Subscription ;
- dates contractuelles ;
- provider ;
- `termType` ;
- état d'éligibilité trial.

Ces valeurs sont dérivées et validées par le backend.

## 12. Audit minimal

Les événements suivants doivent être auditables :

```text
COMMERCIAL_INVITATION_CREATED
COMMERCIAL_INVITATION_RESENT
COMMERCIAL_INVITATION_REVOKED
COMMERCIAL_INVITATION_ACCEPTED
SUBSCRIPTION_CREATED
```

L'audit peut conserver les identifiants du bénéficiaire, du Plan, du Workspace et de la Subscription, ainsi que le motif administratif lorsqu'il existe. Il ne conserve jamais le token brut.

## 13. Frontend cible

L'administration Platform doit réutiliser les composants partagés existants :

- `DataTable` pour les invitations ;
- composants communs de formulaire/confirmation ;
- RTK Query pour les données serveur ;
- permissions backend comme autorité finale.

Le parcours public `/commercial-invitations/accept` présente l'offre, oriente vers login/register si nécessaire, puis revient à l'acceptation authentifiée.

## 14. Relation avec D-002

D-020 ne modifie pas la corbeille Files.

D-002 devient toutefois obligatoire avant la première dérivation du Core : une application dérivée ne doit pas hériter d'une suppression logique avec rétention physique sans UX de corbeille/restauration cohérente.

Le contrat de restauration devra respecter le moteur D-019 : un fichier supprimé logiquement reste comptabilisé dans `storage_bytes` tant qu'il n'est pas physiquement purgé. Une restauration avant purge ne doit donc pas réserver une seconde fois le stockage déjà comptabilisé.

## 15. Critère de validation D-020

D-020 pourra être déclaré `VALIDÉ` uniquement lorsque :

- backend complet ;
- permissions et audit complets ;
- tests métier, sécurité, concurrence et routes verts ;
- frontend Platform et parcours d'acceptation intégrés ;
- lint/tests/build globaux validés ;
- documentation canonique alignée avec le code réel.
