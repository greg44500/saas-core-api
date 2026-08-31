# SAAS-CORE-API — Politique d’expérience utilisateur contextuelle

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1 et futurs modules métier

## 1. Objectif

Ce document fixe les principes d’une expérience utilisateur plus qualitative que la simple exécution fonctionnelle des écrans.

Le Core doit rester professionnel, clair et efficace, mais il peut également apporter des signaux contextuels utiles : accueil, reprise après absence, accompagnement, confirmations, états vides intelligents et recommandations d’action lorsque les données réellement disponibles le permettent.

La règle directrice est : **ajouter de la valeur UX sans inventer de contexte, sans infantiliser l’utilisateur et sans multiplier les messages décoratifs**.

## 2. Personnalisation sobre et utile

L’application peut adapter certains messages à la situation réelle de l’utilisateur.

Exemples :

```text
première connexion
→ message de bienvenue

retour après une période significative d’absence
→ message de retour contextualisé

workspace sans contenu
→ état vide guidant vers la première action utile

opération réussie
→ confirmation concise et actionnable

fonction indisponible selon plan ou permission
→ explication claire avec remédiation lorsque possible
```

Ces messages doivent être fondés sur des données disponibles et fiables.

## 3. Message de bienvenue

Lorsqu’il est possible d’identifier de manière fiable une première expérience ou un onboarding initial, un message de bienvenue peut être affiché.

Exemple de ton attendu :

```text
Bienvenue, Greg.
Votre espace est prêt. Vous pouvez maintenant créer ou rejoindre votre premier workspace.
```

Le message doit :

- rester court ;
- proposer éventuellement une prochaine action pertinente ;
- ne pas bloquer l’accès à l’application ;
- ne pas être répété à chaque connexion.

## 4. Message de retour après absence

Une expérience de type « Ravi de vous revoir » peut être utilisée lorsqu’une durée d’absence significative peut être déterminée de façon fiable.

Exemple métier proposé : après environ trois jours sans connexion.

La valeur exacte du seuil devra être centralisée et configurable si cette logique est retenue dans le produit final.

Exemple :

```text
Ravi de vous revoir, Greg.
Voici ce qui mérite votre attention depuis votre dernière visite.
```

Important : le frontend ne doit pas inventer ou estimer une dernière connexion si le backend ne fournit pas une donnée appropriée et fiable.

Si la fonctionnalité nécessite un champ tel que `lastLoginAt`, `lastSeenAt` ou un événement d’audit exploitable, le contrat backend devra être vérifié avant implémentation.

## 5. Contextualisation plutôt que message décoratif

Un message personnalisé doit idéalement aider l’utilisateur à comprendre quoi faire ensuite.

Exemples pertinents :

```text
aucun workspace
→ proposer la création ou expliquer comment rejoindre un espace

invitation en attente
→ proposer de la consulter

trial proche de l’expiration
→ expliquer la date et les actions disponibles selon le contrat backend

quota approchant
→ prévenir lorsque le backend expose l’information nécessaire

workspace suspendu
→ expliquer l’état et la remédiation possible
```

Les messages purement décoratifs ne doivent pas encombrer les interfaces professionnelles.

## 6. Ton rédactionnel

Le ton doit être :

- professionnel ;
- humain ;
- direct ;
- compréhensible par un utilisateur métier non technique ;
- non culpabilisant ;
- non excessivement familier.

Éviter les formulations techniques telles que :

```text
403 member:update denied
subscription entitlement mismatch
refresh token invalid
```

Préférer une formulation métier et actionnable.

## 7. États vides comme outil UX

Un empty state ne doit pas seulement afficher « Aucune donnée ».

Il doit distinguer :

```text
aucune donnée parce que rien n’a encore été créé
aucun résultat pour les filtres actuels
aucune donnée accessible avec les permissions présentes
fonction non disponible dans le plan
```

Lorsque pertinent, il propose une action :

```text
Créer
Inviter
Modifier les filtres
Découvrir la fonctionnalité
Contacter un administrateur
```

L’action proposée doit être réellement disponible selon les permissions et l’entitlement backend.

## 8. Feedback des actions

Toute action importante doit produire un retour compréhensible.

Selon le contexte :

```text
inline validation
local loading state
toast de confirmation
état de page
modale de confirmation
message de remédiation
```

Les retours doivent éviter :

- le silence après une action ;
- les toasts pour chaque micro-interaction ;
- les messages génériques lorsque l’utilisateur peut raisonnablement agir ;
- les détails techniques ou sensibles.

## 9. Continuité de contexte

L’application doit autant que possible préserver le contexte de travail :

- ne pas vider inutilement une page lors d’un refetch ;
- conserver les filtres dans l’URL lorsque pertinent ;
- préserver les données de formulaire lors d’une erreur ;
- revenir logiquement à la vue précédente après une action contextuelle ;
- éviter les redirections surprenantes.

## 10. Découverte progressive

L’utilisateur métier ne doit pas être exposé à toute la complexité du Core en même temps.

L’interface peut utiliser :

```text
progressive disclosure
actions contextuelles
menus conditionnels
help text court
tooltips accessibles
empty states guidés
wizards uniquement pour tâches complexes
```

La complexité doit apparaître au moment où elle devient utile.

## 11. Dashboard et accueil

Le dashboard peut jouer un rôle d’accueil contextuel, mais ne doit pas devenir un mur de cartes génériques.

Priorités :

- salutation ou reprise contextuelle si les données le permettent ;
- informations opérationnelles réellement exposées par le backend ;
- actions utiles ;
- alertes importantes ;
- absence de KPI inventés ou purement décoratifs.

## 12. Permissions et UX

L’affichage conditionnel doit réduire le bruit visuel.

Une action non autorisée peut selon le contexte :

- être masquée si elle n’a aucune utilité pour l’utilisateur ;
- être désactivée avec explication si comprendre son existence est utile ;
- conduire à un état de refus explicite lorsque l’utilisateur accède directement à une route.

Le backend reste l’autorité de sécurité.

## 13. Accessibilité des messages

Les messages importants doivent être accessibles :

- ne pas dépendre uniquement de la couleur ;
- associer correctement les erreurs aux champs ;
- utiliser des régions live lorsque pertinent pour des retours dynamiques ;
- conserver un ordre de focus cohérent après modale ou mutation ;
- éviter les animations excessives ou indispensables à la compréhension.

## 14. Données requises et contrat backend

Une amélioration UX ne doit jamais provoquer l’invention d’une donnée frontend.

Avant d’implémenter une logique telle que :

```text
« vous n’êtes pas venu depuis 3 jours »
« 5 changements depuis votre dernière visite »
« votre activité a augmenté »
```

il faut vérifier que le backend expose les données nécessaires avec une sémantique fiable.

Si ce n’est pas le cas :

```text
besoin UX identifié
→ besoin de contrat backend documenté
→ endpoint/champ ajouté dans un lot backend dédié si retenu
→ frontend implémenté seulement ensuite
```

## 15. Tests UX

Les comportements contextuels importants doivent être testés.

Exemples :

```text
première visite → message de bienvenue
retour récent → pas de message d’absence longue
retour après seuil → message de retour
absence de donnée lastLoginAt → aucune supposition frontend
permission absente → action adaptée
empty state → CTA disponible uniquement si autorisé
```

## 16. Principe final

Le Core doit donner l’impression d’une application conçue pour accompagner un utilisateur réel, pas seulement d’une interface posée sur une API.

Cette qualité UX doit cependant toujours respecter :

```text
vérité des données
sobriété
accessibilité
permissions
entitlements
cohérence du design system
maintenabilité
```

La personnalisation est donc contextuelle et utile, jamais fictive.