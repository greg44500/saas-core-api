# SAAS-CORE-API — Contrat du dashboard Platform

**Date :** 3 septembre 2026  
**Statut :** P-UI + P-DASH.1 validés — P-DASH.2 / P-DASH.3 / raffinements P-DASH.4 en validation

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
- le menu utilisateur se ferme au clic extérieur, avec `Escape` et lors d'un changement de route afin qu'un popover ouvert ne persiste jamais sur la page suivante ;
- largeur de sidebar et densité des tableaux inchangées ;
- `DataTable` reste l'unique primitive de tableau ;
- cartes construites via les primitives réutilisables `Card`, `MetricCard`, `CollapsibleCard`, `SignalSummaryCard` et `DashboardSection` ;
- les descriptions de cartes sont exposées via `InfoTooltip` au survol et au focus clavier afin de libérer l'espace sans perdre l'explication ;
- contenu dépliable uniquement lorsque le détail apporte une information nouvelle ;
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
365 derniers jours
Période personnalisée
```

La période est stockée dans l'URL, jamais dans un slice Redux. Le mode personnalisé utilise les `DatePicker` partagés et n'applique la query qu'une fois les deux bornes valides. Les dates saisies représentent des jours civils locaux puis sont converties en instants ISO pour l'API ; la borne de fin visible par l'utilisateur est inclusive et devient une borne backend exclusive au début local du jour suivant.

## 5. Données génériques du DTO

La réponse regroupe :

- KPI utilisateurs : total, créations période, période précédente, variation ;
- KPI workspaces : total, créations période, période précédente, variation ;
- nombre de subscriptions commerciales actives et temporellement valides ;
- estimation mensuelle contractuelle brute par devise via le champ technique `contractedMrrEstimate` ;
- répartition User et Workspace par statut ;
- répartition des Workspaces par Plan réellement effectif ;
- santé Subscription : active, trialing, past_due, résiliations et downgrades programmés ;
- trials arrivant à échéance dans les 7 jours ;
- overrides actifs, programmés et expirant dans les 7 jours ;
- UsageMetric agrégées pour l'état courant ;
- usage File actif : nombre, taille et répartition par type MIME ;
- signaux nécessitant une attention ;
- derniers événements `AuditLog` fonctionnels en échec sur la période.

P-DASH.2 branche ces données via le `baseApi` RTK Query unique. Le frontend affiche les valeurs déjà calculées par le backend ; il ne reconstruit aucun pourcentage commercial ou signal de sécurité.

## 6. Visualisations génériques — P-DASH.3

P-DASH.3 introduit deux primitives dans `components/data-display` :

```text
ComparisonBarChart
DistributionBarChart
```

Règles :

- aucune primitive ne connaît Platform, Plan, Subscription ou RTK Query ;
- les composants reçoivent des valeurs déjà calculées et ne reconstruisent aucune règle métier ;
- `ComparisonBarChart` calcule uniquement une largeur relative pour comparer deux périodes ; les taux de croissance restent ceux fournis par le backend dans les KPI ;
- `DistributionBarChart` utilise le pourcentage backend pour le texte et ne borne que la largeur visuelle de la barre entre 0 et 100 ; une incohérence de donnée ne doit pas être silencieusement masquée ;
- les valeurs et libellés restent disponibles en texte ; les barres décoratives sont masquées aux technologies d'assistance ;
- les groupes de données sont nommés via `aria-label` ;
- aucune nouvelle dépendance graphique n'est requise pour ces visualisations simples ; un moteur plus riche pourra être substitué plus tard derrière les mêmes frontières de composants si un véritable besoin apparaît.

La croissance compare actuellement les créations de la période sélectionnée à celles de la période précédente de même durée. Elle ne prétend pas être une courbe temporelle quotidienne : une vraie série temporelle nécessitera un contrat backend dédié si elle devient nécessaire.

## 7. Répartition par Plan

La répartition est calculée par Workspace, selon la même priorité commerciale que le resolver runtime :

```text
commercial active temporellement valide
> commercial trialing temporellement valide
> baseline active
```

Le dashboard ne compte donc pas toutes les Subscriptions historiques.

Si un Plan référencé est incohérent ou introuvable, le Workspace reste visible dans un bucket `Plan indisponible` au lieu d'être silencieusement retiré des pourcentages.

P-DASH.3 affiche cette distribution par barres horizontales en conservant nom, nombre et pourcentage textuels. React ne recalcule jamais la part commerciale.

## 8. Finance : vocabulaire obligatoire

Le champ technique du DTO reste :

```text
contractedMrrEstimate
```

`MRR` signifie historiquement `Monthly Recurring Revenue`, mais cet acronyme n'est pas affiché dans l'interface Core car la métrique disponible n'est pas encore un revenu comptable réellement encaissé.

Le libellé utilisateur obligatoire est :

```text
Valeur mensuelle contractuelle estimée
```

Le tooltip précise qu'il s'agit de l'équivalent mensuel brut des abonnements commerciaux actifs, calculé à partir des prix contractuels, et qu'il ne représente ni facturation ni encaissement.

Contraintes :

- les devises restent séparées ;
- aucune somme EUR + USD ;
- les remises ne sont pas encore appliquées à ce premier indicateur ;
- il ne représente ni facturation, ni encaissement, ni revenu reconnu ;
- le futur domaine Billing/Payment restera l'autorité pour les données financières réelles.

Le frontend affiche une valeur monétaire uniquement lorsqu'une seule devise est présente. En multi-devises, il indique le nombre de devises au lieu de produire une somme artificielle.

## 9. Usage File générique

La carte `Usage de la plateforme` conserve un résumé court des principales `UsageMetric`. Son contenu déplié ne répète plus ces métriques : il expose des informations File complémentaires.

L'agrégation backend utilise uniquement les fichiers `active`, cohérents avec le quota fonctionnel de stockage. Les fichiers supprimés logiquement ne réapparaissent donc pas dans la consommation fonctionnelle même s'ils restent physiquement conservés pendant la période de rétention.

Le DTO File contient :

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

Le frontend peut ainsi afficher deux lectures complémentaires : répartition par nombre de fichiers et répartition par stockage occupé. Le rendu reste data-driven ; un futur type autorisé apparaît sans modification du composant de distribution.

## 10. Signaux d'attention

La V1 agrège notamment :

- subscriptions `past_due` ;
- workspaces suspendus ;
- événements AuditLog `failed` sur la période ;
- trials expirant dans les 7 jours ;
- overrides expirant dans les 7 jours.

Les clés techniques restent en anglais dans le modèle et le DTO lorsqu'elles font partie du contrat existant. L'interface traduit systématiquement les libellés visibles : `past_due` devient par exemple `Abonnements en retard`, `trial` devient `essai`, et `downgrade` devient `baisse de formule`.

`AuditLog.status = failed` décrit un échec fonctionnel d'une action auditée. Il ne constitue pas un système de monitoring des erreurs techniques serveur.

Les valeurs non nulles de cette synthèse utilisent par défaut le ton `warning`; `destructive` reste réservé aux incidents réellement critiques. Une valeur nulle reste neutre.

Les erreurs 5xx, timeouts, jobs en échec, disponibilité MongoDB, SMTP ou antivirus appartiendront à une future couche d'observabilité dédiée.

Le tableau détaillé restera réservé à P-DASH.5 et utilisera obligatoirement le `DataTable` partagé.

## 11. Performance et cohérence

Les agrégations par collection sont indépendantes et exécutables en parallèle. Le dashboard accepte un léger décalage analytique entre collections : il ne sert jamais d'autorité transactionnelle.

En revanche, les règles temporelles courantes utilisent le même instant de référence afin d'éviter qu'une échéance de trial, Subscription ou override soit interprétée différemment dans deux cartes d'un même chargement.

Côté frontend :

- RTK Query est l'unique state serveur du dashboard ;
- `useSearchParams` porte l'état partageable de période ;
- `useState` reste limité au brouillon local du filtre personnalisé et à l'ouverture des cartes dépliables ;
- aucun slice Redux métier n'est créé pour la vue d'ensemble ;
- le test du router mocke la page Overview afin de ne pas transformer un test de navigation en test réseau ;
- les primitives graphiques ne déclenchent aucune requête et ne portent aucun state serveur.

## 12. Ordre d'implémentation actualisé

```text
P-DASH.1  backend / permission / validation / agrégats / tests         VALIDÉ
P-DASH.2  RTK Query / période URL / binding des agrégats               EN VALIDATION
P-DASH.3  primitives / croissance / répartition Plan                   EN VALIDATION
P-DASH.4  raffinement cartes / usage File / santé / finance            EN VALIDATION
P-DASH.5  DataTable des points nécessitant une attention
F10.6      administration frontend des dérogations
```

Aucun module métier spécifique ne doit être introduit dans ce dashboard Core.
