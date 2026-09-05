# SAAS-CORE-API — Réinitialisation d’un trial en développement

## Objectif

Permettre de rejouer les parcours Trial du Core avec le même compte et le même workspace pendant le développement, sans affaiblir la règle métier de production « une identité ne consomme qu’un seul premier trial ».

La logique HTTP de `grantTrial` n’a aucun bypass lié à `NODE_ENV`. Le reset est une opération CLI séparée de l’API.

## Garde-fous obligatoires

La commande ne peut s’exécuter que lorsque les trois conditions suivantes sont réunies :

1. `NODE_ENV=development` ;
2. `ALLOW_DEVELOPMENT_DATA_RESET=true` ;
3. le flag `--confirm-development-reset` est fourni explicitement.

`ALLOW_DEVELOPMENT_DATA_RESET=true` est refusé par la validation d’environnement lorsque `NODE_ENV=production`.

La commande exige également :

- l’email explicite de l’identité de test ;
- l’identifiant explicite du workspace ;
- que cette identité soit l’owner actif du workspace ciblé.

Aucun endpoint HTTP de reset n’existe.

## Données modifiées

Le reset supprime, dans une transaction :

- la preuve `TrialEligibility` de l’identité ciblée ;
- la Subscription `commercial` du workspace uniquement si son statut est `trialing`, `canceled` ou `expired`.

Le reset conserve :

- la Subscription `baseline` ;
- le User ;
- le Workspace ;
- les memberships et rôles ;
- les AuditLogs historiques.

Le nom commercial du Plan baseline n’est pas un invariant du Core : l’outil se fonde sur la sémantique structurelle baseline, pas sur un nom tel que `Free`.

Une Subscription commerciale `active` ou `past_due` provoque un refus. L’outil ne doit pas effacer silencieusement un scénario de paiement ou de cycle commercial actif.

## Utilisation

Dans `.env` :

```env
NODE_ENV=development
ALLOW_DEVELOPMENT_DATA_RESET=true
```

Puis depuis la racine :

```powershell
npm run dev:reset-trial -- --email=compte-test@example.com --workspace-id=507f1f77bcf86cd799439011 --confirm-development-reset
```

Après les essais manuels, remettre de préférence :

```env
ALLOW_DEVELOPMENT_DATA_RESET=false
```

## Pourquoi ne pas ignorer TrialEligibility en développement

Un bypass dans `grantTrial` ferait tester une logique différente de celle utilisée en production et pourrait masquer des erreurs de concurrence, d’éligibilité ou de cycle de vie.

Le reset de données permet au contraire de remettre explicitement le scénario dans son état initial tout en exécutant ensuite exactement le même code métier que la production.
