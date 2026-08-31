# SAAS-CORE-API — Checklist Onboarding Workspace Frontend

**Statut :** cadrage onboarding figé, implémentation à faire  
**Date :** 31 août 2026

## Décisions figées

- [x] Après login, résoudre le contexte avant redirection finale.
- [x] Une invitation valide et pertinente est prioritaire sur la création d’un workspace personnel.
- [x] Un utilisateur avec un workspace existant ne repasse pas dans l’onboarding commercial.
- [x] 0 workspace → onboarding de création.
- [x] 1 workspace → accès direct au dashboard du workspace.
- [x] N workspaces → choix/résolution de contexte sans duplication d’état globale inutile.
- [x] Création workspace limitée aux données réellement requises par le backend, actuellement le nom.
- [x] Création workspace → baseline Free immédiatement utilisable.
- [x] Aucun plan payant n’est requis avant la création du workspace.
- [x] Après création : accès au workspace ou comparaison des plans.
- [x] Le choix commercial post-création est facultatif.
- [x] Un trial n’est jamais démarré automatiquement.
- [x] Le démarrage du trial exige une action volontaire explicite.
- [x] Aucun moyen de paiement artificiel n’est demandé tant que le backend ne l’exige pas.
- [x] L’onboarding obligatoire reste court ; découverte progressive ensuite dans l’application.
- [x] Destination finale commune : `/workspaces/:workspaceId/dashboard`.
- [x] Une invitation expirée/invalide propose une remédiation et jamais un dead end.
- [x] Un utilisateur invité n’est pas forcé à créer un workspace personnel avant d’accepter l’invitation.
- [x] Les plans sont accessibles pendant l’onboarding et depuis Workspace → Abonnement.
- [x] Les composants de présentation des plans sont réutilisables entre Pricing, Onboarding et Subscription.
- [x] Les routes d’onboarding représentent l’étape réelle.
- [x] Aucun `onboardingCompleted` persistant tant que l’état est dérivable.
- [x] Le resolver post-login est centralisé et non dispersé dans les pages.
- [x] SUPER_ADMIN peut accéder à Platform sans obligation de créer un workspace personnel.
- [x] SUPER_ADMIN n’est pas automatiquement forcé vers Platform du seul fait de son rôle.
- [x] Pas de jauge de progression onboarding artificielle tant que le parcours obligatoire reste court.

## Implémentation à faire

- [ ] Créer le resolver de contexte post-login.
- [ ] Charger la liste des workspaces utilisateur via RTK Query.
- [ ] Intégrer le contexte d’invitation lorsque le contrat frontend permet de l’identifier proprement.
- [ ] Créer la route/page d’onboarding workspace.
- [ ] Créer le formulaire minimal de création workspace.
- [ ] Valider le nom selon le contrat backend courant.
- [ ] Après création réussie, récupérer/utiliser le workspace créé comme nouveau contexte.
- [ ] Garantir que le baseline Free est affiché comme plan actif réel, jamais comme absence d’abonnement.
- [ ] Créer l’écran ou bloc facultatif de découverte des plans.
- [ ] Réutiliser `PlanCard`/`PlanComparison` lorsque ces composants seront créés.
- [ ] Implémenter les CTA `Accéder à mon espace` et `Comparer les plans`.
- [ ] Implémenter le démarrage volontaire d’un trial uniquement pour l’owner autorisé et si le backend l’autorise.
- [ ] Rediriger vers `/workspaces/:workspaceId/dashboard` après résolution.
- [ ] Implémenter les remédiations invitation invalide/expirée.
- [ ] Implémenter le cas SUPER_ADMIN sans workspace.
- [ ] Empêcher le router de maintenir artificiellement un utilisateur déjà résolu dans `/onboarding`.

## Tests unitaires

- [ ] resolver : invitation prioritaire.
- [ ] resolver : 0 workspace → onboarding.
- [ ] resolver : 1 workspace → dashboard.
- [ ] resolver : N workspaces → choix/résolution attendue.
- [ ] resolver : SUPER_ADMIN sans workspace → Platform possible.
- [ ] aucun flag `onboardingCompleted` requis pour les états dérivables.
- [ ] formulaire workspace : validation du nom.

## Tests d’intégration

- [ ] création workspace → Free immédiatement disponible selon réponse/overview backend.
- [ ] création workspace → aucune activation automatique de trial.
- [ ] invitation acceptée → accès workspace sans choix de plan personnel.
- [ ] invitation invalide → remédiation correcte.
- [ ] démarrage volontaire trial → mutation explicite uniquement.
- [ ] utilisateur avec workspace existant → onboarding non relancé.
- [ ] comparaison plans → données issues du backend, aucun prix/quota inventé.

## Tests E2E

- [ ] Register → Login → 0 workspace → création → Dashboard Free.
- [ ] Login utilisateur existant avec 1 workspace → Dashboard direct.
- [ ] Login utilisateur avec plusieurs workspaces → résolution/choix cohérent.
- [ ] Invitation → compte/login → acceptation → workspace invité.
- [ ] Invitation expirée → aucun dead end.
- [ ] Création workspace → accès immédiat sans choisir de plan payant.
- [ ] Création workspace → choix volontaire d’un trial → Dashboard.
- [ ] SUPER_ADMIN sans workspace → accès Platform sans création forcée.

## Validation manuelle UX

- [ ] aucun tunnel commercial obligatoire avant l’accès Free.
- [ ] l’option gratuite est explicite et fonctionnelle.
- [ ] aucun trial ne démarre sans action utilisateur claire.
- [ ] aucune étape de paiement inexistante côté backend.
- [ ] onboarding court et compréhensible sur desktop/tablette/mobile.
- [ ] navigation clavier et focus corrects.
- [ ] messages d’invitation compréhensibles et actionnables.
- [ ] le dashboard devient la destination naturelle après onboarding.

## Référence normative

`frontend-onboarding-workspace-policy.md`
