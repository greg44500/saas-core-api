# SAAS-CORE-API — Contrat du dashboard Platform

**Date :** 3 septembre 2026  
**Statut :** P-UI validé — P-DASH.1 backend en validation

## 1. Objet

Ce document fige le rôle de `/platform/overview` comme cockpit générique de pilotage du SaaS.

La vue Platform est distincte d'un Workspace : elle agrège l'état de la plateforme, des tenants et des contrats commerciaux sans importer de données propres aux futurs modules métier d'une application dérivée.

## 2. Fondations UI validées

Le mini-lot P-UI est validé par tests frontend ciblés, suite globale et build.

Décisions actives :

- navigation Platform groupée par sections fonctionnelles ;
- intitulés visibles en français ;
- topbar réduite à `Console d'administration globale` ;
- lien de retour vers la console masqué dans la console elle-même mais conservé pour un super-admin qui se trouve dans un autre contexte ;
- largeur de sidebar et densité des tableaux inchangées ;
- `DataTable` reste l'unique primitive de tableau ;
- cartes construites via les primitives réutilisables `Card`, `MetricCard`, `CollapsibleCard` et `DashboardSection` ;
- contenu dépliable uniquement lorsque le détail est secondaire ;
- tooltips réservés aux notions réellement ambiguës ;
- pas d'infinite scroll pour les listes administratives ; pagination, filtres et état URL restent la règle ;
- le frontend ne calcule aucune métrique commerciale ou de sécurité.

F10.5 est également validé : le Workspace consomme les features/limites effectives sans recevoir les motifs, sources, auteurs ou identifiants internes des `EntitlementOverride`.

## 3. Endpoint analytique

P-DASH.1 introduit :

```text
GET /api/platform/overview
```

Permission dédiée :

```text
platform:overview:read
```

La politique Core V1 continue d'attribuer les permissions Platform au seul `super_admin`.

La permission du cockpit est indépendante des permissions de détail (`users:read`, `subscriptions:read`, etc.) afin qu'une future politique puisse autoriser une lecture agrégée sans ouvrir toutes les ressources administratives.

## 4. Période d'analyse

Query optionnelle :

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

Les indicateurs d'état courant (subscription active, trial actif, override actif, usage courant) utilisent un même instant de référence serveur `generatedAt`, indépendamment de la fenêtre servant aux tendances.

## 5. Données génériques prévues dans le DTO

La réponse regroupe :

- KPI utilisateurs : total, créations période, période précédente, variation ;
- KPI workspaces : total, créations période, période précédente, variation ;
- nombre de subscriptions commerciales actives et temporellement valides ;
- MRR contractuel estimé brut par devise ;
- répartition User et Workspace par statut ;
- répartition des Workspaces par Plan réellement effectif ;
- santé Subscription : active, trialing, past_due, résiliations et downgrades programmés ;
- trials arrivant à échéance dans les 7 jours ;
- overrides actifs, programmés et expirant dans les 7 jours ;
- UsageMetric agrégées pour l'état courant ;
- signaux nécessitant une attention ;
- derniers événements `AuditLog` fonctionnels en échec sur la période.

## 6. Répartition par Plan

La répartition est calculée par Workspace, selon la même priorité commerciale que le resolver runtime :

```text
commercial active temporellement valide
> commercial trialing temporellement valide
> baseline active
```

Le graphique ne compte donc pas toutes les Subscriptions historiques.

Si un Plan référencé est incohérent ou introuvable, le Workspace reste visible dans un bucket `Plan indisponible` au lieu d'être silencieusement retiré des pourcentages.

## 7. Finance : vocabulaire obligatoire

Le premier indicateur financier est :

```text
MRR contractuel estimé brut
```

Il repose sur `Subscription.priceExclTaxMinor` pour les subscriptions commerciales actives et ramène les contrats annuels à un équivalent mensuel.

Contraintes :

- les devises restent séparées ;
- aucune somme EUR + USD ;
- les remises ne sont pas encore appliquées à ce premier indicateur ;
- il ne représente ni facturation, ni encaissement, ni revenu reconnu ;
- le futur domaine Billing/Payment restera l'autorité pour les données financières réelles.

Le frontend doit présenter cette distinction explicitement, idéalement via un tooltip lorsque le KPI sera branché.

## 8. Signaux d'attention

La V1 agrège notamment :

- subscriptions `past_due` ;
- workspaces suspendus ;
- événements AuditLog `failed` sur la période ;
- trials expirant dans les 7 jours ;
- overrides expirant dans les 7 jours.

`AuditLog.status = failed` décrit un échec fonctionnel d'une action auditée. Il ne constitue pas un système de monitoring des erreurs techniques serveur.

Les erreurs 5xx, timeouts, jobs en échec, disponibilité MongoDB, SMTP ou antivirus appartiendront à une future couche d'observabilité dédiée.

## 9. Performance et cohérence

Les agrégations par collection sont indépendantes et exécutables en parallèle. Le dashboard accepte un léger décalage analytique entre collections : il ne sert jamais d'autorité transactionnelle.

En revanche, les règles temporelles courantes utilisent le même instant de référence afin d'éviter qu'une échéance de trial, Subscription ou override soit interprétée différemment dans deux cartes d'un même chargement.

## 10. Ordre d'implémentation

```text
P-DASH.1  backend / permission / validation / agrégats / tests
P-DASH.2  RTK Query et sélecteur de période
P-DASH.3  KPI réels + répartition Plan
P-DASH.4  graphiques de croissance / santé commerciale
P-DASH.5  DataTable des points nécessitant une attention
F10.6      administration frontend des dérogations
```

Aucun module métier spécifique ne doit être introduit dans ce dashboard Core.
