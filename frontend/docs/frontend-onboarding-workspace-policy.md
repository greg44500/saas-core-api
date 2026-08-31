# SAAS-CORE-API — Politique Onboarding Workspace Frontend

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1

## 1. Objectif

Ce document fixe le parcours d’onboarding après inscription/connexion afin de garantir une entrée fluide dans le produit sans tunnel commercial bloquant.

Le backend actuel crée un workspace via un nom et porte les subscriptions au niveau du workspace. Les invitations sont acceptées via un workflow séparé car l’utilisateur n’est pas encore membre du workspace au moment de l’acceptation.

## 2. Résolution du contexte après login

Après authentification, le frontend résout la situation réelle de l’utilisateur avant de choisir une destination.

```text
Login
↓
invitation ciblée ?
├── oui → workflow invitation
└── non
    ↓
    liste des workspaces
    ├── 0 workspace → onboarding création workspace
    ├── 1 workspace → dashboard du workspace
    └── N workspaces → workspace approprié ou choix utilisateur
```

Cette résolution ne doit pas être remplacée par une redirection arbitraire vers un écran commercial.

## 3. Priorité aux invitations

Une invitation valide vers un workspace existant prend priorité sur la création d’un nouveau workspace lorsque le contexte utilisateur indique clairement cette intention.

Le parcours est :

```text
invitation
→ connexion / création de compte
→ acceptation explicite
→ membership créé
→ accès au workspace invité
```

Aucun choix d’abonnement personnel n’est présenté dans ce parcours, puisque la subscription appartient déjà au workspace.

## 4. Utilisateur ayant déjà un workspace

Un utilisateur possédant déjà un workspace ne repasse pas dans l’onboarding commercial à chaque connexion.

```text
1 workspace
→ accès direct au workspace

N workspaces
→ dernier contexte fiable si une stratégie dédiée est un jour retenue
  ou choix explicite
```

Aucune préférence de dernier workspace n’est persistée tant qu’une stratégie dédiée n’est pas explicitement cadrée.

## 5. Aucun workspace : onboarding minimal

Le véritable onboarding obligatoire commence seulement lorsque l’utilisateur authentifié ne possède aucun workspace utilisable.

Le formulaire de création reste minimal et respecte le contrat backend actuel :

```text
Nom du workspace
```

Le frontend ne demande pas au démarrage des informations non requises telles que secteur, taille, adresse, SIRET, téléphone ou logo.

## 6. Création du workspace et Free immédiat

La création du workspace rend immédiatement disponible le baseline Free fourni par le backend.

Le parcours normatif est :

```text
Créer le workspace
↓
Free actif immédiatement
↓
accès au produit garanti
↓
choix commercial facultatif ensuite
```

Le frontend ne place donc pas le choix d’un plan payant avant la création du workspace comme condition d’accès.

## 7. Choix commercial facultatif après création

Après création du workspace, l’utilisateur peut :

```text
[Accéder à mon espace]
```

ou :

```text
[Comparer les plans]
```

Le plan Free constitue toujours un chemin d’entrée fonctionnel lorsque le workspace vient d’être créé.

## 8. Trial volontaire

Un trial n’est jamais démarré automatiquement lors de la création du workspace.

Le trial résulte d’une action volontaire et explicite de l’utilisateur autorisé :

```text
Démarrer l’essai <Plan>
```

Cette règle est importante car l’éligibilité au trial est une ressource métier durable et ne doit pas être consommée silencieusement.

## 9. Trial sans moyen de paiement obligatoire

Tant que le contrat backend actuel ne requiert pas de moyen de paiement pour démarrer un trial, le frontend ne crée aucune étape de paiement artificielle.

Le futur domaine Billing pourra modifier certains parcours commerciaux lorsque ses contrats existeront réellement.

## 10. Onboarding court

Le Core ne construit pas un wizard long sans nécessité.

Structure de référence :

```text
obligatoire : créer le workspace
facultatif : découvrir les plans
```

L’expérience commerciale se poursuit ensuite contextuellement dans l’application.

## 11. Destination finale unique

Après création Free ou démarrage d’un trial, la destination cible reste :

```text
/workspaces/:workspaceId/dashboard
```

Le dashboard reflète ensuite le plan réellement actif/effectif.

## 12. Premier dashboard

La première expérience Workspace utilise les conventions déjà figées :

- message d’accueil uniquement si le contexte réel le permet ;
- empty states guidés ;
- actions adaptées aux permissions ;
- résumé plan/trial si pertinent ;
- aucune fausse donnée métier.

L’onboarding se poursuit par progressive disclosure plutôt que par un tunnel initial surchargé.

## 13. Invitation + aucun autre workspace

Un utilisateur arrivant via une invitation valide n’est pas forcé à créer un workspace personnel avant d’accepter l’invitation.

Il peut rejoindre directement le workspace invité puis, si la politique produit l’autorise, créer un autre workspace ultérieurement.

## 14. Invitation invalide ou expirée

Une invitation invalide ne produit pas un dead end.

Le frontend propose une remédiation adaptée :

```text
workspace disponible → Voir mes workspaces
aucun workspace      → Créer mon espace
```

Le message reste compréhensible et n’expose pas de détail technique inutile.

## 15. Utilisateur sans workspace

Un utilisateur authentifié sans workspace peut accéder à une surface d’onboarding/choix de contexte, mais pas à `/workspaces/:workspaceId/*` puisqu’aucun tenant n’existe encore.

Cette contrainte est structurelle au modèle multi-tenant et ne constitue pas un paywall.

## 16. Plans accessibles maintenant et plus tard

La comparaison des plans reste accessible :

```text
pendant l’onboarding
et
Workspace → Abonnement → Comparer les plans
```

Les mêmes primitives/composants de présentation commerciale doivent être réutilisés afin d’éviter plusieurs catalogues incohérents.

## 17. Famille de composants de plan

Le design system peut progressivement fournir :

```text
PlanCard
PlanComparison
PlanFeatureList
```

Ces composants peuvent être utilisés par :

```text
Pricing public
Onboarding
Subscription Workspace
```

Le CTA varie selon le contexte, mais les données du plan restent issues du backend.

## 18. Routes d’onboarding

Le parcours peut utiliser des routes explicites telles que :

```text
/onboarding/workspace
/onboarding/plans
```

L’URL représente l’étape réelle. Le router ne doit pas maintenir artificiellement dans l’onboarding un utilisateur dont le contexte est déjà résolu.

Les segments exacts pourront être ajustés lors de l’implémentation si nécessaire, sans modifier les frontières fonctionnelles.

## 19. Pas de flag onboardingCompleted sans besoin réel

Le frontend/backend ne crée pas un champ `onboardingCompleted` uniquement pour mémoriser un état déjà dérivable du contexte réel.

Un état d’onboarding persistant ne sera introduit que si de futures étapes non dérivables nécessitent réellement une persistance dédiée.

## 20. Resolver de contexte

La résolution post-login appartient à une abstraction dédiée du routing/onboarding et ne doit pas être dispersée dans plusieurs pages.

Elle décide entre :

```text
invitation
workspace existant
création workspace
choix workspace
Platform si cas autorisé
```

## 21. SUPER_ADMIN

Un SUPER_ADMIN n’est pas automatiquement forcé à créer un workspace ni automatiquement redirigé vers Platform uniquement du fait de son rôle.

S’il n’a aucun workspace et qu’il dispose de l’accès Platform :

```text
Platform peut rester accessible
création workspace reste facultative
```

Le contexte et l’intention de navigation restent prioritaires.

## 22. Pas de progression artificielle

Le Core ne met pas en place de jauge de progression onboarding du type `25 % / 50 % / 75 %` tant que le parcours obligatoire reste aussi court.

Une checklist ou progression pourra être ajoutée plus tard dans un SaaS métier si plusieurs étapes réelles apportent une valeur utilisateur.

## 23. Invariants normatifs

```text
Créer un workspace → Free immédiatement utilisable
Trial             → jamais automatique
Invitation        → priorité sur création workspace lorsque pertinente
Onboarding        → minimal et non bloquant commercialement
Plan              → géré au niveau Workspace
Dashboard         → destination finale commune
```

Cette politique prévaut pour l’implémentation de l’onboarding Core V1.