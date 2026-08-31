# SAAS-CORE-API — Politique UX et navigation Subscription Workspace

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1 et futur Billing

## 1. Principe de responsabilité

L’abonnement appartient au Workspace, pas au profil utilisateur.

```text
Compte utilisateur
→ profil, sécurité, apparence, sessions

Workspace
→ abonnement, trial, plan, limites, changements commerciaux
```

Le frontend ne mélange pas identité personnelle et contrat commercial du workspace.

## 2. Navigation principale

Dans la sidebar Workspace, une zone de gestion dédiée contient :

```text
Gestion
├── Abonnement
└── Paramètres
```

`Abonnement` mène vers :

```text
/workspaces/:workspaceId/subscription
```

`Paramètres` mène vers :

```text
/workspaces/:workspaceId/settings
```

L’abonnement n’est pas caché exclusivement derrière `Paramètres`, car il constitue une information importante et une surface d’action récurrente.

## 3. Menu utilisateur de topbar

Le menu utilisateur reste centré sur la personne :

```text
Mon profil
Sécurité
Apparence
Se déconnecter
```

Un raccourci `Gérer l’abonnement` peut être affiché à un owner lorsque pertinent, mais ce raccourci ne devient pas l’emplacement principal de gestion commerciale.

## 4. Page Subscription Workspace

La page `/workspaces/:workspaceId/subscription` est la surface de référence pour :

```text
plan actuel
trial en cours
statut de subscription
entitlement effectif
limites et usages utiles
upgrade
downgrade
annulation programmée
changement programmé
révocation de changement lorsque permise
```

Le frontend consomme le DTO backend et ne reconstruit pas les règles commerciales.

## 5. Résumé Dashboard

Le Dashboard Workspace peut afficher un résumé compact :

```text
plan actuel
statut trial/active/free
jours restants si trial
usage principal
CTA vers Abonnement
```

Le dashboard informe ; la page Subscription administre.

## 6. Trial

Un trial actif doit afficher de manière claire :

```text
plan essayé
jours restants
date absolue de fin
CTA vers changement de plan
```

Une barre de progression proportionnelle n’est utilisée que si le backend expose les données nécessaires pour calculer de façon fiable la durée totale réellement consommée.

Le frontend ne déduit pas arbitrairement un pourcentage à partir du seul `trialEndsAt`.

## 7. Upgrade

L’upgrade doit être accessible immédiatement lorsque le backend autorise l’opération.

L’UX peut proposer :

```text
Comparer les plans
Passer à un plan supérieur
Conserver le plan essayé pendant le trial
```

Les fonctionnalités, limites, prix ou conditions ne sont jamais inventés côté frontend.

## 8. Downgrade

Le downgrade est présenté comme une action à impact potentiel.

L’interface doit expliquer lorsque les données sont disponibles :

```text
plan cible
date d’effet
capacités ou limites réduites
changement programmé
```

Le downgrade utilise une confirmation adaptée et peut être révoqué lorsque le backend expose cette possibilité.

## 9. Changement programmé

Lorsqu’un changement est programmé, il reste visible :

```text
plan actuel
plan cible
date d’effet
action de révocation si autorisée
```

Les statuts techniques backend sont traduits en libellés humains.

## 10. Plan Free

Free est présenté comme un vrai plan actif, jamais comme une absence d’abonnement.

```text
Plan actuel : Free
```

L’utilisateur peut consulter ses fonctionnalités et limites, utiliser les capacités disponibles et comparer les plans supérieurs sans être bloqué artificiellement.

## 11. Permissions

La lecture et les commandes commerciales sont distinctes.

Un utilisateur disposant du droit de lecture peut consulter les informations exposées par le backend.

Les actions commerciales sensibles ne sont affichées que lorsque l’utilisateur possède l’autorité requise, notamment le rôle owner lorsque le backend le demande.

L’UI ne remplace jamais l’autorisation backend.

## 12. Onboarding et création de workspace

L’Auth et le choix commercial restent séparés.

Pour un utilisateur qui crée son propre workspace :

```text
compte créé
→ connexion
→ onboarding workspace
→ choix Free / trial / plan disponible
→ accès au produit
```

Le plan Free garantit un chemin d’entrée fonctionnel lorsqu’il est disponible.

Pour un utilisateur rejoignant un workspace existant :

```text
compte créé / connexion
→ invitation / membership
→ workspace existant
```

Aucun choix d’abonnement personnel n’est imposé si la subscription appartient déjà au workspace.

## 13. Future Billing

Les moyens de paiement, factures, TVA, provider et détails financiers restent hors du profil utilisateur et viendront compléter la surface Subscription/Billing du Workspace lorsque le backend correspondant sera défini.
