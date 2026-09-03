# SAAS-CORE-API — Contrat du dashboard Platform

**Date :** 3 septembre 2026  
**Statut :** P-UI + P-DASH.1 validés — P-DASH.2 en validation

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

## 3. Endpoint analytique — P-DASH.1 validé

P-DASH.1 introduit et validé par tests ciblés puis régression backend globale :

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

Les indicateurs d'état courant (subscription active, trial actif, override actif, usage courant) utilisent un même instant de référence serveur `generatedAt`, indépendamment de la fenêtre servant aux tendances.

P-DASH.2 ajoute côté frontend les presets :

```text
7 derniers jours
30 derniers jours (défaut canonique)
90 derniers jours
12 derniers mois
Période personnalisée
```

La période est stockée dans l'URL, jamais dans un slice Redux. Le mode personnalisé utilise les `DatePicker` partagés et n'applique la query qu'une fois les deux bornes valides. Les dates saisies représentent des jours civils locaux puis sont converties en instants ISO pour l'API ; la borne de fin visible par l'utilisateur est inclusive et devient une borne backend exclusive au début local du jour suivant.

## 5. Données génériques du DTO

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

P-DASH.2 branche ces données via le `baseApi` RTK Query unique. Le frontend affiche les valeurs déjà calculées par le backend ; il ne reconstruit aucun pourcentage commercial ou signal de sécurité.

## 6. Répartition par Plan

La répartition est calculée par Workspace, selon la même priorité commerciale que le resolver runtime :

```text
commercial active temporellement valide
> commercial trialing temporellement valide
> baseline active
```

Le dashboard ne compte donc pas toutes les Subscriptions historiques.

Si un Plan référencé est incohérent ou introuvable, le Workspace reste visible dans un bucket `Plan indisponible` au lieu d'être silencieusement retiré des pourcentages.

P-DASH.2 affiche déjà cette distribution sous forme textuelle accessible (nom, nombre, pourcentage). P-DASH.3 pourra ajouter une représentation graphique sans remplacer cette source de données ni recalculer les pourcentages côté React.

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

Le frontend affiche une valeur monétaire uniquement lorsqu'une seule devise est présente. En multi-devises, il indique le nombre de devises au lieu de produire une somme artificielle. Un tooltip explicatif pourra être ajouté lorsque la primitive retenue apportera une information réellement utile.

## 8. Signaux d'attention

La V1 agrège notamment :

- subscriptions `past_due` ;
- workspaces suspendus ;
- événements AuditLog `failed` sur la période ;
- trials expirant dans les 7 jours ;
- overrides expirant dans les 7 jours.

`AuditLog.status = failed` décrit un échec fonctionnel d'une action auditée. Il ne constitue pas un système de monitoring des erreurs techniques serveur.

Les erreurs 5xx, timeouts, jobs en échec, disponibilité MongoDB, SMTP ou antivirus appartiendront à une future couche d'observabilité dédiée.

P-DASH.2 expose les compteurs synthétiques. Le tableau détaillé restera réservé à P-DASH.5 et utilisera obligatoirement le `DataTable` partagé.

## 9. Performance et cohérence

Les agrégations par collection sont indépendantes et exécutables en parallèle. Le dashboard accepte un léger décalage analytique entre collections : il ne sert jamais d'autorité transactionnelle.

En revanche, les règles temporelles courantes utilisent le même instant de référence afin d'éviter qu'une échéance de trial, Subscription ou override soit interprétée différemment dans deux cartes d'un même chargement.

Côté frontend :

- RTK Query est l'unique state serveur du dashboard ;
- `useSearchParams` porte l'état partageable de période ;
- `useState` reste limité au brouillon local du filtre personnalisé et à l'ouverture des cartes dépliables ;
- aucun slice Redux métier n'est créé pour la vue d'ensemble ;
- le test du router mocke la page Overview afin de ne pas transformer un test de navigation en test réseau.

## 10. Ordre d'implémentation actualisé

```text
P-DASH.1  backend / permission / validation / agrégats / tests         VALIDÉ
P-DASH.2  RTK Query / période URL / binding des agrégats               EN VALIDATION
P-DASH.3  primitives et visualisations croissance / répartition Plan
P-DASH.4  visualisations santé commerciale / finance / usage
P-DASH.5  DataTable des points nécessitant une attention
F10.6      administration frontend des dérogations
```

Aucun module métier spécifique ne doit être introduit dans ce dashboard Core.
