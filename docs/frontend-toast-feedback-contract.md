# SAAS-CORE-API — Contrat UX des toasts frontend

**Date :** 2 septembre 2026  
**Statut :** RÈGLE TRANSVERSALE

## Objectif

Les toasts fournissent un feedback global, bref et visuel après certaines actions utilisateur. Ils ne remplacent ni la validation de formulaire, ni les états d'erreur persistants d'une page, ni les confirmations d'actions sensibles.

La primitive de référence est :

```text
frontend/src/components/shared/toast-provider.jsx
```

Le provider est enregistré une seule fois dans `AppProviders` afin que les notifications survivent aux navigations internes déclenchées après une mutation.

## Comportement commun

- durée par défaut : **5 secondes** ;
- fermeture manuelle toujours disponible via une croix ;
- variantes disponibles : `success`, `error`, `warning`, `info` ;
- succès et informations annoncés comme statuts accessibles ;
- erreurs annoncées comme alertes accessibles ;
- aucune feature ne doit recréer son propre système de toast.

## Quand utiliser un toast

Un toast est pertinent lorsqu'une action serveur vient de modifier durablement l'état de l'application et qu'un feedback global aide l'utilisateur à savoir que l'opération est terminée.

Cas recommandés :

- modification réussie d'une donnée persistée, par exemple nom du workspace ou profil ;
- création, modification ou suppression réussie d'un rôle ;
- invitation envoyée ou révoquée ;
- modification de l'état d'un membre lorsque l'action est terminée ;
- fichier ajouté ou retiré après fermeture du dialogue ;
- changement de plan, programmation/révocation de résiliation ou de downgrade ;
- succès d'une action sensible qui provoque ensuite une navigation, si le feedback reste utile après cette navigation ;
- échec opérationnel d'une action lorsque le contexte local disparaît ou qu'aucun emplacement inline n'est plus pertinent.

## Quand préférer un message inline

Le message doit rester près de l'élément concerné lorsqu'il aide directement l'utilisateur à corriger ou comprendre le problème.

Cas obligatoirement ou préférentiellement inline :

- validation Zod / React Hook Form d'un champ ;
- mot de passe incorrect ou donnée à corriger dans un formulaire sensible ;
- erreur serveur d'un dialogue qui reste ouvert et dans lequel l'utilisateur peut corriger puis réessayer ;
- erreur de chargement d'une page ou d'une section nécessitant un bouton « Réessayer » ;
- états vides, indisponibles ou partiellement accessibles d'un écran.

## Quand ne pas utiliser de toast

Ne pas afficher de toast pour :

- navigation simple ;
- pagination ;
- changement de filtre ;
- ouverture ou fermeture d'un Drawer ou d'un dialogue ;
- sélection d'un onglet ;
- réussite d'une lecture/refetch silencieux ;
- déconnexion ou connexion réussie lorsque la navigation rend déjà le résultat évident ;
- chaque petite interaction locale ne modifiant aucune donnée persistée.

## Actions destructives

Le toast n'est jamais une confirmation.

Flux attendu :

1. l'utilisateur déclenche l'action ;
2. `ConfirmationDialog` expose les conséquences ;
3. le backend autorise ou refuse l'opération ;
4. en cas de succès, le dialogue se ferme puis un toast confirme le résultat ;
5. en cas d'échec, si le dialogue reste ouvert et permet une correction ou un nouvel essai, l'erreur reste dans le dialogue plutôt que d'être dupliquée en toast.

## Règle anti-bruit

Une même information ne doit pas être affichée simultanément en toast et en message inline, sauf justification UX explicite.

Les toasts doivent confirmer des **résultats importants**, pas commenter chaque clic. Les lectures passives et refetchs ne génèrent pas de notifications globales.

## Référence initiale

Le changement du nom du workspace constitue le premier cas de référence :

- validation du champ : inline ;
- mutation réussie : toast `success` ;
- refus opérationnel de la mutation : toast `error` ;
- disparition automatique après cinq secondes ou fermeture manuelle.
