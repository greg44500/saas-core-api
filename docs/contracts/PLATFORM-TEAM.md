# SAAS-CORE-API — Contrat Équipe de la Plateforme et RBAC Platform

**Statut :** cadrage canonique de cible — A1 validé, implémentation à réaliser  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** Core clonable — équipe interne de l’éditeur, autorité Fondateur, rôles et invitations Platform

---

## 1. Objet

Le Core doit permettre à l’éditeur d’un SaaS dérivé de constituer et administrer une équipe interne sans partager un compte `super_admin` ni attribuer à chaque collaborateur des pouvoirs excessifs.

Le modèle cible sépare explicitement :

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

La procédure exacte sera cadrée séparément avant son implémentation si elle est retenue dans le périmètre V1.

---

## 4. Super administrateurs

Le Core autorise plusieurs Super administrateurs.

Le rôle système `super_admin` :

- possède toutes les permissions Platform connues du Core ;
- reçoit également les nouvelles permissions Platform ajoutées ultérieurement au Core ou au SaaS dérivé selon le registre applicatif prévu ;
- ne dépend pas d’une sélection manuelle partielle de permissions ;
- ne peut pas être transformé en rôle personnalisé ;
- ne peut pas être supprimé du catalogue système.

Un Super administrateur peut administrer les autres membres de l’équipe et, sous réserve des protections du Fondateur, les autres Super administrateurs.

Les opérations de promotion, rétrogradation, suspension ou retrait concernant un Super administrateur sont considérées comme hautement sensibles et doivent être auditées.

Le système doit empêcher toute opération qui laisserait la Plateforme sans Super administrateur actif. La protection du Fondateur constitue la première garantie, mais l’invariant doit également être vérifié au niveau métier.

---

## 5. PlatformTeamMember — appartenance à l’équipe interne

### 5.1 Séparation avec User

Un `User` reste une personne pouvant s’authentifier et éventuellement participer à des Workspaces.

Son appartenance à l’équipe interne est une responsabilité différente.

Exemple :

```text
Jean Martin
→ User
→ membre éventuel d’un Workspace client
→ PlatformTeamMember : Support technique
```

Retirer Jean de l’équipe de la Plateforme ne doit donc pas supprimer son `User` ni retirer automatiquement ses appartenances Workspace.

### 5.2 Une appartenance par User

Un User ne possède qu’une appartenance active à l’équipe de la Plateforme à la fois.

Cette appartenance référence son rôle Platform courant.

### 5.3 États fonctionnels

Le cycle cible distingue au minimum :

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

La sécurité ne doit jamais dépendre du libellé humain du poste.

```text
Support technique
→ nom compréhensible
→ permissions explicites
```

Le backend autorise une opération à partir des permissions effectives, pas parce que le rôle s’appelle `support` ou `admin`.

### 6.2 Rôles système

Le Core fournit des rôles système cohérents pour démarrer une équipe :

```text
Super administrateur
Administrateur de la Plateforme
Support technique
Support commercial
Support client
```

`Super administrateur` est réservé et protégé.

Le détail des permissions par défaut des autres rôles système sera figé pendant A2 — RBAC Platform.

### 6.3 Rôles personnalisés

Le Fondateur et les Super administrateurs autorisés doivent pouvoir créer des rôles personnalisés lorsque l’organisation réelle ne correspond pas exactement aux rôles fournis par défaut.

Exemples :

```text
Responsable support
Support niveau 1
Support niveau 2
Responsable grands comptes
Administrateur commercial
```

Un rôle personnalisé :

- possède un nom d’affichage ;
- possède une description facultative ;
- référence un ensemble de permissions autorisées ;
- peut être assigné à plusieurs membres ;
- ne peut jamais obtenir une permission réservée au Super administrateur lorsque le catalogue la classe comme non délégable.

Les règles exactes de modification, archivage et suppression d’un rôle utilisé seront définies pendant A2.

---

## 7. PlatformPermission — droits administratifs

### 7.1 Principe du moindre privilège

Chaque collaborateur reçoit uniquement les pouvoirs nécessaires à sa fonction.

Exemples de familles déjà présentes dans le Core :

```text
vue d’ensemble
utilisateurs
workspaces
plans
subscriptions
entitlement overrides
audit logs
capabilities
```

Le Bloc A ajoutera les permissions nécessaires à :

```text
équipe de la Plateforme
invitations Platform
rôles Platform
assignation des rôles
suspension / réactivation / retrait d’un membre
```

### 7.2 Niveaux de sensibilité

A2 devra classer les permissions Platform au minimum selon leur délégabilité :

```text
DÉLÉGABLE
→ peut appartenir à un rôle personnalisé autorisé

SENSIBLE
→ assignation fortement contrôlée et auditée

RÉSERVÉE
→ Super administrateur uniquement
```

Le catalogue de permissions reste défini par le code de l’application. Un administrateur ne crée pas librement une nouvelle permission technique depuis l’interface.

### 7.3 Autorité serveur

Le frontend peut masquer les menus et actions non accessibles, mais le backend reste l’unique autorité de sécurité.

Les permissions effectives doivent être déterminées à partir de l’état serveur courant afin qu’une suspension ou un changement de rôle prenne effet immédiatement.

---

## 8. PlatformInvitation — invitation dans l’équipe

### 8.1 Invitation distincte de WorkspaceInvitation

Une invitation dans l’équipe de la Plateforme et une invitation dans un Workspace sont deux contrats différents.

```text
WorkspaceInvitation
→ accès à un tenant particulier

PlatformInvitation
→ accès potentiel à l’administration de plusieurs clients
```

Elles peuvent réutiliser des primitives techniques ou UI communes lorsque pertinent, mais elles ne partagent pas automatiquement les mêmes règles métier.

### 8.2 Parcours cible

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

### 8.3 Exigences minimales

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

États fonctionnels attendus :

```text
PENDING
ACCEPTED
EXPIRED
REVOKED
```

Le renvoi d’une invitation ne doit pas créer plusieurs invitations actives ambiguës pour le même besoin.

---

## 9. Gestion de l’équipe

La surface d’administration cible est :

```text
Administration de la Plateforme
└── Équipe de la Plateforme
    ├── Membres
    ├── Invitations
    └── Rôles et permissions
```

Le Fondateur / Super administrateur autorisé doit pouvoir au minimum :

- lister les membres ;
- consulter un membre ;
- inviter un collaborateur ;
- renvoyer une invitation lorsque permis ;
- révoquer une invitation ;
- modifier le rôle d’un membre ;
- suspendre un membre ;
- réactiver un membre ;
- retirer un membre de l’équipe ;
- consulter les rôles et leurs permissions ;
- créer et modifier les rôles personnalisés selon les règles A2.

Les tableaux compatibles doivent réutiliser `DataTable` et les composants partagés existants.

---

## 10. Audit obligatoire

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

## 11. Frontières de sécurité

Le Bloc A doit respecter les invariants suivants :

1. RBAC Platform et RBAC Workspace restent distincts.
2. Un rôle Workspace ne donne jamais un accès Platform.
3. Une permission Platform ne donne pas automatiquement un droit dans un Workspace client.
4. Le Fondateur reste protégé des opérations administratives ordinaires.
5. `super_admin` possède tous les droits Platform mais ne contourne pas les validations métier, transactions, audits et contraintes de données.
6. Un changement de rôle ou de statut Platform prend effet immédiatement côté serveur.
7. Aucune permission technique n’est créée librement depuis le frontend.
8. Les invitations utilisent des secrets temporaires non stockés en clair.
9. Les actions sensibles sont auditées.
10. Les composants frontend masqués ne constituent jamais une barrière de sécurité.

---

## 12. Compatibilité avec l’existant

Le Core possède actuellement :

```text
User.platformRole
PLATFORM_ROLE = user / support / admin / super_admin
PLATFORM_PERMISSION
DEFAULT_PLATFORM_ROLE_PERMISSIONS
authorizePlatformPermission()
authorizePlatformRole()
administration Platform des Users / Workspaces / Plans / Subscriptions / Overrides / AuditLogs
```

État courant important :

```text
super_admin
→ toutes les permissions Platform existantes

admin / support / user
→ aucune permission Platform granulaire par défaut
```

A1 ne supprime aucune de ces protections.

La future implémentation doit prévoir une migration progressive vers le nouveau modèle sans ouvrir temporairement des routes qui étaient auparavant `SUPER_ADMIN` only.

`User.platformRole` ne doit pas être supprimé ou réinterprété brutalement sans stratégie de migration et tests de compatibilité.

---

## 13. Hors périmètre du Bloc A

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
```

Le profil personnel/professionnel et `Organization` seront cadrés dans un bloc distinct.

---

## 14. Découpage d’implémentation après A1

```text
A1 — cadrage fonctionnel Platform Team                  ← présent document
A2 — catalogue RBAC Platform et règles de délégation
A3 — invitations Platform sécurisées
A4 — gestion des membres et cycle de vie Platform
A5 — frontend Équipe de la Plateforme
A6 — audit final + tests sécurité + régression
```

Aucune étape ne doit rendre les droits de `support` ou `admin` plus larges avant que les permissions correspondantes soient explicitement définies et testées.

---

## 15. Critère de clôture du Bloc A complet

Le Bloc A sera considéré validé lorsque :

- le Fondateur est représenté et protégé explicitement ;
- plusieurs Super administrateurs sont supportés ;
- le dernier Super administrateur actif ne peut pas disparaître ;
- les membres Platform sont distincts des Users ordinaires ;
- les rôles système et personnalisés sont gérés ;
- les permissions Platform sont granulaires et appliquées côté backend ;
- l’invitation Platform est sécurisée et distincte d’une invitation Workspace ;
- suspension, réactivation et retrait d’un membre fonctionnent sans corrompre le User ;
- les actions critiques sont auditées ;
- l’interface utilise le vocabulaire français retenu ;
- les composants partagés sont réutilisés ;
- tests backend ciblés et globaux sont verts ;
- tests frontend ciblés et globaux sont verts ;
- build frontend production est vert ;
- la documentation canonique est alignée sur le comportement réellement implémenté.

---

## 16. Décisions figées par A1

```text
Fondateur
→ autorité historique protégée, distincte du rôle RBAC
→ exactement un à la fois
→ toujours Super administrateur

Super administrateur
→ plusieurs possibles
→ toutes les permissions Platform
→ rôle système protégé

PlatformTeamMember
→ séparation entre identité User et appartenance à l’équipe interne

PlatformRole
→ rôle système ou personnalisé
→ agrège des permissions explicites

PlatformPermission
→ autorité réelle des actions administratives

PlatformInvitation
→ invitation dédiée, temporaire, révocable, à usage unique

Interface française
→ afficher « Plateforme », « Fondateur », « Super administrateur »
→ conserver `Platform` dans le code technique
```
