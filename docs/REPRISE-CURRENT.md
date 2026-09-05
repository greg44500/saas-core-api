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

## 3. Chantier documentaire en cours

### Principes validés

- centraliser la documentation structurante dans le dossier `docs/` à la racine ;
- conserver une séparation **logique** backend/frontend sans maintenir deux silos documentaires concurrents ;
- consolider les documents redondants avant toute suppression ;
- ne supprimer aucun fichier sans validation explicite préalable ;
- maintenir un registre unique des dettes ;
- maintenir un contrat Core canonique à la frontière frontend/backend ;
- maintenir une documentation dédiée à la création des SaaS dérivés ;
- créer le `README.md` racine après stabilisation des chemins documentaires ;
- utiliser uniquement `REPRISE-CURRENT.md` pour les futures reprises de développement.

### Documents canoniques cibles

La structure cible sera consolidée progressivement autour de :

- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/BACKEND.md`
- `docs/architecture/FRONTEND.md`
- `docs/contracts/CORE-CONTRACT.md`
- `docs/contracts/COMMERCIAL.md`
- `docs/contracts/CAPABILITIES.md`
- `docs/frontend/FRONTEND-GUIDELINES.md`
- `docs/security/SECURITY.md`
- `docs/derived-saas/DERIVED-SAAS.md`
- `docs/compliance/COMPLIANCE.md`
- `docs/compliance/rgpd-data-tracker-inventory.md`
- `docs/operations/OPERATIONS.md`
- registre unique de dette (`DEBT.md`, emplacement final à figer lors de la réorganisation)
- `docs/REPRISE-CURRENT.md`
- `README.md` à la racine.

Cette arborescence pourra être simplifiée si l'audit démontre qu'un document distinct n'apporte pas de valeur suffisante.

## 4. Dette documentaire déjà traitée

Un registre canonique `docs/DEBT.md` a été créé pour centraliser les dettes actives et éviter la multiplication de fichiers représentant plusieurs états concurrents d'une même dette.

Les anciens documents de dette ne doivent pas être supprimés avant extraction et vérification de leurs informations encore valides.

## 5. Prochain ordre de travail documentaire

1. terminer l'inventaire et la classification des documents existants ;
2. vérifier les documents structurants contre le code et les tests actuels ;
3. consolider le contrat Core ;
4. consolider l'architecture backend/frontend ;
5. consolider la sécurité ;
6. consolider les règles et composants frontend ;
7. formaliser la création et l'extension d'un SaaS dérivé ;
8. consolider conformité/RGPD ;
9. consolider opérations, seeds, migrations et jobs ;
10. mettre à jour le registre de dette ;
11. proposer explicitement les fichiers devenus supprimables ;
12. supprimer uniquement après accord ;
13. générer le `README.md` racine final ;
14. effectuer un audit documentaire global (liens, contradictions, références obsolètes).

## 6. Finalisation fonctionnelle du SAAS-CORE-API

Après validation du chantier documentaire, reprendre à partir de **F10.6** puis établir une feuille de route complète des lots restant réellement nécessaires pour déclarer le Core finalisé.

Cette feuille de route devra distinguer :

- obligations du Core générique ;
- dettes pouvant rester conditionnelles pour un SaaS dérivé ;
- exigences bloquantes avant production ;
- tests et audit de sécurité ;
- préparation de la distribution du Core.

## 7. Distribution et maintenance des futurs SaaS

Le choix entre clone Git classique, GitHub Template repository, fork ou autre mécanisme ne doit pas être arrêté uniquement sur la facilité de création d'un nouveau dépôt.

Exigence structurante : **les futurs SaaS dérivés doivent pouvoir recevoir de façon maîtrisée les correctifs et évolutions compatibles du Core sans écraser leurs modules métier.**

La politique finale devra donc définir au minimum :

- versionnement du Core ;
- identification de la version du Core utilisée par chaque SaaS dérivé ;
- séparation claire entre code Core et code métier ;
- stratégie de synchronisation des changements Core ;
- gestion des migrations de schéma et de configuration ;
- tests de non-régression lors d'une mise à niveau ;
- procédure de résolution des conflits lorsqu'un SaaS dérivé a personnalisé une zone du Core ;
- politique de compatibilité et de breaking changes.

Un GitHub Template pourra servir à **initialiser** une application, mais ne devra être retenu comme stratégie complète de maintenance qu'avec un mécanisme supplémentaire de mise à niveau du Core.

## 8. Critère de suppression de ce fichier

`docs/REPRISE-CURRENT.md` pourra être supprimé lorsque :

- le SAAS-CORE-API sera considéré comme finalisé ;
- la documentation canonique sera complète et auditée ;
- le plan de distribution/versionnement du Core sera opérationnel ;
- aucune reprise de développement Core ne nécessitera plus de contexte temporaire.

La suppression nécessitera une validation explicite avant exécution.
