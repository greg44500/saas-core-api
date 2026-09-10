# SAAS-CORE-API — Contrat D-020 : invitations commerciales et offres privées

**Statut :** EN COURS — intégré dans `main`, gate automatisée verte, parcours nominal validé manuellement  
**Dernière mise à jour :** 2026-09-10  
**Périmètre :** Core clonable

## 1. Objet

D-020 fournit un mécanisme générique permettant à la Plateforme de proposer une offre commerciale privée à une personne qui ne possède encore aucun rattachement Workspace courant dans le SaaS, puis de créer son premier workspace lors de l’acceptation.

Ce domaine ne remplace ni Auth, ni les invitations d’équipe Platform, ni les invitations de membres Workspace.

## 2. Frontières de domaine

```text
PlatformInvitation != CommercialInvitation != WorkspaceInvitation
```

- `PlatformInvitation` intègre un collaborateur interne à l’équipe Platform.
- `WorkspaceInvitation` ajoute un membre dans un workspace existant.
- `CommercialInvitation` propose un Plan privé dans un parcours d’acquisition initiale et crée le premier workspace du bénéficiaire.

`CommercialInvitation` ne cible jamais un workspace existant. Les ajustements commerciaux d’un workspace existant utilisent `Subscription` et `EntitlementOverride`.

## 3. Bénéficiaire éligible

Un bénéficiaire est admissible lorsque :

- aucun compte n’existe encore pour son email canonical ; ou
- un `User` existe déjà, mais ne possède aucun `WorkspaceMember` `active` ou `suspended`.

Un utilisateur déjà rattaché à un workspace actif/suspendu est refusé. Cette règle est vérifiée à la création lorsqu’un User existe déjà et de nouveau lors de l’acceptation.

## 4. Offre privée

Une invitation commerciale cible uniquement un `Plan` :

- `status = active` ;
- `isPublic = false` ;
- `systemRole = null` ;
- fonctionnalités et limites explicitement définies.

Le catalogue public utilisateur reste filtré côté backend sur :

```text
status = active
isPublic = true
```

Un Plan privé de découverte n’est donc jamais injecté dans le sélecteur public des plans.

D-020 expose un catalogue administratif dédié :

```text
GET /api/platform/commercial-invitations/offers
```

Une offre privée peut être gratuite sans devenir la baseline. `EntitlementOverride` reste réservé aux exceptions individuelles.

## 5. Contrats temporels Subscription

Une Subscription distingue :

```text
fixed
open_ended
```

### 5.1 `fixed`

Une Subscription commerciale active `fixed` possède une `currentPeriodEnd` valide.

Un vrai trial est :

```text
termType = fixed
status = trialing
trialEndsAt = date future
currentPeriodEnd = trialEndsAt
```

D-020 réserve le trial à une périodicité dont le tarif correspondant est strictement positif.

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

Le resolver vérifie ces invariants avant de reconnaître une commerciale `open_ended`. Une configuration incohérente ne doit pas accorder de droits permanents.

## 6. Migration `termType`

Migration dédiée et idempotente :

```bash
npm run migration:subscription-term-type
```

Précondition : `migration:subscription-kind` déjà appliquée.

Backfill :

```text
kind = baseline   → termType = open_ended
kind = commercial → termType = fixed
```

La migration refuse de deviner lorsque `kind` est absent ou inconnu.

## 7. Invitation et durée de l’offre

```text
invitation.expiresAt != subscription.currentPeriodEnd
```

L’expiration de `CommercialInvitation` protège le lien d’onboarding ; elle ne définit pas la durée contractuelle de la Subscription créée.

La création conserve un `reason` administratif obligatoire, interne à l’administration et à l’audit.

## 8. Sécurité du secret

- secret généré avec `crypto.randomBytes(32)` ;
- seule son empreinte SHA-256 est persistée ;
- aucun secret brut dans AuditLog ;
- resend = nouveau secret, nouveau hash et invalidation immédiate de l’ancien lien ;
- révocation d’une invitation pending interdit son acceptation ;
- preview, register dédié et accept sont rate-limités ;
- le token est envoyé dans le body HTTP des appels API, jamais dans un path.

Le lien email utilise :

```text
/commercial-invitations/accept#token=<secret>
```

Le fragment URL n’est pas transmis au serveur HTTP par le navigateur. Le frontend le capture à l’arrivée, le place uniquement dans un vault JavaScript en mémoire vive, puis nettoie immédiatement le fragment avec `history.replaceState`.

Le secret ne doit jamais être placé dans :

- Redux ;
- `localStorage` ;
- `sessionStorage` ;
- `history.state` ;
- une query string ;
- les logs.

Un rechargement complet détruit volontairement le secret runtime et oblige à rouvrir le lien reçu par email.

## 9. Preview publique

```text
POST /api/commercial-invitations/preview
```

La preview :

- est publique mais rate-limitée ;
- reçoit le token dans le body ;
- exige une validation Zod stricte ;
- revalide le Plan et le snapshot ;
- ne renvoie ni email du bénéficiaire ni motif administratif.

Une modification significative du Plan après l’envoi rend l’invitation non acceptable et impose une nouvelle invitation.

## 10. Création de compte protégée par l’identité de l’invitation

Lorsqu’un visiteur arrive par un lien D-020 et ne possède pas encore de compte, le frontend n’utilise pas l’inscription publique ordinaire sans contexte.

Le parcours D-020 utilise une route de register dédiée qui :

1. recharge l’invitation active à partir du token hashé ;
2. vérifie qu’elle est `pending` et non expirée ;
3. vérifie que l’email demandé correspond exactement au bénéficiaire canonical ;
4. revalide le Plan et le snapshot ;
5. délègue ensuite seulement à la logique Auth de création de compte.

Une mauvaise adresse email est donc refusée avant création du compte.

## 11. Autorité utilisateur après Auth

Après inscription ou connexion, le backend vérifie encore l’identité du bénéficiaire.

Le parcours authentifié expose un contrôle recipient permettant au frontend de distinguer :

```text
compte correspondant au bénéficiaire
→ Acceptation / Refus disponibles

mauvais compte
→ aucune action d’acceptation/refus
→ proposition explicite d’utiliser un autre compte
```

Le backend reste l’autorité finale et refuse toute discordance d’email.

Le changement de compte déconnecte la session courante et conserve le vault runtime tant que l’application n’est pas rechargée.

## 12. Refus explicite

Le bénéficiaire authentifié correspondant peut refuser l’offre.

Lifecycle ajouté :

```text
pending → declined
```

Le refus :

- est transactionnel ;
- enregistre `declinedAt` et `declinedBy` ;
- produit `COMMERCIAL_INVITATION_DECLINED` ;
- empêche toute acceptation ultérieure de cette invitation ;
- vide le vault frontend ;
- ferme la session courante utilisée pour ce parcours, sans imposer un logout-all global.

Les statuts visibles sont notamment :

```text
pending   → En attente
accepted  → Acceptée
declined  → Refusée
revoked   → Révoquée
expired   → Expirée
```

Le rendu utilise le composant de statut partagé du Design System avec tons sémantiques.

## 13. Snapshot de proposition

`offerSnapshot` conserve :

- nom du Plan ;
- devise ;
- périodicité ;
- prix ;
- configuration trial ;
- fonctionnalités ;
- limites.

Avant resend, preview et accept, le backend compare les conditions significatives avec le Plan courant. Un simple renommage reste autorisé ; une modification de prix, trial, périodicité, fonctionnalités ou limites impose une nouvelle invitation.

La Subscription et le Plan restent l’autorité runtime après acceptation.

## 14. Acceptation atomique

L’acceptation appartient à une transaction MongoDB unique :

1. rechargement du User et validation `active` ;
2. validation conditionnelle de l’invitation `pending` et non expirée ;
3. correspondance email canonical ;
4. absence de membership Workspace `active` ou `suspended` ;
5. revalidation du Plan et du snapshot ;
6. précontrôle `TrialEligibility` pour un vrai trial ;
7. création Workspace ;
8. création des rôles système ;
9. création du membership owner ;
10. création de la Subscription baseline ;
11. réservation de la métrique `members` ;
12. création de la Subscription commerciale ;
13. consommation de `TrialEligibility` uniquement pour un vrai trial ;
14. transition conditionnelle vers `accepted` ;
15. audits.

Tout échec annule l’ensemble.

## 15. Permissions Platform

```text
platform:commercial_invitations:read
platform:commercial_invitations:create
platform:commercial_invitations:resend
platform:commercial_invitations:revoke
```

Aucune route D-020 n’utilise les permissions Team comme substitut.

## 16. Audit minimal

Événements D-020 actuels :

```text
COMMERCIAL_INVITATION_CREATED
COMMERCIAL_INVITATION_RESENT
COMMERCIAL_INVITATION_REVOKED
COMMERCIAL_INVITATION_ACCEPTED
COMMERCIAL_INVITATION_DECLINED
SUBSCRIPTION_CREATED
```

Le token brut n’est jamais audité.

## 17. Frontend implémenté

Administration Platform :

- liste via `DataTable` partagé ;
- création dans un drawer ;
- resend/revoke selon lifecycle et permissions ;
- statuts via badge sémantique partagé ;
- RTK Query pour l’état serveur ;
- invalidation du cache de liste après mutations pertinentes.

Parcours bénéficiaire :

```text
1. Création du compte
2. Connexion
3. Acceptation de l’offre
```

Un stepper partagé rend cette progression visible sur les écrans concernés.

Le parcours prend aussi en charge : preview, login/register, vérification du recipient, changement de compte, acceptation, refus et nettoyage du secret runtime.

## 18. Dashboard Platform et accès gratuits

Après acceptation, l’invitation n’est plus l’autorité des droits : la `Subscription` effective l’est.

Le Dashboard Platform distingue désormais :

```text
Abonnements payants actifs
Accès gratuits actifs
Valeur mensuelle contractuelle estimée
```

Une offre D-020 gratuite `open_ended` est comptée dans les accès gratuits actifs. Le sous-compteur `viaCommercialInvitation` utilise l’invitation `accepted` uniquement comme provenance commerciale, jamais comme source de droits.

## 19. Validation D-020

Le code D-020 et ses évolutions sont intégrés dans `main`.

Les gates automatisées applicables ont été confirmées vertes localement par l’utilisateur après les derniers correctifs :

```text
backend tests      OK
frontend tests     OK
lint               OK
frontend build     OK
```

Le parcours nominal a également été validé manuellement jusqu’à l’acceptation réussie et la création du premier workspace avec le Plan privé attendu.

D-020 reste toutefois `EN COURS` dans `docs/DEBT.md` tant que la validation manuelle finale n’a pas été explicitement clôturée pour les scénarios négatifs/restants du parcours, notamment vérification post-correctif de la mauvaise identité et du refus bénéficiaire.

Une fois ces contrôles explicitement validés, D-020 pourra passer formellement à `VALIDÉ` dans `docs/DEBT.md` avant D-021/D-015.
