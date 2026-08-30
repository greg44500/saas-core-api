# Dette fonctionnelle — Account Closure / Workspace Closure

## Statut

Décision fonctionnelle validée pour le socle `saas-core-api`.

Cette fonctionnalité n'est pas encore implémentée. Elle constitue une dette fonctionnelle volontairement différée afin de préserver la séparation entre :

- la gestion d'un `WorkspaceMember` ;
- la propriété d'un workspace ;
- la fermeture d'un compte utilisateur ;
- la fermeture ou l'archivage d'un workspace ;
- les obligations de conservation ou de suppression des données.

## 1. Invariant V1 — Owner

Le rôle système `owner` représente la propriété du workspace et non un simple niveau de permissions.

En V1 :

- le créateur du workspace devient son owner unique ;
- l'owner ne peut pas être remplacé par une modification de rôle ;
- aucun autre membre ne peut recevoir le rôle `owner` ;
- l'owner ne peut pas être suspendu via les commandes `WorkspaceMember` ;
- l'owner ne peut pas être supprimé via les commandes `WorkspaceMember` ;
- l'owner ne peut pas se retirer lui-même via le cycle de vie des membres ;
- un rôle personnalisé, même doté de permissions élevées, ne devient jamais un rôle de propriété.

Un éventuel transfert de propriété devra être implémenté ultérieurement comme un workflow métier dédié.

## 2. Principe — Fermeture de compte distincte du membership

La volonté d'un utilisateur de quitter définitivement la plateforme ne doit pas être traitée comme une suppression de `WorkspaceMember`.

Un futur domaine ou workflow `Account Closure` devra gérer explicitement :

1. la demande de fermeture du compte ;
2. les workspaces dont l'utilisateur est owner ;
3. les workspaces dont l'utilisateur est simple membre ;
4. les sessions actives ;
5. les Subscriptions ;
6. les Files ;
7. les AuditLogs ;
8. les données personnelles ;
9. les éventuelles obligations de conservation ;
10. la suppression, l'anonymisation ou la conservation contrôlée des données.

## 3. Politique fonctionnelle cible

### 3.1 Owner seul sur un workspace Free

Lorsque l'utilisateur est l'owner unique, est le seul membre occupant un siège et n'a aucune contrainte commerciale ou opérationnelle empêchant la fermeture, la plateforme devra permettre une fermeture autonome avec confirmation forte.

Cette fermeture ne devra toutefois pas provoquer une suppression MongoDB immédiate et incontrôlée de toutes les données.

Workflow cible :

```text
Demande de fermeture
        ↓
Contrôles d'éligibilité
        ↓
Compte / workspace en pending_deletion
        ↓
Révocation des sessions
Blocage immédiat des accès
        ↓
Délai de sécurité configurable
        ↓
Purge / anonymisation sélective
        ↓
Fermeture définitive
```

### 3.2 Relation commerciale active ou historique

Un compte actuellement sur une offre Free ne doit pas être considéré comme dépourvu d'historique commercial.

La future politique devra distinguer l'état actuel de la Subscription, l'existence éventuelle d'un historique commercial, les futures données Billing et Payment ainsi que les documents financiers ou autres données pouvant être soumises à une durée de conservation spécifique.

Les durées de rétention ne doivent pas être codées arbitrairement. Elles devront être cadrées au moment de l'implémentation à partir des obligations légales et réglementaires réellement applicables.

### 3.3 Owner avec d'autres membres

Si un owner souhaite fermer son compte alors que d'autres membres utilisent encore le workspace, la suppression immédiate doit être refusée.

Le futur workflow devra prévoir, selon la politique produit retenue :

- transfert explicite de propriété ;
- fermeture complète du workspace ;
- intervention de la plateforme ;
- autre mécanisme de gouvernance validé ultérieurement.

Aucun transfert automatique d'ownership ne doit être déduit du rôle ou des permissions d'un membre existant.

## 4. Rôle de la plateforme

La plateforme ne doit pas disposer d'un pouvoir arbitraire permettant de retenir indéfiniment un utilisateur. Son rôle est de contrôler et d'orchestrer le processus lorsque des contraintes empêchent une suppression immédiate.

```text
User demande fermeture
        │
        ├── Free + seul owner
        │       → fermeture autonome
        │
        ├── relation commerciale à clôturer
        │       → workflow de fermeture
        │
        ├── autres membres présents
        │       → transfert / fermeture / intervention
        │
        └── données soumises à rétention
                → purge ou anonymisation sélective
```

## 5. Sécurité

Le futur workflow devra au minimum prévoir :

- authentification obligatoire ;
- réauthentification récente ou confirmation forte ;
- protection contre les requêtes accidentelles ;
- révocation de toutes les sessions au moment où la fermeture devient effective ;
- idempotence de la demande ;
- protection contre les fermetures concurrentes ;
- transaction lorsque plusieurs écritures MongoDB doivent rester cohérentes ;
- AuditLog des étapes sensibles ;
- aucune fuite de secrets ou de données supprimées dans les AuditLogs.

## 6. Impacts techniques futurs

### User

Prévoir un état ou un workflow permettant de distinguer notamment compte actif, fermeture demandée, accès bloqué et compte fermé/anonymisé selon le modèle retenu. Le choix exact ne doit pas être ajouté au modèle avant le cadrage du workflow complet.

### Workspace

Le futur traitement devra définir clairement la différence entre workspace actif, workspace fermé, workspace en attente de suppression et workspace archivé si cette notion est retenue.

### WorkspaceMember

Aucune logique de fermeture de compte ne doit être ajoutée au lifecycle courant. Le module reste responsable uniquement des appartenances `active`, `suspended` et `removed`. Le rôle `owner` reste protégé par les services métier.

### Subscription

Le workflow devra déterminer comment clôturer une Subscription active, traiter un trial, traiter une annulation déjà programmée, conserver l'historique contractuel et interagir plus tard avec Billing et Payment.

### Files

Le workflow devra définir le blocage des nouveaux uploads, le soft delete éventuel, le délai de rétention, la purge physique et la cohérence entre métadonnées MongoDB et stockage physique.

### AuditLog

Les AuditLogs ne doivent pas être supprimés mécaniquement avec le User. Il faudra décider quelles données peuvent être conservées, pseudonymisées, anonymisées ou purgées, en ne conservant que ce qui reste nécessaire à la sécurité, à la traçabilité ou aux obligations applicables.

## 7. Non-objectifs actuels

Cette dette fonctionnelle ne doit pas provoquer maintenant :

- l'ajout d'un endpoint de fermeture de compte ;
- l'ajout d'un endpoint de transfert d'ownership ;
- l'ajout d'un statut supplémentaire à `WorkspaceMember` ;
- la suppression automatique du owner ;
- l'ajout de règles Billing/Payment non encore cadrées ;
- l'introduction prématurée d'une durée légale de rétention.

## 8. Condition de reprise

Cette dette devra être reprise avant de considérer le lifecycle complet `User / Workspace` comme finalisé pour une mise en production réelle.

Le cadrage devra alors couvrir simultanément : UX de fermeture de compte, gouvernance du workspace, ownership, Subscription, Files, sessions, AuditLog, conservation et suppression des données, ainsi que les exigences légales et réglementaires applicables.
