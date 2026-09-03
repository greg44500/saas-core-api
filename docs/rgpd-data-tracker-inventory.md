# SAAS-CORE-API — Inventaire RGPD / traceurs / stockages du Core

**Date :** 3 septembre 2026  
**Statut :** RGPD-0 — inventaire initial du Core  
**Nature :** document vivant à mettre à jour avant toute mise en production et lors de l'ajout d'un prestataire ou d'un nouveau traitement

Références :

```text
docs/functional-debt-rgpd-cookies-privacy-legal.md
docs/rgpd-cookies-privacy-technical-cadrage.md
```

---

## 1. Objet

Ce document recense les traitements, traceurs, stockages navigateur et catégories de données actuellement identifiables dans le Core.

Il ne constitue pas à lui seul un registre RGPD définitif et ne fixe aucune base juridique ni durée de conservation légale sans validation préalable.

L'inventaire doit être complété dans chaque application dérivée avec les prestataires, modules métier et traitements réellement ajoutés après clonage.

---

## 2. Traceurs et stockages navigateur actuellement identifiés

### 2.1 Cookie `refreshToken`

```text
Type              cookie HTTP
Nom               refreshToken
Origine           backend Core
Finalité technique authentification persistante, rotation de session, logout
HttpOnly          oui
Secure            oui en production
SameSite          lax
Path              /api/auth
Durée             alignée sur REFRESH_TOKEN_EXPIRES_IN_DAYS / AuthSession
Accessible JS     non
```

Qualification provisoire : **strictement nécessaire à la fourniture sécurisée du service authentifié**.

Décision technique :

- ne pas le bloquer derrière un consentement optionnel ;
- le documenter dans la politique de cookies ;
- ne jamais le déplacer vers `localStorage` ;
- réévaluer `SameSite` si l'architecture de production devient réellement cross-site.

### 2.2 Préférence de thème

```text
Type              localStorage
Préfixe           saas-core:theme
Valeur            light | dark
Scope             anonymous ou scope fourni à ThemeProvider
Finalité technique mémoriser la préférence d'affichage
Credential        aucun
```

Qualification juridique à confirmer selon le déploiement réel. Cette préférence doit être inventoriée même si elle est susceptible de relever d'une fonctionnalité demandée par l'utilisateur.

### 2.3 Traceurs optionnels

Au 3 septembre 2026 : **aucun traceur analytics, publicitaire ou de suivi inter-sites identifié dans les dépendances frontend du Core**.

Ne pas créer de catégorie de consentement fictive avant qu'un outil réel ne soit intégré.

---

## 3. Données de compte et d'identité

Catégories actuellement identifiables :

```text
User
- prénom
- nom
- email
- statut
- rôle Platform
- dates techniques liées au compte

Auth identity
- password hash pour identité locale
- informations nécessaires au changement/reset de mot de passe
```

Points à qualifier avant production :

- finalité exacte ;
- base juridique ;
- durée après fermeture/suppression de compte ;
- politique d'anonymisation ou suppression ;
- destinataires internes.

---

## 4. Authentification et sécurité

Catégories actuellement identifiables :

```text
AuthSession
- identifiant de session
- hash de refresh token
- user-agent
- adresse IP
- dates d'expiration/révocation
- informations de rotation/reuse detection

PasswordResetToken
- token sécurisé/hashé
- expiration
- usage unique
```

Finalités techniques observées : authentification, sécurité, détection de réutilisation de session, réinitialisation de mot de passe et traçabilité des événements de sécurité.

Les durées techniques existantes ne doivent pas être présentées automatiquement comme durées légales de conservation sans analyse dédiée.

---

## 5. Workspace / multi-tenant

Catégories actuellement identifiables :

```text
Workspace
WorkspaceMember
WorkspaceInvitation
Role
permissions
ownership
statuts et historique administratif
```

Données personnelles possibles : identité des membres, emails d'invitation, rôle, actions d'administration et liens entre une personne et un Workspace.

Le rôle juridique de l'éditeur peut différer selon le traitement : les données internes de compte/platform ne doivent pas être qualifiées automatiquement de la même manière que les contenus introduits par les clients dans leurs Workspaces.

---

## 6. AuditLog

Catégories actuellement identifiables :

```text
actor
workspace
action
entityType / entityId
status
ipAddress
userAgent
metadata filtrée
createdAt
```

Finalités techniques observées : sécurité, traçabilité des opérations sensibles, administration et investigation.

Points à figer avant production :

- durée de conservation ;
- accès autorisés ;
- politique d'archivage/anonymisation ;
- justification des champs IP/user-agent par catégorie d'événement ;
- articulation avec demandes d'effacement lorsque la conservation reste nécessaire pour une obligation ou un intérêt légitime à qualifier.

---

## 7. Fichiers et contenus utilisateurs

Catégories actuellement identifiables :

```text
File
- nom/métadonnées
- type
- taille
- checksum
- catégorie
- rattachement Workspace
- fichier physique
- statut active/deleted/purged
```

Le contenu des fichiers peut contenir des données personnelles ou sensibles selon l'application dérivée.

Le Core ne peut donc pas déterminer seul :

- la nature juridique du contenu ;
- la base juridique ;
- la durée métier de conservation ;
- le rôle responsable/sous-traitant ;
- les transferts éventuels d'un futur provider cloud.

La purge technique différée après soft delete doit être distinguée de la politique RGPD de conservation du produit dérivé.

---

## 8. Données commerciales

Catégories actuellement identifiables :

```text
Plan
Subscription
TrialEligibility
UsageMetric
EntitlementOverride
remises administratives
historique de changement d'abonnement
```

Certaines informations sont liées au Workspace plutôt qu'à une personne, mais les acteurs administratifs, propriétaires et historiques peuvent constituer des données personnelles.

Billing réel, coordonnées bancaires et facturation définitive ne sont pas encore implémentés dans le Core V1.

Lors de l'intégration d'un provider de paiement, il faudra ajouter immédiatement à cet inventaire :

- prestataire ;
- données transmises ;
- données conservées côté Core ;
- webhooks ;
- transferts ;
- durées ;
- responsabilités contractuelles.

---

## 9. Email transactionnel

Le Core utilise un mécanisme d'email pour certains workflows, notamment reset de mot de passe et invitations selon les modules présents.

Avant production, inventorier précisément :

```text
fournisseur SMTP/email
localisation du traitement
sous-traitance
journaux conservés par le fournisseur
transferts éventuels hors EEE
durée de conservation
```

Mailtrap utilisé en environnement de développement/test ne doit pas être automatiquement décrit comme fournisseur de production.

---

## 10. Données techniques de requête

Le Core possède un contexte requête contenant notamment :

```text
requestId
adresse IP
user-agent
```

Ces données sont utilisées dans plusieurs workflows de sécurité et d'audit.

Avant production, documenter précisément :

- où elles sont persistées ;
- dans quelles actions ;
- leur durée ;
- leur exposition éventuelle aux administrateurs ;
- les règles proxy réelles permettant d'obtenir une IP fiable sans surcollecte.

---

## 11. Prestataires actuellement déterminés / non déterminés

### Développement connu

```text
MongoDB Atlas
Mailtrap sandbox
stockage local de développement
ClamAV / abstraction antivirus
```

### Production non figée

```text
hébergeur applicatif
provider de stockage
provider email
provider de paiement
analytics éventuel
support éventuel
services IA éventuels
monitoring/observabilité éventuels
CDN éventuel
```

Aucun prestataire non figé ne doit être publié comme destinataire réel tant que l'architecture de production n'est pas décidée.

---

## 12. Points de collecte frontend déjà identifiables

```text
register
login
forgot-password
reset-password
profil utilisateur
changement de mot de passe
création/modification Workspace
invitations/membres
upload de fichiers
administration Platform
abonnement/trial
```

Tous ne nécessitent pas la même mention d'information. Une future primitive partagée ne devra gérer que la présentation ; la finalité/base/durée resteront propres au traitement réel.

---

## 13. Modules futurs à ajouter obligatoirement à l'inventaire

Tout nouveau module ou fournisseur doit déclencher une revue RGPD-0 s'il introduit :

```text
nouvelle catégorie de données personnelles
nouvelle finalité
nouveau traceur ou stockage terminal
nouveau sous-traitant
transfert international
nouvelle durée de conservation
profilage ou décision automatisée
IA traitant du contenu utilisateur
paiement/facturation
support client externe
analytics/marketing
```

---

## 14. État actuel de l'inventaire

### Identifié techniquement

- cookie d'authentification `refreshToken` ;
- préférence de thème dans `localStorage` ;
- données User/AuthSession ;
- IP et user-agent de sécurité ;
- Workspaces/membres/rôles/invitations ;
- AuditLog ;
- fichiers utilisateurs ;
- données Subscription/Plan/UsageMetric/Trial ;
- email transactionnel ;
- prestataires de développement connus.

### Non déterminable aujourd'hui

- entité juridique éditrice ;
- hébergeur de production ;
- DPO ;
- prestataires de production ;
- analytics éventuel ;
- provider de paiement ;
- outils IA ;
- transferts hors EEE ;
- bases juridiques finales ;
- durées légales/opérationnelles définitives ;
- qualification responsable/sous-traitant pour les futurs modules métier.

---

## 15. Gate RGPD-0

RGPD-0 est considéré **cadré pour le Core actuel**, mais restera un inventaire vivant.

Avant d'ouvrir RGPD-1 en phase pré-production, il faudra compléter les choix réels de déploiement et supprimer toutes les inconnues qui conditionnent les textes juridiques.

La roadmap principale F10/F11 peut continuer entre-temps, à condition qu'aucun nouveau traceur ou prestataire ne soit intégré sans mise à jour de cet inventaire.
