# SAAS-CORE-API — Contrat Équipe de la Plateforme et RBAC Platform

**Statut :** contrat canonique D-018 — implémentation avancée, gouvernance des rôles personnalisés à finaliser  
**Dernière mise à jour :** 2026-09-06  
**Périmètre :** Core clonable — équipe interne de l’éditeur, autorité Fondateur, rôles, permissions et invitations Platform

---

## 1. Objet

Le Core doit permettre à l’éditeur d’un SaaS dérivé de constituer et administrer une équipe interne sans partager un compte `super_admin` ni attribuer à chaque collaborateur des pouvoirs excessifs.

Le modèle sépare explicitement :

```text
User
→ identité de la personne et authentification

PlatformTeamMember
→ appartenance de cette personne à l’équipe interne de la Plateforme

PlatformRole
→ fonction exercée dans l’équipe

PlatformPermission
→ action administrative réellement autorisée

PlatformInvitation
→ mécanisme sécurisé permettant de rejoindre l’équipe

Founder / Fondateur
→ autorité historique protégée de l’instance
```

Le RBAC Platform reste strictement distinct du RBAC Workspace.

---

## 2. Vocabulaire utilisateur et vocabulaire technique

Le code conserve sa nomenclature technique en anglais :

```text
Platform
platformRole
platformPermission
PlatformTeamMember
PlatformInvitation
```

L’interface utilisateur française emploie systématiquement :

```text
Plateforme
Équipe de la Plateforme
Fondateur
Super administrateur
Administrateur de la Plateforme
Support technique
Support commercial
Support client
Rôles et permissions
```

Le terme `Platform` ne doit pas apparaître dans une interface destinée à l’utilisateur francophone lorsqu’il désigne la Plateforme.

Cette règle est une convention d’interface ; elle ne justifie pas de renommer les routes API ou identifiants techniques existants.

---

## 3. Autorité Fondateur

### 3.1 Principe

Le **Fondateur** représente l’autorité historique protégée de l’instance du SaaS.

`Fondateur` n’est pas un rôle RBAC ordinaire et ne doit jamais apparaître dans le catalogue des rôles personnalisables.

Invariant :

```text
Fondateur
→ est toujours Super administrateur

Super administrateur
→ n’est pas nécessairement Fondateur
```

### 3.2 Unicité

Une instance possède exactement un Fondateur actif à un instant donné.

L’identité du Fondateur est enregistrée explicitement par le système. Elle ne doit jamais être déduite d’un email, d’un nom, d’une constante applicative ou d’une condition codée en dur sur une personne particulière.

### 3.3 Protections ordinaires

Depuis l’administration normale, le Fondateur ne peut pas :

- être rétrogradé ;
- perdre son rôle de Super administrateur ;
- être retiré de l’équipe de la Plateforme ;
- être suspendu de l’équipe de la Plateforme ;
- être fermé ou supprimé comme un compte ordinaire ;
- perdre sa qualité de Fondateur à la suite d’une modification de rôle.

Aucun autre Super administrateur ne peut contourner ces protections.

### 3.4 Transfert exceptionnel

Le Core doit rester compatible avec un futur transfert exceptionnel de la qualité de Fondateur, notamment en cas de changement de propriétaire, compromission, incapacité durable ou transmission de l’exploitation.

Ce transfert :

- n’appartient pas aux opérations courantes de gestion d’équipe ;
- exige une procédure dédiée fortement sécurisée ;
- doit être explicitement confirmé ;
- doit être audité ;
- ne doit jamais être simulé par une simple modification de rôle.

Aucune permission runtime `founder:transfer` n’est ajoutée tant que cette procédure n’est pas réellement conçue et implémentée.

---

## 4. Super administrateurs

Le Core autorise plusieurs Super administrateurs.

Le rôle système `super_admin` :

- possède toutes les permissions Platform connues du Core ;
- reçoit également les nouvelles permissions Platform ajoutées ultérieurement au Core ou au SaaS dérivé par le registre applicatif ;
- ne dépend pas d’une sélection manuelle partielle de permissions ;
- ne peut pas être transformé en rôle personnalisé ;
- ne peut pas être supprimé du catalogue système.

Un Super administrateur peut administrer les autres membres de l’équipe et, sous réserve des protections du Fondateur, les autres Super administrateurs.

Les opérations de promotion, rétrogradation, suspension ou retrait concernant un Super administrateur sont hautement sensibles et doivent être auditées.

Le système doit empêcher toute opération qui laisserait la Plateforme sans Super administrateur actif.

---

## 5. PlatformTeamMember — appartenance à l’équipe interne

### 5.1 Séparation avec User

Un `User` reste une personne pouvant s’authentifier et éventuellement participer à des Workspaces.

Son appartenance à l’équipe interne est une responsabilité différente.

```text
Jean Martin
→ User
→ membre éventuel d’un Workspace client
→ PlatformTeamMember : Support technique
```

Retirer Jean de l’équipe de la Plateforme ne doit donc pas supprimer son `User` ni retirer automatiquement ses appartenances Workspace.

### 5.2 Une appartenance par User

Un User ne possède qu’une appartenance active à l’équipe de la Plateforme à la fois.

Cette appartenance référence un unique rôle Platform courant.

Le Core ne retient pas de multi-rôles Platform ni de permissions directement ajoutées ou retirées sur un membre.

```text
PlatformTeamMember
→ un rôle
→ permissions dérivées du rôle
```

### 5.3 États fonctionnels

```text
ACTIVE
→ accès interne autorisé selon le rôle

SUSPENDED
→ accès interne temporairement bloqué, réactivation possible

REVOKED
→ appartenance retirée ; état terminal de cette appartenance
```

Une suspension de l’équipe Platform ne doit pas être confondue avec `User.status = disabled`.

Le changement d’état Platform doit prendre effet immédiatement pour les autorisations administratives sans attendre l’expiration d’un JWT.

---

## 6. PlatformRole — rôles de l’équipe

### 6.1 Principe

Un rôle est un ensemble nommé de permissions Platform.

La sécurité ne dépend jamais du libellé humain du poste.

```text
Support technique
→ nom compréhensible
→ permissions explicites
```

Le backend autorise une opération à partir des permissions effectives.

### 6.2 Rôles système

Le Core fournit les rôles système suivants :

```text
Super administrateur
Administrateur de la Plateforme
Support technique
Support commercial
Support client
```

Règles :

- `Super administrateur` est réservé et possède toutes les permissions ;
- les rôles système ont une définition stable fournie par le Core ;
- ils sont non supprimables ;
- ils sont non archivables ;
- ils sont non modifiables depuis l’administration courante, y compris pour leur jeu de permissions ;
- si une organisation souhaite une variante, elle crée un rôle personnalisé au lieu de modifier le preset système ;
- un SaaS dérivé peut étendre le catalogue de permissions Platform sans modifier implicitement les rôles Core ordinaires.

L’immutabilité des rôles système est une règle backend. Le frontend doit également les présenter en lecture seule, mais ce masquage UI ne constitue pas la protection de sécurité.

### 6.3 Rôles personnalisés

La création, la modification et l’archivage d’un rôle personnalisé sont réservés :

```text
Fondateur
OU
Super administrateur
```

Un rôle Platform ordinaire, y compris `Administrateur de la Plateforme`, ne peut pas administrer la définition du catalogue de rôles personnalisés.

Un rôle personnalisé :

- possède une clé technique opaque générée uniquement par le backend et immuable ;
- possède un nom d’affichage modifiable ;
- possède une description / justification métier explicite et non vide ;
- référence uniquement des permissions déclarées dans le registre Platform actif ;
- peut être assigné à plusieurs membres ;
- ne peut jamais obtenir une permission classée `RÉSERVÉE` ;
- ne doit jamais reproduire exactement le même ensemble de permissions qu’un rôle actif existant, système ou personnalisé ;
- ne peut pas être supprimé physiquement depuis l’administration courante ;
- peut être archivé seulement lorsqu’aucun membre `ACTIVE` ou `SUSPENDED` ne l’utilise encore.

L’égalité d’un jeu de permissions est évaluée comme un ensemble : l’ordre de présentation ne doit pas permettre de contourner l’interdiction de clone exact.

Un rôle archivé n’est plus assignable mais reste conservé pour la traçabilité.

### 6.4 Anti-escalade et gouvernance

La gouvernance des rôles personnalisés ne remplace pas les protections anti-escalade ; elle les renforce.

Invariants :

- seul le Fondateur ou un Super administrateur peut créer, modifier ou archiver un rôle personnalisé ;
- aucune permission `RÉSERVÉE` ne peut appartenir à un rôle personnalisé, même lorsqu’un Super administrateur effectue la mutation ;
- aucune permission absente du registre actif ne peut être enregistrée ;
- aucun rôle personnalisé ne peut cloner exactement le jeu de permissions d’un rôle actif existant ;
- un acteur ne peut pas modifier son propre rôle ou son propre statut Platform pour contourner une restriction ;
- la gestion des membres reste soumise à la politique de puissance effective et aux protections du Fondateur / Super administrateur ;
- un rôle système ne peut jamais être modifié pour contourner les règles applicables aux rôles personnalisés.

Un Administrateur de la Plateforme peut, lorsqu’il possède les permissions nécessaires, gérer des membres strictement moins puissants que lui et leur assigner un rôle existant autorisé. Il ne peut pas créer ou redéfinir lui-même le catalogue des rôles.

---

## 7. PlatformPermission — droits administratifs

### 7.1 Principe du moindre privilège

Chaque collaborateur reçoit uniquement les pouvoirs nécessaires à sa fonction.

Le backend reste l’autorité réelle. Le frontend masque les menus et actions non autorisés uniquement pour l’UX.

### 7.2 Niveaux de sensibilité

Chaque permission Platform possède un niveau de délégation explicite :

```text
DÉLÉGABLE
→ peut être utilisée dans un rôle personnalisé ordinaire

SENSIBLE
→ peut être déléguée, mais son attribution et son usage doivent être contrôlés et audités

RÉSERVÉE
→ Super administrateur uniquement
```

Le niveau de sensibilité fait partie du catalogue technique de permissions. Il n’est pas modifiable librement depuis l’interface.

### 7.3 Registre applicatif actif

Le registre applicatif de permissions Platform est porté par :

```text
backend/config/applicationPlatformPermission.registry.js
```

Chaque permission expose les métadonnées nécessaires à son exploitation, notamment :

```text
key
label
category
categoryLabel
description
sensitivity
```

Le registre permet à un SaaS dérivé d’ajouter les permissions administratives de ses propres modules sans modifier une longue constante centrale.

Invariant :

```text
permission présente dans le code / registre actif
→ peut être utilisée par le RBAC Platform

permission saisie librement depuis l’UI ou directement en base
→ refusée
```

Une permission n’est donc jamais une donnée métier librement créée par un administrateur. Elle correspond à une capacité réellement implémentée et protégée par le code.

Le `super_admin` reçoit automatiquement toutes les permissions du registre actif, y compris celles ajoutées par un SaaS dérivé.

### 7.4 Catalogue de référence

Le catalogue distingue les actions réellement différentes au lieu de conserver des permissions trop larges comme `platform:users:update` ou `platform:workspaces:update`.

#### Vue et lecture

```text
platform:overview:read                         DÉLÉGABLE
platform:capabilities:read                     DÉLÉGABLE
platform:users:read                            DÉLÉGABLE
platform:workspaces:read                       DÉLÉGABLE
platform:plans:read                            DÉLÉGABLE
platform:subscriptions:read                    DÉLÉGABLE
platform:entitlement_overrides:read            DÉLÉGABLE
platform:audit_logs:read                       SENSIBLE
```

#### Utilisateurs

```text
platform:users:disable                         SENSIBLE
platform:users:enable                          SENSIBLE
platform:users:revoke_sessions                 SENSIBLE
platform:users:close                           RÉSERVÉE
```

`platform:users:close` reste réservée car la fermeture est une opération terminale du cycle de compte et peut avoir des conséquences transversales.

#### Workspaces

```text
platform:workspaces:suspend                    SENSIBLE
platform:workspaces:reactivate                 SENSIBLE
platform:workspaces:close                      RÉSERVÉE
```

La fermeture terminale d’un Workspace reste réservée au Super administrateur.

#### Plans

```text
platform:plans:create                          SENSIBLE
platform:plans:update                          SENSIBLE
platform:plans:archive                         SENSIBLE
```

#### Subscriptions

```text
platform:subscriptions:grant_trial             SENSIBLE
platform:subscriptions:update                  SENSIBLE
platform:subscriptions:cancel                  SENSIBLE
platform:subscriptions:resume                  SENSIBLE
```

Les actions sont séparées afin qu’un rôle commercial puisse par exemple accorder un trial sans recevoir automatiquement toutes les mutations de Subscription.

#### Entitlement overrides

```text
platform:entitlement_overrides:create          SENSIBLE
platform:entitlement_overrides:update          SENSIBLE
platform:entitlement_overrides:revoke          SENSIBLE
```

#### Équipe de la Plateforme

```text
platform:team:read                             DÉLÉGABLE
platform:team:invite                           SENSIBLE
platform:team:invitation_resend                SENSIBLE
platform:team:invitation_revoke                SENSIBLE
platform:team:member_role_update               SENSIBLE
platform:team:member_suspend                   SENSIBLE
platform:team:member_reactivate                SENSIBLE
platform:team:member_revoke                    SENSIBLE
```

#### Rôles Platform

```text
platform:roles:read                            DÉLÉGABLE
platform:roles:create                          SENSIBLE
platform:roles:update                          SENSIBLE
platform:roles:archive                         SENSIBLE
```

Ces permissions restent nécessaires à l’autorisation technique des endpoints, mais la gouvernance métier impose en plus que les mutations `create`, `update` et `archive` soient effectuées uniquement par le Fondateur ou un Super administrateur.

#### Gestion des Super administrateurs

```text
platform:super_admins:manage                   RÉSERVÉE
```

Cette permission couvre la promotion, rétrogradation ou gestion d’un autre Super administrateur sous réserve de la protection absolue du Fondateur dans l’administration ordinaire.

### 7.5 Permissions historiques à conserver sous contrôle

Les anciennes permissions larges ne doivent pas être réintroduites comme raccourci permettant d’élargir les accès.

La délégation Platform repose sur les permissions granulaires du registre actif et sur les contrôles métier complémentaires lorsque l’action est plus sensible que la simple possession d’une permission.

---

## 8. Matrice des rôles système

Les presets ci-dessous sont volontairement conservateurs. Une organisation ayant besoin de davantage de pouvoirs crée un rôle personnalisé ou utilise un rôle supérieur.

### 8.1 Fondateur

```text
Fondateur
→ qualité protégée
→ toujours Super administrateur
→ toutes les permissions présentes et futures
→ protection supplémentaire contre rétrogradation, suspension, retrait et fermeture
```

### 8.2 Super administrateur

```text
Super administrateur
→ toutes les permissions Platform du registre actif
→ gestion des autres Super administrateurs
→ toutes les permissions réservées
→ seul rôle système, avec le Fondateur, autorisé à gouverner la définition des rôles personnalisés
```

### 8.3 Administrateur de la Plateforme

Par défaut :

```text
✓ toutes les permissions DÉLÉGABLES
✓ toutes les permissions SENSIBLES Core selon le preset actif
✗ platform:users:close
✗ platform:workspaces:close
✗ platform:super_admins:manage
✗ protections / transfert du Fondateur
✗ création / modification / archivage de la définition des rôles personnalisés
```

Il peut gérer des membres strictement moins puissants que lui lorsque les permissions correspondantes lui sont attribuées, mais ne peut pas modifier un pair de même niveau, un Super administrateur, le Fondateur ni la définition du catalogue de rôles.

### 8.4 Support technique

Par défaut :

```text
✓ platform:overview:read
✓ platform:capabilities:read
✓ platform:users:read
✓ platform:users:revoke_sessions
✓ platform:workspaces:read
✓ platform:plans:read
✓ platform:subscriptions:read
✓ platform:entitlement_overrides:read
✓ platform:audit_logs:read

✗ fermeture User / Workspace
✗ mutation de Plan
✗ mutation commerciale de Subscription
✗ création/modification d’override
✗ gestion de l’équipe
✗ gestion des rôles
```

La lecture des AuditLogs est classée sensible car elle traverse potentiellement plusieurs clients.

### 8.5 Support commercial

Par défaut :

```text
✓ platform:overview:read
✓ platform:capabilities:read
✓ platform:users:read
✓ platform:workspaces:read
✓ platform:plans:read
✓ platform:subscriptions:read
✓ platform:subscriptions:grant_trial
✓ platform:entitlement_overrides:read

✗ modification des Plans
✗ modification générale / annulation / reprise des Subscriptions
✗ création/modification d’override
✗ actions techniques sur les sessions
✗ gestion de l’équipe
✗ gestion des rôles
```

Le Core autorise donc une opération commerciale limitée et contrôlée — le trial — sans donner par défaut l’ensemble des pouvoirs commerciaux.

### 8.6 Support client

Par défaut :

```text
✓ platform:overview:read
✓ platform:users:read
✓ platform:workspaces:read
✓ platform:plans:read
✓ platform:subscriptions:read

✗ mutations User / Workspace
✗ AuditLogs globaux
✗ mutations commerciales
✗ overrides
✗ gestion équipe / rôles
```

Il constitue le rôle d’assistance principalement en lecture.

---

## 9. PlatformInvitation — invitation dans l’équipe

### 9.1 Invitation distincte de WorkspaceInvitation

```text
WorkspaceInvitation
→ accès à un tenant particulier

PlatformInvitation
→ accès potentiel à l’administration de plusieurs clients
```

Elles peuvent réutiliser des primitives techniques ou UI communes lorsque pertinent, mais elles ne partagent pas automatiquement les mêmes règles métier.

### 9.2 Parcours

```text
Fondateur / administrateur autorisé
↓
saisit identité + email + rôle cible
↓
PlatformInvitation sécurisée
↓
email envoyé
↓
invité ouvre le lien
↓
User existant : rattachement contrôlé
ou
nouveau User : création/activation + définition du mot de passe
↓
PlatformTeamMember ACTIVE
```

Le créateur de l’invitation ne choisit et ne connaît jamais le mot de passe de l’invité.

### 9.3 Exigences minimales

Une invitation Platform doit être :

- liée à un email canonique précis ;
- liée à un rôle cible explicite ;
- temporaire ;
- à usage unique ;
- révocable ;
- non réutilisable après acceptation ;
- auditable ;
- protégée contre le stockage du token secret en clair ;
- strictement validée côté backend.

États fonctionnels :

```text
PENDING
ACCEPTED
EXPIRED
REVOKED
```

Le renvoi d’une invitation ne doit pas créer plusieurs invitations actives ambiguës pour le même besoin.

L’interface peut calculer un âge ou un temps restant uniquement à partir de timestamps réellement exposés par l’API. Elle ne doit jamais inventer un historique de renvoi ou une temporalité absente du backend.

---

## 10. Gestion de l’équipe

La surface d’administration est :

```text
Administration de la Plateforme
└── Équipe de la Plateforme
    ├── Membres
    ├── Invitations
    └── Rôles et permissions
```

Les actions visibles dépendent des permissions effectives de l’acteur et, pour les mutations de rôles personnalisés, de la gouvernance Fondateur / Super administrateur.

Les tableaux compatibles doivent réutiliser `DataTable` et les composants partagés existants.

---

## 11. Audit obligatoire

Les opérations sensibles du domaine doivent réutiliser l’AuditLog Core.

Exemples :

```text
invitation créée
invitation renvoyée
invitation révoquée
invitation acceptée
membre suspendu
membre réactivé
membre retiré
rôle changé
rôle personnalisé créé / modifié / archivé
permissions d’un rôle modifiées
Super administrateur promu / rétrogradé
transfert exceptionnel de Fondateur si un jour implémenté
```

Les événements doivent identifier l’acteur, la cible et le contexte utile sans stocker de secret d’invitation.

Une mutation critique qui exige l’audit ne doit pas être considérée réussie si l’écriture d’audit obligatoire échoue lorsque le workflow transactionnel permet cette garantie.

---

## 12. Frontières de sécurité

Le Bloc A doit respecter les invariants suivants :

1. RBAC Platform et RBAC Workspace restent distincts.
2. Un rôle Workspace ne donne jamais un accès Platform.
3. Une permission Platform ne donne pas automatiquement un droit dans un Workspace client.
4. Le Fondateur reste protégé des opérations administratives ordinaires.
5. `super_admin` possède tous les droits Platform mais ne contourne pas les validations métier, transactions, audits et contraintes de données.
6. Un changement de rôle ou de statut Platform prend effet immédiatement côté serveur.
7. Aucune permission technique n’est créée librement depuis le frontend ou directement en base.
8. Les invitations utilisent des secrets temporaires non stockés en clair.
9. Les actions sensibles sont auditées.
10. Une permission réservée ne peut jamais appartenir à un rôle personnalisé.
11. Un rôle système est immuable depuis l’administration courante : pas de modification, archivage ou suppression.
12. Seul le Fondateur ou un Super administrateur peut créer, modifier ou archiver un rôle personnalisé.
13. Un rôle personnalisé utilise uniquement des permissions du registre actif.
14. Un rôle personnalisé ne peut pas cloner exactement le jeu de permissions d’un rôle actif existant.
15. Un rôle personnalisé possède une description / justification métier explicite.
16. Un `PlatformTeamMember` possède un seul rôle Platform courant ; aucune permission directe par utilisateur n’est ajoutée.
17. Les composants frontend masqués ne constituent jamais une barrière de sécurité.
18. Les contrôles de gouvernance sensibles sont imposés côté backend même lorsqu’une permission runtime est présente.

---

## 13. Compatibilité avec l’existant et runtime actuel

Le Core possède désormais notamment :

```text
PlatformTeamMember
PlatformRole
PlatformInvitation
applicationPlatformPermission.registry.js
resolvePlatformAuthorization()
authorizePlatformPermission()
GET /api/platform/me
administration Platform des Users / Workspaces / Plans / Subscriptions / Overrides / AuditLogs
```

Les permissions sensibles sont résolues depuis l’état courant en base et non depuis un rôle embarqué dans le JWT.

```text
requête Platform sensible
→ resolvePlatformAuthorization()
→ PlatformTeamMember courant
→ PlatformRole courant
→ permissions effectives courantes
```

Le legacy `User.platformRole` reste transitoirement présent pour la compatibilité historique. Son fallback `super_admin` ne doit s’appliquer qu’à un utilisateur n’ayant jamais possédé de membership Platform. Un membership historique `REVOKED` ne doit jamais réactiver ce fallback.

La mutation historique suivante n’appartient plus au contrat backend :

```text
PATCH /api/platform/users/:id/role
```

Elle ne doit jamais être restaurée pour satisfaire un reliquat frontend.

### 13.1 Migration des anciens rôles

La migration ne doit jamais transformer silencieusement un ancien `admin` ou `support` sans permissions en rôle nouvellement doté de pouvoirs plus larges.

Règle :

```text
ancien super_admin
→ compatibilité transitoire contrôlée si aucun membership Platform n’a jamais existé

ancien admin / support
→ aucune élévation automatique de privilège
→ réaffectation explicite vers un rôle Platform cible
```

La qualité de Fondateur doit être initialisée explicitement par une procédure de bootstrap/migration contrôlée. Elle ne doit pas être déduite automatiquement du plus ancien compte ou d’un email particulier.

---

## 14. Hors périmètre du Bloc A

Ne font pas partie de ce bloc :

```text
RBAC des Workspaces
CRM de l’équipe commerciale
ticketing support
messagerie interne
planning RH
paie / salariés
Billing / Payment réel
profil entreprise / Organization du client
MFA / SSO avancé sauf nécessité de sécurité démontrée
moteur de rétention et purge des AuditLogs
```

La future politique de rétention / purge des données constitue une dette séparée à cadrer avant le versionnement du Core. Elle ne doit pas être ajoutée opportunément à D-018.

---

## 15. Découpage d’implémentation

État réel au 2026-09-06 :

```text
A1 — cadrage fonctionnel Platform Team                         VALIDÉ
A2 — catalogue RBAC Platform et règles de délégation           VALIDÉ
A3 — invitations Platform sécurisées                           VALIDÉ
A4 — gestion des membres et cycle de vie Platform              VALIDÉ
A4.1 — Current Platform Context                                VALIDÉ
A4.2 — rôles personnalisés backend                             IMPLÉMENTÉ, DURCISSEMENT À FAIRE
A5 — frontend Équipe de la Plateforme                          EN COURS DE CONSOLIDATION
A5.1 à A5.8 — surfaces principales                             IMPLÉMENTÉES / TESTÉES
Audit Metadata Contract                                        VALIDÉ PAR TESTS + BUILD
A6 — audit final sécurité + régression + documentation         À FAIRE
```

Le reliquat fonctionnel D-018 porte principalement sur :

- le durcissement de gouvernance des rôles personnalisés défini dans les sections 6 et 12 ;
- l’UX temporelle des invitations à partir des timestamps réellement disponibles ;
- la suppression des reliquats frontend legacy liés à `User.platformRole` ;
- la régression et l’audit sécurité final D-018.

Aucune étape ne doit rendre les droits de `support` ou `admin` plus larges que le contrat courant.

---

## 16. Critère de clôture du Bloc A complet

Le Bloc A sera considéré validé lorsque :

- le Fondateur est représenté et protégé explicitement ;
- plusieurs Super administrateurs sont supportés ;
- le dernier Super administrateur actif ne peut pas disparaître ;
- les membres Platform sont distincts des Users ordinaires ;
- les rôles système et personnalisés sont gérés ;
- les rôles système sont immuables dans l’administration courante ;
- seuls le Fondateur et les Super administrateurs peuvent gouverner la définition des rôles personnalisés ;
- les rôles personnalisés exigent une justification métier et ne peuvent pas cloner exactement un rôle actif ;
- les permissions Platform sont granulaires et appliquées côté backend ;
- le registre applicatif de permissions Platform est actif ;
- l’invitation Platform est sécurisée et distincte d’une invitation Workspace ;
- suspension, réactivation et retrait d’un membre fonctionnent sans corrompre le User ;
- les actions critiques sont auditées ;
- l’interface utilise le vocabulaire français retenu ;
- les composants partagés sont réutilisés ;
- les reliquats frontend legacy d’autorité Platform sont retirés ;
- tests backend ciblés et globaux sont verts ;
- tests frontend ciblés et globaux sont verts ;
- build frontend production est vert ;
- la documentation canonique est alignée sur le comportement réellement implémenté.

---

## 17. Décisions figées D-018

```text
Fondateur
→ autorité historique protégée, distincte du rôle RBAC
→ exactement un à la fois
→ toujours Super administrateur

Super administrateur
→ plusieurs possibles
→ toutes les permissions Platform présentes et futures
→ seul niveau recevant les permissions RÉSERVÉES

PlatformTeamMember
→ séparation entre identité User et appartenance à l’équipe interne
→ un seul rôle Platform courant
→ aucune permission directe par utilisateur

Rôles système
→ presets stables du Core
→ non modifiables
→ non archivables
→ non supprimables depuis l’administration courante

Rôles personnalisés
→ création / modification / archivage : Fondateur ou Super administrateur uniquement
→ clé opaque backend immuable
→ justification métier explicite
→ permissions issues du registre actif uniquement
→ jamais de permission RÉSERVÉE
→ aucun clone exact du jeu de permissions d’un rôle actif
→ archivage seulement sans membre ACTIVE/SUSPENDED
→ aucune suppression physique dans le workflow courant

PlatformPermission
→ code-owned uniquement
→ catalogue technique data-driven
→ niveaux DÉLÉGABLE / SENSIBLE / RÉSERVÉE
→ registre extensible par les SaaS dérivés

PlatformInvitation
→ invitation dédiée, temporaire, révocable, à usage unique
→ temporalité UI uniquement à partir de données backend réelles

Interface française
→ afficher « Plateforme », « Fondateur », « Super administrateur »
→ conserver `Platform` dans le code technique
```
