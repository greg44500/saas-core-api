# SAAS-CORE-API — Inventaire canonique RGPD / données / traceurs / stockages

**Statut :** inventaire technique vivant  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** Core actuel ; à compléter dans chaque SaaS dérivé

---

## 1. Objet

Ce document recense les catégories de données, stockages navigateur, traceurs, prestataires et points de collecte actuellement identifiables dans `saas-core-api`.

Il sert à éviter qu'une évolution technique introduise silencieusement :

```text
une nouvelle donnée personnelle
un nouveau traceur
un nouveau sous-traitant
un nouveau transfert
autre finalité
une nouvelle durée de conservation
```

Il ne constitue pas à lui seul :

- un registre RGPD complet ;
- une politique de confidentialité ;
- une analyse juridique des bases légales ;
- une matrice définitive de conservation ;
- une preuve de conformité du produit dérivé.

Référence de conformité : `docs/compliance/COMPLIANCE.md`.

---

## 2. Traceurs et stockages navigateur actuellement identifiés

### 2.1 Cookie `refreshToken`

| Propriété | Valeur actuelle |
|---|---|
| Type | cookie HTTP |
| Nom | `refreshToken` |
| Origine | backend Core |
| Finalité technique | authentification persistante, rotation de session, refresh, logout |
| HttpOnly | oui |
| Secure | oui en production |
| SameSite | `lax` |
| Path | `/api/auth` |
| Durée | alignée sur `REFRESH_TOKEN_EXPIRES_IN_DAYS` / AuthSession |
| Accessible par JavaScript | non |

Qualification technique actuelle : mécanisme conçu comme strictement nécessaire à l'authentification sécurisée du service.

Décisions :

- ne pas le déplacer vers `localStorage` ou `sessionStorage` ;
- ne pas le bloquer derrière un consentement optionnel ;
- le documenter dans la politique cookies du produit final ;
- réévaluer `SameSite`, domaine et architecture cross-site selon le déploiement de production.

---

### 2.2 Préférence de thème

| Propriété | Valeur actuelle |
|---|---|
| Type | `localStorage` |
| Préfixe | `saas-core:theme` |
| Clé complète | `saas-core:theme:<scope>` |
| Valeur | `light` ou `dark` |
| Finalité technique | mémoriser la préférence d'affichage |
| Credential | aucun |

La qualification juridique finale dépend du fonctionnement réel du produit. La CNIL cite certaines personnalisations intrinsèques et attendues de l'interface parmi les mécanismes pouvant être exemptés de consentement, mais cette qualification doit rester liée à la finalité réelle.

---

### 2.3 Traceurs optionnels

Au 2026-09-05 :

```text
SDK analytics identifié dans frontend/package.json
→ non

SDK publicitaire identifié
→ non

script tiers de tracking dans frontend/index.html
→ non
```

Aucune catégorie fictive « analytics », « publicité » ou « marketing » ne doit donc être présentée à l'utilisateur tant qu'un outil réel n'existe pas.

---

## 3. Données de compte et d'identité

Catégories identifiables :

```text
User
- prénom
- nom
- email
- statut
- rôle Platform
- dates techniques du compte

AuthIdentity
- provider
- passwordHash pour identité locale
- données nécessaires aux workflows de mot de passe
```

À qualifier dans le produit final :

- finalité exacte ;
- base légale ;
- durée après fermeture de compte ;
- règles d'anonymisation/suppression ;
- destinataires internes ;
- distinction entre compte utilisateur et identité commerciale éventuelle.

---

## 4. Authentification et sécurité

Catégories identifiables :

```text
AuthSession
- identifiant de session
- hash du refresh token
- famille/génération de rotation
- expiration
- révocation / compromission
- adresse IP
- user-agent

PasswordResetToken
- valeur stockée sous forme sécurisée/hashée selon le workflow
- expiration
- usage unique
```

Finalités techniques observées :

- authentification ;
- sécurisation de session ;
- rotation et reuse detection ;
- réinitialisation de mot de passe ;
- investigation de sécurité.

Les expirations techniques ne doivent pas être présentées automatiquement comme durées réglementaires définitives.

---

## 5. Données Workspace / multi-tenant

Catégories identifiables :

```text
Workspace
WorkspaceMember
WorkspaceInvitation
Role
permissions
ownership
statuts administratifs
```

Données personnelles possibles :

- identité des membres ;
- email des personnes invitées ;
- rôle et permissions ;
- rattachement d'une personne à un Workspace ;
- historique d'administration et d'ownership.

Le rôle juridique de l'éditeur doit être qualifié traitement par traitement. Le Core ne suppose pas qu'une même qualification responsable/sous-traitant s'applique à toutes les données Workspace.

---

## 6. AuditLog et contexte de requête

Catégories identifiables :

```text
actor
workspace
action
entityType / entityId
status
metadata filtrée
ipAddress
userAgent
requestId selon le flux technique
createdAt
```

Finalités techniques observées :

- sécurité ;
- traçabilité des actions sensibles ;
- administration ;
- investigation fonctionnelle.

À définir avant production :

- durée de conservation ;
- événements justifiant IP/user-agent ;
- accès autorisés ;
- archivage/anonymisation éventuelle ;
- articulation avec les demandes d'effacement ;
- différence entre AuditLog et logs d'observabilité.

---

## 7. Fichiers et contenus utilisateurs

Catégories identifiables :

```text
File
- nom et métadonnées
- type
- taille
- checksum
- rattachement Workspace
- stockage physique
- statut active/deleted/purged
```

Le contenu du fichier peut contenir n'importe quelle catégorie de donnée selon le SaaS dérivé.

Le Core ne peut donc pas définir seul :

- la sensibilité du contenu ;
- la finalité ;
- la base légale ;
- la durée métier ;
- le rôle juridique de la plateforme ;
- les restrictions sectorielles ;
- les transferts d'un futur provider cloud.

La purge physique différée du module File doit être distinguée de la politique réglementaire globale de conservation.

---

## 8. Données commerciales

Catégories identifiables :

```text
Plan
Subscription
TrialEligibility
UsageMetric
EntitlementOverride
historique de changements commerciaux
acteurs administratifs associés à certaines opérations
```

Certaines données sont principalement Workspace-scoped, mais les propriétaires, administrateurs et traces d'action peuvent constituer des données personnelles.

Billing/Payment réel n'est pas encore l'autorité financière du Core.

Lorsqu'un provider de paiement sera ajouté, l'inventaire devra immédiatement préciser :

- fournisseur ;
- données transmises ;
- identifiants provider conservés ;
- webhooks ;
- facturation ;
- taxes ;
- transferts ;
- durées ;
- responsabilités contractuelles.

---

## 9. Email transactionnel

Le Core utilise l'email pour des workflows tels que :

```text
reset de mot de passe
invitations Workspace
```

Avant production, documenter le provider réellement retenu :

```text
nom du fournisseur
rôle contractuel
localisation du traitement
données transmises
journaux conservés
sous-traitants ultérieurs
transferts éventuels hors UE/EEE
durée de conservation
```

Les outils de développement ou sandbox ne doivent pas être décrits automatiquement comme fournisseurs de production.

---

## 10. Données techniques et infrastructure

Données ou métadonnées potentiellement traitées selon les flux :

```text
adresse IP
user-agent
requestId
horodatages
logs serveur
logs d'erreur
état antivirus
métadonnées de stockage
```

À documenter lors du déploiement :

- quelles données sont persistées ;
- dans quels systèmes ;
- à quelles fins ;
- combien de temps ;
- qui y accède ;
- quel proxy/CDN peut les enrichir ;
- quels outils d'observabilité les reçoivent.

---

## 11. Prestataires connus et prestataires non figés

### Environnements de développement / références techniques connues

```text
MongoDB Atlas utilisé dans l'environnement de développement actuel
Mailtrap sandbox utilisé pour les emails de développement/test
stockage local actuellement supporté
ClamAV / antivirus local selon la configuration du Core
```

Ces éléments ne constituent pas une liste contractuelle de production.

### Production non figée

```text
hébergeur applicatif
MongoDB / provider base de données final
provider email
provider stockage
provider paiement
CDN / proxy
analytics éventuel
support éventuel
monitoring / observabilité
services IA éventuels
services marketing éventuels
```

Aucun prestataire non sélectionné ne doit apparaître dans une politique de confidentialité comme destinataire réel.

---

## 12. Points de collecte frontend identifiables

Points de collecte ou d'interaction pouvant concerner des données personnelles :

```text
register
login
forgot-password
reset-password
profil
changement de mot de passe
création/modification Workspace
invitations
membres
rôles
upload de fichiers
subscription / trial
administration Platform
```

Tous ne nécessitent pas la même information de confidentialité.

Le frontend ne doit pas copier une mention unique sans vérifier la finalité et le contexte du traitement.

---

## 13. Données non encore déterminables

Le Core générique ne peut pas déterminer aujourd'hui :

```text
entité juridique éditrice
hébergeur de production
contact données / DPO
responsable(s) de traitement par finalité
bases légales finales
durées réglementaires finales
prestataires de production
transferts hors UE/EEE
outils analytics ou marketing
provider de paiement
services IA
support externe
catégories de données métier futures
AIPD requise ou non pour un futur produit
```

Ces inconnues doivent être résolues avant la validation juridique et le go-live du SaaS concerné.

---

## 14. Registre des évolutions à surveiller

Toute PR ou lot ajoutant l'un des éléments suivants doit déclencher une mise à jour de cet inventaire :

```text
nouveau model contenant des données personnelles
nouveau champ personnel
nouveau cookie
nouveau localStorage/sessionStorage/IndexedDB
nouveau script ou SDK tiers
nouveau provider
nouveau webhook externe
nouveau flux IA
nouveau module Billing
nouvel outil analytics/marketing
nouveau système de support
nouveau mécanisme d'export
nouvelle politique de rétention
nouveau traitement de données sensibles
profilage ou décision automatisée
```

---

## 15. Checklist pour une application dérivée

Avant production, le SaaS dérivé doit compléter cet inventaire avec au minimum :

- [ ] toutes ses données métier ;
- [ ] tous les nouveaux points de collecte ;
- [ ] tous les cookies et stockages terminal ;
- [ ] tous les fournisseurs et sous-traitants ;
- [ ] toutes les destinations hors UE/EEE ;
- [ ] les finalités ;
- [ ] les bases légales ;
- [ ] les durées ou critères de conservation ;
- [ ] les mesures d'effacement/anonymisation ;
- [ ] les rôles responsable/sous-traitant ;
- [ ] les éventuelles données sensibles ;
- [ ] les traitements susceptibles de nécessiter une AIPD ;
- [ ] les traitements automatisés/profilages ;
- [ ] les mécanismes de droits utilisateur correspondants.

---

## 16. État actuel de l'inventaire

### Identifié techniquement

```text
refreshToken HttpOnly
préférence de thème localStorage
User / AuthIdentity
AuthSession / PasswordResetToken
Workspace / Membership / Invitation / Role
AuditLog
Files
Plan / Subscription / Trial / Usage / Override
email transactionnel
IP / user-agent et données techniques de sécurité
```

### Traceurs optionnels actuellement identifiés

```text
aucun
```

### À déterminer par chaque produit

```text
finalités juridiques finales
bases légales
retention matrix
prestataires de production
transferts
contenus métier
politique de confidentialité
mentions légales
AIPD éventuelle
```

---

## 17. Document historique remplacé

Ce fichier remplace comme inventaire canonique :

```text
docs/rgpd-data-tracker-inventory.md
```

L'ancien fichier reste présent temporairement pour respecter la règle de non-suppression avant validation explicite.

À partir de DOC-7, **seul le présent chemin doit être mis à jour** :

```text
docs/compliance/rgpd-data-tracker-inventory.md
```

L'ancien inventaire devient une source historique en attente du lot de nettoyage.