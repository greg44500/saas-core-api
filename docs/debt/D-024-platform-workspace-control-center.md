# D-024 — Console d’administration Platform contextualisée du Workspace

**Statut :** DIFFÉRÉ — cible Core 1.1  
**Périmètre :** administration Platform du Workspace, principalement frontend avec extensions backend additives uniquement si nécessaires  
**Blocage Core 1.0 :** non  
**Dépendances :** Core 1.0 stabilisé et stratégie de distribution réellement validée par D-015, D-016 et D-017  
**Déclencheur :** décision produit du 2026-09-16 — centraliser l’administration d’un workspace dans une surface contextualisée unique sans fusionner les responsabilités des domaines sous-jacents.

---

## 1. Objectif

Faire du Workspace l’unité de contexte principale de son administration Platform.

Depuis la liste des workspaces, l’ouverture d’un workspace doit permettre à un administrateur Platform autorisé de comprendre rapidement son état global puis d’accéder, dans une surface unique et organisée, aux principales informations et actions Platform qui concernent ce workspace.

Le besoin visé est une centralisation de l’expérience d’administration, pas une fusion technique des domaines.

```text
Workspace sélectionné
→ contexte administratif unique
→ informations et actions regroupées par domaine
→ composants/services existants réutilisés
```

---

## 2. État actuel constaté

Le Core 1.0 possède déjà :

- une page Platform dédiée aux workspaces ;
- un drawer de détail Workspace ;
- les actions Platform de suspension/réactivation ;
- l’autorisation exceptionnelle temporaire de transfert de propriété ;
- une page Platform Abonnements avec ses propres actions ;
- une page Platform Dérogations filtrable par `workspaceId` ;
- les composants partagés `DataTable`, Drawer, Dialog, formulaires et états asynchrones ;
- RTK Query comme source d’état serveur.

La dette ne remet pas en cause ces domaines ni leurs règles métier. Elle vise à améliorer leur orchestration autour d’un workspace donné.

---

## 3. Principe UX cible

Le drawer de détail du Workspace évolue vers une console d’administration contextualisée organisée par onglets ou sections équivalentes.

Structure cible de référence :

### 3.1 Vue d’ensemble

Présenter les informations nécessaires pour comprendre immédiatement le workspace, selon les données réellement disponibles :

- nom et identifiant ;
- statut administratif ;
- propriétaire ;
- dates principales ;
- plan effectif ;
- état de la souscription ;
- trial lorsque applicable ;
- principaux usages ou quotas pertinents ;
- alertes administratives significatives lorsque leur source est autoritative.

Cette vue reste synthétique. Elle ne doit pas dupliquer tous les écrans spécialisés.

### 3.2 Abonnement

Regrouper le contexte commercial du workspace et les actions Platform autorisées :

- plan / baseline ;
- souscription commerciale ;
- statut ;
- cycle de vie ;
- trial ;
- périodicité ;
- paramètres commerciaux réellement exposés par les contrats existants ;
- actions d’administration déjà autorisées côté backend.

La logique métier Subscription reste dans ses services et endpoints existants.

### 3.3 Dérogations

Afficher les dérogations du workspace dans leur contexte :

- actives ;
- programmées lorsque applicable ;
- expirées ou révoquées lorsque pertinent ;
- fonctionnalité ou métrique concernée ;
- période ;
- origine ;
- groupe FEATURE + LIMIT lorsque applicable ;
- création, modification ou révocation selon les permissions et contrats existants.

Le drawer doit réutiliser les composants et mutations du domaine Entitlement Override au lieu de créer un second système de gestion.

### 3.4 Administration

Regrouper les opérations Platform de gouvernance et de cycle de vie :

- suspendre ;
- réactiver ;
- motif et contexte de suspension ;
- autorisation exceptionnelle temporaire de transfert de propriété ;
- révocation de cette autorisation ;
- futures opérations gouvernées explicitement ajoutées au Core, notamment D-023 lorsqu’elle sera implémentée.

Les actions sensibles restent contrôlées, confirmées, autorisées et auditées côté backend.

### 3.5 Alertes & activité

Présenter les situations nécessitant potentiellement l’attention d’un administrateur et l’historique utile lié au workspace, uniquement à partir de sources autoritatives existantes.

Exemples possibles selon les domaines réellement implémentés :

- workspace suspendu ;
- souscription dans un état problématique ;
- trial arrivant à échéance ;
- quota atteint ou proche d’une limite lorsqu’une politique le justifie ;
- dérogation expirant prochainement ;
- capacité exceptionnelle temporairement active ;
- événements d’audit administratifs significatifs.

Le terme `Incident` n’implique pas à lui seul la création d’un nouveau modèle ou domaine. Un domaine Incident ne doit être créé que si un besoin métier autonome, un cycle de vie et des responsabilités spécifiques le justifient.

---

## 4. Règles d’architecture obligatoires

### 4.1 Centraliser le contexte, pas le code métier

Le composant principal du drawer agit comme orchestrateur.

Il ne doit pas devenir un composant monolithique contenant directement toutes les règles, formulaires, mutations et affichages des domaines Subscription, Entitlement, Audit ou Workspace.

Structure attendue de principe :

```text
PlatformWorkspaceControlDrawer
→ WorkspaceOverviewTab
→ WorkspaceSubscriptionTab
→ WorkspaceOverridesTab
→ WorkspaceAdministrationTab
→ WorkspaceActivityTab
```

Les noms définitifs peuvent évoluer lors de l’implémentation, mais la séparation des responsabilités doit être conservée.

### 4.2 Réutilisation obligatoire

- réutiliser les composants Platform/domaines existants lorsque pertinent ;
- ne pas dupliquer DataTable, formulaires, badges, drawers ou confirmations ;
- conserver les appels serveur dans RTK Query ;
- conserver la logique métier dans les services backend ;
- conserver les validations backend comme autorité ;
- utiliser `useState` uniquement pour les états locaux d’interface qui ne constituent pas de l’état serveur.

### 4.3 Pages globales conservées

Les pages Platform globales restent nécessaires.

```text
vue globale
→ administrer tous les abonnements / toutes les dérogations / tous les workspaces

vue contextualisée
→ administrer les éléments relatifs à un workspace précis
```

La console Workspace ne remplace donc pas les vues transverses. Elle offre un second point d’entrée réutilisant les mêmes domaines.

### 4.4 Chargement à la demande

L’ouverture du drawer ne doit pas déclencher sans nécessité toutes les requêtes de tous les domaines.

Principe attendu :

```text
ouverture du drawer
→ données générales nécessaires

activation d’un onglet spécialisé
→ chargement des données de cet onglet si elles ne sont pas déjà disponibles
```

RTK Query conserve son cache et ses mécanismes d’invalidation.

### 4.5 État URL

L’état partageable doit rester compatible avec une URL contextualisée.

Le mécanisme actuel fondé sur `workspaceId` doit être conservé ou étendu proprement. Une forme de type :

```text
/platform/workspaces?workspaceId=<id>&tab=<section>
```

peut être retenue si l’audit d’implémentation confirme sa cohérence avec le routing existant.

Le nom exact du paramètre `tab` n’est pas contractuel à ce stade.

---

## 5. Frontières fonctionnelles

La console Platform expose les informations et opérations nécessaires à l’administration de la plateforme.

Elle ne doit pas :

- reproduire l’intégralité de l’application utilisateur du workspace ;
- rendre les fonctionnalités métier du SaaS administrables depuis Platform sans besoin explicite ;
- contourner les permissions Workspace ou Platform ;
- exposer une donnée uniquement parce qu’elle existe en base ;
- inventer un statut de paiement ou d’incident absent d’une source autoritative ;
- déplacer une règle métier du backend vers le frontend.

Le domaine Billing/Payment réel reste distinct de Subscription. Les futurs événements de paiement ne devront apparaître dans la console que lorsque le produit disposera d’un provider et d’un contrat autoritatif correspondant.

---

## 6. Impact attendu sur Core 1.0

D-024 ne bloque pas Core 1.0.

Le fonctionnement actuel de l’administration Platform reste utilisable et les utilisateurs Workspace ne dépendent pas de cette centralisation pour travailler dans leur espace.

La dette est volontairement différée après stabilisation/versionnement du Core afin d’éviter qu’une amélioration d’ergonomie Platform retarde indéfiniment la première release stable.

L’implémentation D-024 devra néanmoins commencer par un audit réel des contrats API existants. Toute extension backend nécessaire devra être additive, strictement validée et préserver les contrats Core existants sauf décision de versionnement explicite.

---

## 7. Ordre de reprise attendu

D-024 doit être ouverte uniquement après validation de la stratégie Core 1.0 :

```text
D-015 versionnement / provenance / migrations
→ D-016 Playwright E2E Core
→ D-017 dérivation et upgrade pilote
→ corrections et gate finale
→ release Core 1.0 stable
→ D-024 console Platform contextualisée du Workspace
```

D-017 n’a pas imposé de modification incompatible des points d’extension ou de la stratégie de distribution ; D-024 reste donc planifiée sur le Core 1.1 stabilisé.

---

## 8. Audit obligatoire avant implémentation

Avant tout code D-024 :

1. vérifier le HEAD stable Core réellement ciblé ;
2. auditer `PlatformWorkspacesPage` et le drawer Workspace existant ;
3. inventorier les composants réutilisables des domaines Workspace, Subscription, Entitlement Override et Audit ;
4. vérifier endpoint par endpoint les lectures disponibles par `workspaceId` ;
5. identifier les données réellement autoritatives nécessaires à chaque onglet ;
6. distinguer les simples besoins de composition frontend des besoins d’API additionnelle ;
7. vérifier les permissions Platform exigées par chaque section/action ;
8. définir les invalidations RTK Query nécessaires après mutation ;
9. vérifier l’accessibilité et le comportement responsive du système d’onglets dans le Drawer ;
10. établir les tests à conserver et les tests additionnels nécessaires avant modification.

Aucune API agrégée ou nouveau modèle ne doit être créé par anticipation si les contrats existants suffisent.

---

## 9. Tests attendus

### Frontend

- ouverture/fermeture du drawer et conservation du contexte URL ;
- navigation clavier et accessibilité des onglets ;
- chargement à la demande des sections ;
- absence de requêtes inutiles pour les onglets non consultés lorsque le design retenu le permet ;
- rendu des états loading/empty/error/forbidden ;
- permissions Platform correctement respectées ;
- réutilisation des composants partagés ;
- mutations depuis la vue contextualisée et invalidation cohérente du cache ;
- non-régression des pages Platform globales.

### Backend

Uniquement si D-024 nécessite de nouveaux contrats :

- validation Zod stricte ;
- isolation et permissions Platform ;
- absence d’escalade de droits ;
- cohérence des projections par `workspaceId` ;
- audit des actions sensibles ;
- tests d’intégration Supertest associés.

### E2E

Mettre à jour ou compléter les parcours Playwright Platform afin de couvrir au minimum :

```text
liste Workspaces
→ ouverture d’un workspace
→ consultation des principales sections
→ action administrative autorisée
→ résultat visible
→ non-régression des pages Platform globales
```

---

## 10. Critère de clôture

D-024 est considérée comme validée lorsque :

- un administrateur Platform peut ouvrir un workspace depuis la liste et obtenir une vision consolidée cohérente ;
- les principales opérations Platform concernant ce workspace sont accessibles dans des sections clairement séparées ;
- les pages Platform globales restent disponibles ;
- aucune logique métier n’est dupliquée dans le drawer ;
- les composants partagés et RTK Query sont réutilisés ;
- les permissions et validations backend restent les autorités ;
- les données spécialisées sont chargées de manière proportionnée ;
- l’état URL reste cohérent ;
- aucune nouvelle notion d’Incident, Billing ou autre domaine n’est inventée sans contrat réel ;
- les tests frontend, backend applicables et E2E sont verts ;
- la validation fonctionnelle et visuelle de la console Platform est confirmée.
