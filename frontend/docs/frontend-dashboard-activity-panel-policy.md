# SAAS-CORE-API — Politique Dashboard, activité et panneaux contextuels

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1 et futurs modules métier

## 1. Objectif

Ce document fixe les règles transverses relatives :

- aux dashboards Workspace et Platform ;
- à l’activité récente et aux AuditLogs ;
- aux zones d’attention et de priorisation ;
- aux indicateurs de capacité/usage ;
- aux panneaux latéraux contextuels ;
- aux modales ;
- aux règles de sauvegarde explicite ou automatique.

Le dashboard ne doit pas être une collection décorative de cartes. Il doit aider l’utilisateur à comprendre rapidement sa situation et à agir.

## 2. Dashboard Workspace — rôle

Le Dashboard Workspace est une surface de synthèse opérationnelle.

Il doit répondre prioritairement à :

```text
Où en est mon workspace ?
Y a-t-il quelque chose qui demande mon attention ?
Quelle est l’action logique suivante ?
```

Structure cible :

```text
Contexte utilisateur / accueil
Éléments à traiter ou surveiller
Indicateurs Core utiles
Actions rapides
Activité récente
Widgets métier futurs
```

## 3. Personnalisation par permissions

Le projet ne crée pas un dashboard distinct par rôle.

La règle est :

```text
même structure générale
+ blocs conditionnels
+ actions selon permissions
```

Les permissions/backend restent l’autorité.

Une information ou action non autorisée ne doit pas être exposée uniquement parce qu’un autre rôle la voit sur le même dashboard.

## 4. Accueil contextuel

Le dashboard peut afficher :

```text
Bienvenue, <prénom>
Bonjour <prénom>
Ravi de vous revoir, <prénom>
```

selon le contexte réel disponible.

Le frontend ne doit pas inventer une dernière connexion.

Un message de retour après une absence significative n’est affiché que si une donnée backend fiable telle que `lastLoginAt` ou `lastActivityAt` existe.

Le seuil d’absence est une configuration UX centralisée, jamais une condition dispersée dans plusieurs composants.

## 5. Indicateurs Workspace

Les indicateurs Core potentiellement utiles sont :

```text
members
storage usage
monthly file uploads
current plan
trial/subscription state
pending invitations
```

Ils ne sont affichés que si l’API expose les données nécessaires de manière fiable et raisonnable.

Aucune limite, quota ou statut métier ne doit être recalculé à partir de constantes frontend si le backend en est l’autorité.

## 6. Composant d’usage réutilisable

Les capacités/quotas doivent utiliser une famille de composants partagée, par exemple :

```text
UsageIndicator
UsageProgress
UsageSummary
```

Cas futurs possibles :

```text
members
storage
uploads
credits
API usage
business capacities
```

Les seuils visuels utilisent des tokens sémantiques, par exemple :

```text
normal
warning
critical
```

sans réinventer une barre de progression différente par module.

## 7. Zone de priorisation

Le dashboard peut contenir des zones :

```text
À traiter maintenant
À surveiller
Informations
```

Les éléments doivent être :

- basés sur une règle fiable ;
- actionnables lorsque possible ;
- non répétitifs ;
- hiérarchisés ;
- non alarmistes sans justification.

Le frontend ne déclare jamais arbitrairement une donnée métier « urgente » ou « critique » sans règle métier correspondante.

## 8. Actions rapides

Les raccourcis utilisent les mêmes routes et mutations que le reste de l’application.

Ils ne créent pas de logique parallèle.

Exemples :

```text
Inviter un membre
Ajouter un fichier
Gérer l’abonnement
Paramètres du workspace
```

Les actions visibles dépendent des permissions effectives.

## 9. Activité récente Workspace

Le Dashboard Workspace peut afficher une sélection d’événements récents provenant de l’AuditLog backend.

Exemples UX :

```text
Jean a téléversé « rapport.pdf » — il y a 12 min
Claudine a modifié le rôle de Martin — il y a 2 h
Le tableau « Prévisions Q4 » a été mis à jour — hier à 16:42
```

Le frontend doit transformer les codes techniques en messages humains.

Exemple :

```text
FILE_UPLOADED
→ Jean a téléversé un fichier
```

La date relative est utilisée pour la lecture rapide. Une date absolue doit rester disponible lorsqu’une précision audit est utile, par exemple au survol, dans un détail, ou dans l’historique complet.

Le dashboard ne remplace pas la page Audit complète. Il affiche une synthèse et propose un accès vers l’historique complet lorsque pertinent.

## 10. Extensibilité vers les futurs modules métier

Le Core doit permettre l’ajout de widgets métier sans réécrire le dashboard de base.

Architecture conceptuelle :

```text
Dashboard Workspace
├── accueil/contextualisation
├── attention/priorités
├── indicateurs Core
├── actions rapides
├── activité récente Core
└── widgets métier injectés par composition
```

Exemples futurs :

```text
restauration
→ évolution coût matière
→ alertes HACCP
→ écarts budgétaires

formation
→ sessions à préparer
→ taux de présence
→ dossiers incomplets

e-commerce
→ évolution tarifaire
→ ruptures probables
→ commandes prioritaires
```

Les futurs widgets doivent réutiliser le design system, les conventions de loading et les composants partagés du Core.

## 11. Dashboard Platform

Le Dashboard Platform est un centre de pilotage global, distinct du Workspace.

Cible UX :

```text
Overview
Users
Workspaces
Subscriptions
Trials
Plans
Attention required
Recent platform activity
```

Aucun KPI n’est inventé si le backend ne l’expose pas.

## 12. Agrégations Platform

Le frontend ne doit pas charger de grandes listes uniquement pour calculer des compteurs.

Une architecture permanente telle que :

```text
GET /platform/users
GET /platform/workspaces
GET /platform/subscriptions
GET /platform/plans
GET /platform/audit-logs
→ agrégation dans le navigateur
```

est déconseillée pour alimenter un Overview.

Un futur endpoint dédié de synthèse, par exemple :

```text
GET /api/platform/overview
```

est recommandé pour fournir les métriques agrégées nécessaires au dashboard Platform.

Cet endpoint est une recommandation d’architecture ; il n’existe pas encore dans le backend actuel.

## 13. Platform Overview V1 sans métriques agrégées

Tant qu’un endpoint agrégé n’existe pas, `/platform/overview` reste utile comme hub de pilotage :

```text
Gestion
→ Users
→ Workspaces

Commercial
→ Plans
→ Subscriptions

Supervision
→ Audit Logs
```

L’ajout de métriques attend la disponibilité backend correspondante.

## 14. États de chargement Dashboard

Politique :

```text
route lazy loading
→ PageLoader

dashboard chargé, données structurantes en attente
→ DashboardSkeleton

refetch d’une seule carte
→ loading local/skeleton local

mutation locale
→ feedback dans l’action
```

Un refetch ne doit pas faire disparaître inutilement tout le dashboard si des données valides sont déjà affichées.

## 15. Empty states Dashboard

Un état vide doit guider l’utilisateur.

Exemple :

```text
Votre workspace est prêt.
Invitez vos premiers collaborateurs ou ajoutez votre premier fichier.
```

avec uniquement les actions autorisées.

Un utilisateur sans aucun workspace relève d’un onboarding distinct, pas d’un simple dashboard vide.

## 16. Responsive Dashboard

L’ordre mobile doit suivre la priorité informationnelle :

```text
1. contexte / accueil
2. éléments à traiter
3. informations principales
4. actions rapides
5. activité récente
6. compléments métier
```

Le responsive ne doit pas être une simple compression mécanique de la grille desktop.

## 17. Panneau latéral contextuel

Pour les listes et tableaux professionnels, un panneau latéral réutilisable est le pattern recommandé pour consulter ou éditer rapidement une entité sans perdre le contexte de la page.

Le terme retenu est :

```text
DetailsPanel / SidePanel / Sheet
```

et non « dropdown ».

Cas d’usage :

```text
member
user
product
file
subscription
order
customer
future business entity
```

Le panneau permet de préserver :

- pagination ;
- filtres ;
- recherche ;
- position dans la liste ;
- contexte visuel de la page.

## 18. Réutilisation du panneau

Le projet ne crée pas une implémentation structurelle différente pour chaque domaine.

Architecture cible :

```text
DetailsPanel primitive/shared structure
├── header
├── close action
├── loading/error states
├── scroll behavior
├── responsive behavior
├── footer actions
└── dirty-state conventions

MemberDetailsPanel
ProductDetailsPanel
SubscriptionDetailsPanel
...
```

Les composants métier composent la primitive commune sans transformer `DetailsPanel` en composant universel sur-paramétré.

## 19. Panneau vs Modal

### Panneau latéral

À privilégier pour :

```text
consultation rapide
édition contextuelle
changement de rôle
changement de statut
métadonnées
actions non destructrices
```

### Modal

À privilégier pour :

```text
confirmation destructive
action irréversible
confirmation de sécurité
petit formulaire indépendant nécessitant l’attention complète
```

Exemple :

```text
MemberDetailsPanel
→ action « Retirer du workspace »
→ modal de confirmation
```

## 20. Choix du contrôle UI selon la donnée

Politique :

```text
booléen
→ Switch

valeur exclusive courte, ex. rôle
→ Select

valeur exclusive recherchable/longue
→ Combobox

choix multiples
→ Checkbox / multi-select selon contexte
```

Un rôle ne doit pas être présenté comme une série de switches s’il s’agit d’une valeur exclusive.

## 21. Sauvegarde explicite vs autosave

La fermeture d’un panneau ne doit pas constituer implicitement une validation d’une modification sensible.

### Modifications significatives

Exemples :

```text
rôle
statut administratif
permissions
valeur métier importante
```

Politique :

```text
modification
→ dirty state
→ Annuler / Enregistrer
→ mutation RTK Query
→ succès/erreur
→ toast ou feedback pertinent
```

### Autosave

L’autosave est réservé aux changements de faible risque et sans ambiguïté, par exemple :

```text
préférence d’affichage
favori
certaines préférences personnelles
```

Un autosave doit fournir un feedback discret et gérer l’échec explicitement.

## 22. Modifications non sauvegardées

Une fermeture ne doit pas entraîner silencieusement une perte importante de travail.

Pour un formulaire multi-champs ou une modification significative, le projet peut utiliser une protection de type :

```text
Vous avez des modifications non enregistrées.
Continuer les modifications
Abandonner
```

La protection doit être proportionnée à la quantité de travail susceptible d’être perdue.

## 23. Toasts après mutations

Après une mutation réussie, un toast peut confirmer l’action :

```text
Rôle de Jean Dupont mis à jour.
```

Les erreurs de formulaire restent inline lorsqu’elles concernent un champ.

Un toast ne remplace ni une erreur structurante ni une confirmation destructive.

## 24. Intégration RTK Query

Flux cible :

```text
DataTable/List
→ ouverture DetailsPanel
→ données RTK Query
→ form state local/dédié
→ mutation RTK Query
→ invalidation ou patch cache
→ UI synchronisée
```

Les données serveur ne sont pas copiées dans une slice Redux pour alimenter le panneau.

## 25. Responsive du panneau

Desktop : panneau depuis la droite, dimension adaptée au contenu.

Mobile : panneau large, quasi plein écran ou plein écran si nécessaire.

Le comportement exact sera consolidé dans la politique responsive, mais le pattern mental reste cohérent entre appareils.

## 26. Principe final

Le Core doit privilégier une UX opérationnelle :

```text
voir rapidement
comprendre
prioriser
agir
rester dans son contexte
recevoir un feedback clair
```

sans sacrifier la cohérence du design system, la réutilisation des composants, la sécurité ni l’autorité du backend.