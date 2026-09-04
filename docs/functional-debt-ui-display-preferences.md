# SAAS-CORE-API — Dette fonctionnelle : préférences d’affichage utilisateur

**Statut :** À CADRER — évolution différée
**Date :** 2026-09-04
**Périmètre :** Core clonable et applications dérivées

## 1. Objet

Prévoir une future capacité permettant à un utilisateur d’alléger son interface en choisissant quelles informations secondaires sont affichées par défaut.

Exemples envisagés :

- masquer ou afficher certaines cartes de dashboard ;
- réduire des sections non essentielles ;
- conserver un affichage plus minimal pour un utilisateur qui ne souhaite pas voir toutes les synthèses disponibles ;
- restaurer facilement l’affichage par défaut.

Cette dette concerne uniquement la **présentation personnelle de données auxquelles l’utilisateur a déjà accès**.

Elle ne doit jamais modifier :

- les permissions RBAC ;
- les entitlements commerciaux ;
- les données réellement disponibles côté backend ;
- les contrôles de sécurité ;
- les obligations d’information qui ne peuvent pas être masquées pour des raisons légales ou de sécurité.

## 2. Questions à trancher avant implémentation

- portée de la préférence : User global ou couple User / Workspace ;
- stockage local navigateur ou persistance backend ;
- comportement sur plusieurs appareils ;
- liste des composants réellement personnalisables ;
- valeurs par défaut définies par l’application dérivée ;
- stratégie de migration lorsqu’une nouvelle carte est ajoutée ;
- bouton de réinitialisation des préférences ;
- comportement pour les cartes obligatoires ou critiques ;
- éventuelle synchronisation avec d’autres préférences UI futures.

## 3. Architecture recommandée à étudier

Ne pas créer un ensemble de booléens dispersés dans les composants.

La future solution devra privilégier un contrat centralisé, par exemple conceptuellement :

```text
UiPreferences
→ scope utilisateur
→ éventuellement scope Workspace
→ clés d’affichage stables
→ valeurs validées
```

Le frontend pourra utiliser `useState` pour l’ouverture locale temporaire d’une carte, mais une préférence durable partagée entre sessions devra être traitée comme une donnée persistante et non comme un état local éphémère.

## 4. Critère de déclenchement

Cette dette doit être réévaluée lorsque les dashboards et modules métier d’une application dérivée deviennent suffisamment riches pour que la densité d’information pose un vrai problème d’usage.

Elle ne doit pas être implémentée dans le Core uniquement pour anticiper un besoin hypothétique.

## 5. Invariant

```text
Préférence d’affichage
≠ permission
≠ entitlement
≠ suppression de donnée
```

Masquer une carte signifie uniquement ne pas la présenter par défaut à cet utilisateur.
