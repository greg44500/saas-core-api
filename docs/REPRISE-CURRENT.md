# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il doit être mis à jour en place à chaque checkpoint significatif et ne doit pas être dupliqué sous forme de synthèses datées. Il sera supprimé lorsque le SAAS-CORE-API sera considéré comme finalisé et que sa documentation canonique sera complète.

## 1. Rôle du document

`REPRISE-CURRENT.md` sert uniquement à reprendre le travail entre deux conversations ou deux sessions de développement.

Il n'est **pas une source normative**. En cas de contradiction, l'ordre d'autorité est :

1. code actuel et contraintes de base de données ;
2. tests automatisés validés ;
3. contrats canoniques actifs ;
4. architecture, sécurité et conventions actives ;
5. registre de dette actif ;
6. présent document de reprise.

Git conserve l'historique de ses versions ; aucune archive documentaire datée supplémentaire n'est nécessaire.

## 2. État de reprise

Le développement fonctionnel est temporairement suspendu avant la poursuite du bloc **F10.6** afin de finaliser le chantier documentaire du Core.

Objectif immédiat : obtenir une documentation unique, cohérente, maintenable et adaptée à un socle SaaS destiné à être réutilisé pour plusieurs applications métier.

Aucune logique applicative backend ou frontend ne doit être modifiée dans ce chantier documentaire, sauf décision explicite séparée si l'audit révèle une incohérence de code.

## 3. Principes documentaires validés

- centraliser la documentation structurante dans `docs/` à la racine ;
- conserver une séparation logique backend/frontend sans deux silos documentaires concurrents ;
- consolider les documents redondants avant toute suppression ;
- ne supprimer aucun fichier sans validation explicite préalable ;
- maintenir un registre unique des dettes ;
- maintenir un contrat Core canonique à la frontière frontend/backend ;
- maintenir une documentation dédiée à la création et à la maintenance des SaaS dérivés ;
- créer le `README.md` racine après stabilisation des chemins documentaires ;
- utiliser uniquement `REPRISE-CURRENT.md` pour les futures reprises de développement.

## 4. Documents canoniques déjà créés

```text
docs/README.md
docs/DEBT.md
docs/REPRISE-CURRENT.md

docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md
```

Documents encore à produire :

```text
docs/architecture/ARCHITECTURE.md
docs/architecture/BACKEND.md
docs/architecture/FRONTEND.md
docs/security/SECURITY.md
docs/frontend/FRONTEND-GUIDELINES.md
docs/derived-saas/DERIVED-SAAS.md
docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md
docs/operations/OPERATIONS.md
README.md racine
```

Cette arborescence pourra être simplifiée si un document séparé n'apporte pas de valeur réelle.

## 5. Checkpoints documentaires

### DOC-0 — terminé

- `docs/DEBT.md` est le registre canonique unique des dettes actives ;
- `docs/REPRISE-CURRENT.md` est l'unique synthèse de reprise temporaire.

### DOC-1 — terminé

- inventaire des documentations racine et frontend réalisé ;
- fragmentation contrats / frontend / dettes / conformité / rapports confirmée ;
- `docs/README.md` créé comme index canonique et tableau de migration ;
- centralisation future dans `docs/` confirmée ;
- aucun fichier historique supprimé ou déplacé.

### DOC-2 — terminé

Trois contrats canoniques ont été créés après recoupement des anciens contrats avec le code courant :

```text
docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md
```

Corrections importantes figées par rapport à certains anciens documents :

- la clé technique d'un nouveau Plan est générée par le backend à partir de l'ObjectId et n'est plus saisie par le SUPER_ADMIN ;
- le catalogue public des Plans n'expose plus cette clé technique ;
- le rôle structurel de la baseline est porté par `systemRole = baseline` / `isBaseline`, indépendamment du nom commercial `Free` ;
- les valeurs Workspace d'entitlement exposent les features et limites effectives après composition des EntitlementOverride actifs ;
- les métadonnées internes des overrides restent réservées à Platform ;
- `team_management` protège désormais les surfaces membres, invitations et rôles ;
- `audit_logs` protège la consultation des AuditLogs Workspace mais jamais leur production de sécurité ;
- la politique commerciale V1 reste Workspace-scoped et ne réintroduit pas `CommercialAccount` ;
- `ACTIVE_PLAN_CAPABILITY_REGISTRY` reste l'autorité runtime pour Plans, quotas et overrides ;
- aucune capability métier ne peut être créée librement depuis Platform.

Anciens contrats dont le contenu normatif utile est désormais absorbé mais qui restent physiquement présents jusqu'à autorisation de suppression :

```text
docs/frontend-backend-integration-contract.md
docs/frontend-backend-account-security-contract.md
docs/frontend-backend-roles-permissions-contract.md
docs/frontend-backend-subscription-contract.md
docs/frontend-platform-admin-contract.md
docs/commercial-configuration-contract.md
docs/commercial-plans-entitlements-platform-admin.md
docs/application-capability-registry-contract.md
```

Aucune suppression n'a été effectuée.

## 6. Prochain ordre de travail documentaire

Le prochain lot est **DOC-3 — Architecture globale, backend et frontend**.

Objectifs :

1. vérifier l'architecture réellement présente dans le dépôt ;
2. formaliser la frontière Core / application dérivée ;
3. formaliser l'architecture modulaire backend et les responsabilités route/controller/service/model/validation/tests ;
4. formaliser l'architecture frontend par fonctionnalités et la séparation pages/composants/state/API ;
5. absorber les anciens documents d'architecture encore valides ;
6. préparer ensuite DOC-4 Sécurité et DOC-5 Guidelines frontend.

## 7. Finalisation fonctionnelle du SAAS-CORE-API

Après validation du chantier documentaire complet, reprendre à partir de **F10.6** puis établir une feuille de route complète des lots restant réellement nécessaires pour déclarer le Core finalisé.

Cette feuille de route devra distinguer :

- obligations du Core générique ;
- dettes pouvant rester conditionnelles pour un SaaS dérivé ;
- exigences bloquantes avant production ;
- tests et audit de sécurité ;
- préparation de la distribution du Core.

## 8. Distribution et maintenance des futurs SaaS

Exigence structurante : **les futurs SaaS dérivés doivent pouvoir recevoir de façon maîtrisée les correctifs et évolutions compatibles du Core sans écraser leurs modules métier.**

La politique finale devra définir au minimum :

- versionnement du Core ;
- identification de la version du Core utilisée par chaque SaaS dérivé ;
- séparation claire entre code Core et code métier ;
- stratégie de synchronisation des changements Core ;
- gestion des migrations de schéma et de configuration ;
- tests de non-régression lors d'une mise à niveau ;
- procédure de résolution des conflits ;
- politique de compatibilité et de breaking changes.

Un GitHub Template pourra servir à initialiser une application, mais ne constitue pas à lui seul une stratégie complète de maintenance.

## 9. Critère de suppression de ce fichier

`docs/REPRISE-CURRENT.md` pourra être supprimé lorsque :

- le SAAS-CORE-API sera considéré comme finalisé ;
- la documentation canonique sera complète et auditée ;
- le plan de distribution/versionnement du Core sera opérationnel ;
- aucune reprise de développement Core ne nécessitera plus de contexte temporaire.

La suppression nécessitera une validation explicite avant exécution.
