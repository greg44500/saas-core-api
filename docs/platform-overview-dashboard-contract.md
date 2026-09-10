# SAAS-CORE-API — Contrat du dashboard Platform

**Dernière mise à jour :** 2026-09-10  
**Statut :** implémenté et validé dans le Core courant  
**Périmètre :** `/platform/overview` — cockpit générique d’administration SaaS

## 1. Objet

`/platform/overview` est le cockpit générique de pilotage de la plateforme. Il agrège l’état des comptes, workspaces, abonnements, plans, usages et signaux transversaux sans importer de données propres aux futurs modules métier d’un SaaS dérivé.

Le Dashboard Platform est distinct du Dashboard Workspace :

```text
Dashboard Platform
→ administration du SaaS et de ses tenants

Dashboard Workspace
→ expérience du tenant et futurs KPI métier après dérivation
```

Le frontend ne recalcule aucune métrique commerciale ou de sécurité : il affiche des projections backend déjà résolues.

## 2. Autorisation et projection

Endpoint :

```text
GET /api/platform/overview
```

Permission d’entrée :

```text
platform:overview:read
```

Les domaines réellement exposés sont ensuite projetés selon les permissions runtime de l’acteur (`users:read`, `workspaces:read`, `subscriptions:read`, etc.). Une préférence d’affichage utilisateur peut seulement réduire cette projection ; elle ne crée jamais une autorisation.

Ordre obligatoire :

```text
permissions Platform
→ projection backend autorisée
→ préférences d’affichage
→ contenu réellement visible
```

## 3. Période d’analyse

Query backend optionnelle :

```text
from=<date>
to=<date>
```

Règles :

- `from` et `to` sont fournis ensemble ou tous deux absents ;
- `to > from` ;
- période maximale : 366 jours ;
- sans query, période courante = 30 derniers jours ;
- la période précédente possède exactement la même durée ;
- les intervalles analytiques sont demi-ouverts `[from, to)`.

Les métriques d’état courant utilisent le même instant serveur `generatedAt` afin d’éviter qu’une échéance soit interprétée différemment dans deux blocs du même chargement.

Le frontend propose les presets 7, 30, 90, 365 jours et période personnalisée. L’état partageable du filtre reste dans l’URL via `useSearchParams`, pas dans Redux.

## 4. KPI principaux

Le cockpit expose actuellement cinq KPI lorsque les permissions correspondantes sont disponibles :

```text
Utilisateurs
Espaces de travail
Abonnements payants actifs
Accès gratuits actifs
Valeur mensuelle contractuelle estimée
```

### 4.1 Abonnements payants actifs

Le compteur correspond aux workspaces dont la Subscription effective est commerciale, `active`, valide à l’instant du calcul et porte un prix contractuel strictement supérieur à zéro. Les trials sont exclus.

### 4.2 Accès gratuits actifs

Le compteur correspond aux workspaces dont l’accès effectif actif est gratuit :

- baseline Free ;
- offre commerciale privée gratuite durable `open_ended`.

Les trials de plans payants sont exclus.

Le DTO expose aussi :

```text
freeActiveAccesses.total
freeActiveAccesses.viaCommercialInvitation
```

Le sous-compteur `viaCommercialInvitation` repose sur une invitation commerciale réellement acceptée et ne se déduit jamais du nom du Plan.

### 4.3 Résolution économique

Une seule Subscription effective est retenue par workspace avec la même priorité générale que le runtime :

```text
commercial active valide
> trialing valide
> baseline active
```

Cette règle évite qu’un workspace payant soit simultanément compté comme gratuit à cause de sa baseline persistante.

## 5. Finance : vocabulaire obligatoire

Le champ technique reste :

```text
contractedMrrEstimate
```

Le libellé utilisateur reste :

```text
Valeur mensuelle contractuelle estimée
```

Cette métrique est un équivalent mensuel brut fondé sur les prix contractuels. Elle ne représente ni une facture, ni un encaissement, ni un revenu comptable reconnu.

Contraintes :

- devises séparées ;
- aucune somme artificielle EUR + USD ;
- remises non intégrées tant qu’un contrat spécifique ne le prévoit pas ;
- Billing/Payment restera l’autorité des données financières réelles.

Le frontend affiche une valeur monétaire uniquement lorsqu’une seule devise est présente ; en multi-devises, il affiche le nombre de devises.

## 6. Répartition par Plan

La répartition est calculée par Workspace selon la Subscription effectivement appliquée, avec la même priorité commerciale que le resolver runtime.

Un Plan incohérent ou introuvable ne doit pas faire disparaître silencieusement un workspace des pourcentages : un bucket de repli reste préférable à une donnée faussée.

Le frontend ne recalcule pas les pourcentages commerciaux.

## 7. Usage et fichiers

La section Usage/Fichiers expose les `UsageMetric` autorisées et les fichiers actifs :

```text
files.totalCount
files.totalSizeBytes
files.byType[]
  mimeType
  extensions
  count
  sizeBytes
  percentageOfCount
  percentageOfStorage
```

Les fichiers soft-deleted ne sont pas présentés comme fichiers actifs même s’ils restent physiquement conservés pendant leur rétention.

Les visualisations utilisent les primitives partagées `ComparisonBarChart` et `DistributionBarChart`. Les valeurs et libellés restent disponibles textuellement et les éléments purement décoratifs sont ignorés par les technologies d’assistance.

## 8. Santé, exceptions et points d’attention

Le cockpit peut exposer notamment :

- subscriptions `past_due` ;
- workspaces suspendus ;
- trials expirant sous 7 jours ;
- overrides expirant sous 7 jours ;
- événements Audit fonctionnels en échec sur la période.

`AuditLog.status = failed` décrit l’échec fonctionnel d’une action auditée ; ce n’est pas un système d’observabilité technique.

Les erreurs 5xx, timeouts, jobs, disponibilité MongoDB, SMTP ou antivirus relèvent d’une future couche d’observabilité.

Le détail utilise le `DataTable` partagé.

## 9. UI, composants et équilibre des KPI

Primitives réutilisées :

```text
Card
MetricCard
CollapsibleCard
SignalSummaryCard
DashboardSection
InfoTooltip
DataTable
```

Les KPI utilisent une grille commune à six colonnes et un algorithme d’équilibrage partagé avec le Dashboard Workspace. La composition dépend du nombre réellement rendu, jamais d’un nombre théorique de cartes.

Convention large écran :

```text
1 → 1
2 → 2
3 → 3
4 → 2 + 2
5 → 3 + 2
6 → 3 + 3
7 → 3 + 2 + 2
8 → 3 + 3 + 2
```

L’implémentation partagée se trouve dans :

```text
frontend/src/components/shared/balanced-six-column-grid.js
```

Cette règle protège notamment les vues personnalisées dans lesquelles certaines sections sont masquées.

## 10. État serveur et chargement

RTK Query est l’unique état serveur du Dashboard Platform.

Un Skeleton est utilisé pour le chargement initial sans donnée. Lors d’un refetch avec données déjà disponibles, le contenu réel reste affiché.

Les préférences de Dashboard n’ont pas vocation à charger des données auxquelles l’utilisateur n’a pas droit. Les projections backend restent l’autorité de sécurité.

## 11. Validation actuelle

Les sous-blocs historiques P-DASH ont été intégrés dans le Dashboard Platform courant. Les derniers travaux du 2026-09-10 ont ajouté :

```text
KPI économiques Free/Paid
résolution économique par Subscription effective
sous-compteur via invitation commerciale
équilibrage partagé des grilles Dashboard
```

Les tests ciblés et globaux, le lint et le build applicables ont été confirmés verts localement par l’utilisateur avant intégration dans `main`.

Aucun module métier spécifique ne doit être introduit dans ce dashboard Core.
