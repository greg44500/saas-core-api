# SAAS-CORE-API — Contrat de configuration commerciale générique

**Date :** 3 septembre 2026  
**Statut :** référence d’architecture active  
**Périmètre :** réutilisation du Core, paramétrage des offres, Free, Trial, features, limits, catalogue et données de déploiement

---

## 1. Objet

`saas-core-api` est un socle SaaS générique destiné à être copié/cloné afin de créer une nouvelle application, puis complété par des modules métier propres à cette application.

Le Core fournit le **moteur commercial générique**. Il ne doit pas figer la **stratégie commerciale finale** d’une application dérivée.

Principe directeur :

```text
Core
→ mécanismes génériques de Plan / Subscription / Trial / Entitlement / quotas

Application dérivée
→ catalogue réel, prix, limites, fonctionnalités, politique commerciale et modules métier
```

Aucune logique métier propre à une future application ne doit être introduite dans le Core uniquement pour anticiper un usage futur.

---

## 2. Workflow de création d’une application dérivée

Le flow cible est :

```text
1. Copier / cloner saas-core-api
2. Créer le nouveau dépôt de l’application
3. Configurer les variables d’environnement techniques et les secrets
4. Initialiser la base et les seeds Core nécessaires
5. Vérifier les tests Core
6. Définir le catalogue commercial de l’application dérivée
7. Ajouter les permissions / capabilities / métriques propres au domaine
8. Ajouter les modules métier
9. Développer les interfaces métier
10. Intégrer le provider de paiement lorsque nécessaire
```

La dépendance architecturale doit rester :

```text
MODULE MÉTIER
      ↓
     CORE
```

et jamais :

```text
CORE
  ↓
MODULE MÉTIER
```

Le Core ne doit donc importer aucun module métier d’une application dérivée.

---

## 3. Responsabilité du moteur commercial Core

Le Core peut fournir et maintenir les concepts génériques suivants :

```text
Plan
Subscription
TrialEligibility
Entitlement effectif
Feature / capability
Limit
UsageMetric
EntitlementOverride éventuel
règles upgrade / downgrade / résiliation
administration Platform des offres
```

Ces concepts définissent **comment** fonctionne une offre commerciale.

Ils ne doivent pas imposer **quelle** offre une application doit vendre.

---

## 4. Configuration commerciale propre à chaque application

Après clonage, chaque application doit pouvoir définir indépendamment :

```text
nom des plans
clé des plans
ordre d’affichage
description
activation / archivage
devise
prix mensuel HT
prix annuel HT
périodicités disponibles
trial activé ou non
durée du trial
features incluses
limits / quotas
métriques métier
positionnement Free / payant
règles commerciales compatibles avec le moteur Core
```

Les valeurs commerciales ne doivent pas être codées en dur dans la logique applicative du Core.

Interdit :

```js
if (plan.key === 'premium') {
    // autoriser une fonctionnalité
}
```

Attendu :

```text
contrôle d’une capability stable
ou
contrôle d’une limite stable
```

---

## 5. Le plan Free

Le Core conserve la capacité native de fonctionner avec une **baseline Free**.

Dans l’architecture V1 actuelle, la création d’un Workspace initialise une Subscription baseline vers un Plan Free actif.

Le plan Free doit toutefois être compris comme une **configuration catalogue**, pas comme un ensemble de prix, features ou limites codés en dur.

Règles :

- `free` peut être fourni comme plan initial par défaut du Core ;
- son prix est nul ;
- il n’a pas de trial ;
- ses features restent paramétrables ;
- ses limits restent paramétrables ;
- il doit pouvoir être rendu très limité selon l’application dérivée ;
- le moteur Core ne doit pas supposer une liste fixe de features Free ;
- le moteur Core ne doit pas supposer un nombre fixe de membres, fichiers, stockage ou autres métriques Free.

Toute évolution future visant à permettre une application sans offre Free devra faire l’objet d’une décision d’architecture explicite, car le fallback actuel de l’entitlement repose sur cette baseline.

---

## 6. Trial générique par Plan

Le Core fournit un mécanisme générique de trial configurable par Plan :

```text
trialEnabled
trialDurationDays
```

Règles structurelles conservées :

- Free ne reçoit pas de trial ;
- seuls les plans actifs et explicitement éligibles peuvent démarrer un trial ;
- la durée est définie par le plan catalogue ;
- aucun moyen de paiement n’est requis dans le mécanisme V1 actuel pour commencer un trial ;
- `TrialEligibility` empêche la recréation artificielle d’essais ;
- changer de plan pendant un trial ne réinitialise jamais `trialEndsAt` ;
- un retour volontaire vers Free termine le trial sans restaurer l’éligibilité ;
- un transfert d’ownership ne recrée pas le trial ;
- le backend reste l’autorité de validité du trial.

Le Core ne doit pas imposer une durée unique de trial à toutes les applications dérivées.

---

## 7. Features et limits

La séparation suivante est obligatoire :

```text
feature
→ la capacité existe-t-elle commercialement ?

limit
→ quelle quantité est autorisée ?
```

Exemples Core génériques :

```text
feature
file_upload

limits
members
storage_bytes
file_uploads_monthly
```

Après clonage, une application peut étendre les registres avec ses propres capabilities et métriques.

Exemple conceptuel LMS, uniquement après clonage :

```text
features
course_management
assessments
certificates

limits
learners
courses
```

Ces clés métier ne doivent pas être ajoutées au dépôt Core tant qu’elles n’appartiennent pas au Core lui-même.

---

## 8. Prix et catalogue

Les prix doivent être des données catalogue persistées, modifiables dans le cadre de l’administration prévue, et non des constantes du code métier.

Le modèle actuel peut exposer notamment :

```text
currency
priceMonthlyExclTaxMinor
priceYearlyExclTaxMinor
```

Règles :

- utiliser des minor units ;
- ne pas calculer les droits à partir du nom ou du prix d’un plan ;
- ne pas considérer un montant historique comme une constante du Core ;
- toute valeur de démonstration ou de seed doit être identifiable comme configuration initiale ;
- le provider de paiement reste distinct du moteur d’entitlement.

Les références historiques `Premium = 79 € HT/mois`, `Free/Premium/IA` sont des choix de catalogue de travail du projet et non des invariants réutilisables du Core.

---

## 9. Données `.env` vs données commerciales

Les variables d’environnement doivent être réservées principalement aux paramètres techniques de déploiement et aux secrets.

### `.env`

Exemples :

```text
DATABASE_URL
JWT_ACCESS_SECRET
TRIAL_IDENTITY_SECRET
CLIENT_URL
SMTP_USER
SMTP_PASSWORD
clés provider de paiement futures
configuration de stockage / antivirus / infrastructure
```

### Base de données / seeds / administration Platform

Exemples :

```text
plans
prix
devise
trialEnabled
trialDurationDays
features
limits
ordre d’affichage
activation / archivage
```

Ne pas déplacer les prix et quotas ordinaires dans `.env` uniquement pour les rendre configurables.

---

## 10. Seeds commerciaux

Le Core peut fournir un seed initial idempotent permettant de démarrer une instance exploitable.

Le seed ne doit toutefois pas transformer les valeurs initiales en constantes immuables.

Règles :

- un seed peut créer le Plan Free de baseline ;
- il peut créer des plans d’exemple ou de démarrage si le projet le décide ;
- il ne doit pas réécrire silencieusement un Plan déjà administré ;
- une application dérivée doit pouvoir remplacer / compléter la configuration catalogue selon son besoin ;
- le seed doit rester compatible avec l’administration Platform des Plans.

---

## 11. Administration Platform

Le Core doit permettre à terme une administration commerciale suffisamment générique pour gérer le catalogue de l’application dérivée sans modification du code pour chaque changement de prix ou de quota.

Selon les capacités réellement implémentées, l’administration peut couvrir :

```text
création / édition / archivage de Plans
prix et devise
trial
features
limits
ordre d’affichage
lecture des Subscriptions
exceptions commerciales
```

Toute mutation commerciale sensible reste autorisée et validée côté backend.

---

## 12. Entitlement vs RBAC

Le paramétrage commercial ne remplace jamais la sécurité applicative.

```text
Entitlement
→ le Workspace possède commercialement la capacité

RBAC
→ le membre courant est autorisé à exécuter l’action
```

Pour une action payante protégée, les deux conditions peuvent être nécessaires.

Une application dérivée doit pouvoir enregistrer ses permissions métier dans le registre RBAC extensible sans modifier la sémantique du Core.

### 12.1. Dérogations temporelles et retour automatique au Plan

Une `EntitlementOverride` reste une exception Workspace-scoped portant sur une seule capability. Elle peut accorder ou retirer une feature, ou remplacer temporairement une limite, sans modifier le Plan catalogue partagé.

Règles temporelles :

```text
startsAt <= maintenant
ET
endsAt est null OU endsAt > maintenant
ET
revokedAt est null
→ override actif
```

À l’instant `endsAt`, la dérogation cesse automatiquement d’être effective. Le moteur ne restaure pas une ancienne valeur mémorisée : il recalcule l’entitlement depuis le **Plan courant**, puis applique uniquement les overrides encore actifs.

Conséquences :

- aucune reconnexion utilisateur n’est nécessaire à `startsAt` ou `endsAt` ;
- l’authentification reste séparée des droits commerciaux dynamiques ;
- le backend reste l’autorité et refuse immédiatement une capability devenue indisponible ;
- le frontend peut recevoir une prochaine échéance d’entitlement afin de refetch au bon moment ;
- un refetch au retour sur l’onglet couvre les timers navigateur retardés ;
- un toast n’est affiché que lorsqu’un changement effectif est réellement constaté ;
- si la page courante dépend d’une feature qui vient de disparaître, l’UI redirige vers une route autorisée sans forcer de logout.

L’historique de la dérogation expirée est conservé pour l’audit commercial ; l’expiration temporelle ne supprime jamais le document.

---

## 13. Workspace et politique commerciale

Dans le Core V1 actif :

```text
Subscription.workspace
UsageMetric.workspace
```

restent Workspace-scoped.

La capacité technique pour un User d’appartenir à plusieurs Workspaces ne définit pas automatiquement une politique commerciale multi-workspace.

Le Core ne doit pas réintroduire sans décision explicite :

```text
CommercialAccount obligatoire
abonnement unique couvrant plusieurs Workspaces
quota de Workspaces par Plan
scope commercial_account
```

Une application dérivée pourra faire évoluer cette architecture si son modèle économique réel l’exige, mais cela constituera alors une évolution structurante du produit dérivé, pas une hypothèse imposée au Core V1.

---

## 14. Modules métier après clonage

Les modules métier sont ajoutés uniquement dans l’application dérivée.

Exemple conceptuel :

```text
saas-core-api
      ↓ clone
formation-saas
      ├── Core existant
      ├── configuration commerciale spécifique
      └── modules métier Learning
```

Le module métier peut exploiter :

```text
User
Workspace
RBAC
Plan / Entitlement
UsageMetric
Files
Audit
```

mais le Core ne doit pas dépendre des modèles métier.

---

## 15. Garde-fous obligatoires

Ne jamais :

```text
coder un prix final dans une règle d’autorisation
coder une feature à partir de plan.key
imposer Free/Premium/IA comme catalogue universel
imposer 79 € comme prix structurel
imposer une durée de trial globale
ajouter dans le Core des permissions ou métriques propres à un domaine futur
utiliser .env comme catalogue commercial ordinaire
confondre entitlement et permission RBAC
modifier un Plan catalogue pour accorder une exception à un seul Workspace
réintroduire CommercialAccount sans nouveau besoin produit démontré
```

Toujours :

```text
rendre les plans pilotés par les données
conserver features et limits séparées
résoudre les droits commerciaux côté backend
conserver le trial paramétrable par Plan
conserver une baseline Free cohérente avec le modèle V1
permettre l’extension des registres après clonage
séparer configuration technique et configuration commerciale
maintenir les contrats frontend/backend lorsque le DTO observable change
```

---

## 16. Documents liés et ordre d’autorité

Documents à maintenir ensemble :

```text
docs/commercial-configuration-contract.md
docs/commercial-plans-entitlements-platform-admin.md
docs/frontend-backend-subscription-contract.md
docs/backend-implementation-checklist.md
docs/frontend-backend-integration-contract.md
```

Répartition des responsabilités :

```text
commercial-configuration-contract.md
→ définit la généricité et le paramétrage du moteur commercial du Core

commercial-plans-entitlements-platform-admin.md
→ définit l’architecture commerciale active V1 et les entitlements Platform/Workspace

frontend-backend-subscription-contract.md
→ définit le contrat HTTP observable par le frontend

backend-implementation-checklist.md
→ suit l’état réel d’implémentation
```

En cas de contradiction historique sur `Premium = 5 workspaces`, `CommercialAccount` obligatoire ou un prix particulier considéré comme invariant, la décision active est : **ces éléments ne font pas partie du contrat générique du Core V1**.

---

## 17. Décision figée

`saas-core-api` doit rester un **socle SaaS générique clonable**.

Il fournit :

```text
les mécanismes
les invariants de sécurité
les contrats techniques
les points d’extension
```

L’application dérivée fournit :

```text
le métier
le catalogue commercial final
les prix
les capabilities métier
les métriques métier
les choix de positionnement produit
```

Cette séparation est un invariant de maintenabilité et de réutilisabilité du projet.