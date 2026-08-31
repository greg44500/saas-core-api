# SAAS-CORE-API — Politique UX des formulaires Auth

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1

## 1. Objectif

Ce document fixe l’UX des formulaires Auth, leur validation et leur intégration dans l’AuthLayout.

## 2. Stack formulaire

```text
React Hook Form
+ Zod frontend
+ @hookform/resolvers
+ primitives shadcn/ui
+ mutations RTK Query
```

Les valeurs des formulaires ne sont pas stockées dans Redux.

Le backend reste l’autorité de validation et de sécurité. La validation frontend sert l’expérience utilisateur et reprend uniquement les contraintes réellement exposées par le contrat backend.

## 3. Schémas frontend

Les schémas frontend sont séparés des fichiers backend.

Les règles sont alignées avec le contrat HTTP, mais le frontend n’importe pas directement les modules backend.

Toute modification observable du contrat backend entraîne une revue des schémas frontend concernés.

## 4. Composants réutilisables

Les formulaires Auth réutilisent une famille commune dans `components/forms`, notamment lorsque nécessaire :

```text
FormField
FormLabel
FormMessage
PasswordField
```

Le composant `PasswordField` gère l’affichage/masquage via Eye/EyeOff, reste accessible au clavier et n’altère jamais la valeur du secret.

## 5. AuthEntry et routes

L’expérience Auth utilise un conteneur visuel partagé, sobre et soigné.

Les routes restent distinctes et sont la source de vérité :

```text
/login    → LoginForm
/register → RegisterForm
```

Le login est l’écran par défaut de l’entrée Auth.

Depuis `/login`, une action claire `Créer un compte` navigue vers `/register`.

Depuis `/register`, une action `Déjà un compte ? Se connecter` navigue vers `/login`.

La transition visuelle entre Login et Register peut utiliser une animation courte et discrète : fade, léger slide et adaptation fluide de la hauteur. L’animation ne doit jamais masquer l’état de navigation ni nuire à l’accessibilité.

## 6. Login

Structure cible :

```text
Connexion
Email
Mot de passe
Mot de passe oublié ?
Se connecter
Créer un compte
```

Les erreurs de credentials restent génériques et ne permettent pas de distinguer un email inexistant d’un mot de passe invalide.

Le mot de passe peut être affiché/masqué.

## 7. Register

Structure cible :

```text
Créer votre compte
Prénom
Nom
Email
Mot de passe
Confirmer le mot de passe
Créer mon compte
Déjà un compte ? Se connecter
```

`confirmPassword` est un champ frontend uniquement et n’est jamais envoyé à l’API.

Le formulaire Register reste court. Aucun choix de plan, moyen de paiement ou information commerciale détaillée n’est ajouté directement au formulaire d’inscription.

Après register réussi, le backend actuel n’authentifiant pas automatiquement l’utilisateur, le frontend affiche un message de succès puis redirige vers Login.

## 8. Politique mot de passe

Le contrat actuel impose 15 à 128 caractères sans règle artificielle obligatoire de majuscule, chiffre ou symbole.

Le frontend affiche cette contrainte réelle et ne crée pas de checklist de composition inexistante.

Aucun indicateur de robustesse arbitraire `faible/moyen/fort` n’est introduit en V1 tant qu’une politique de scoring réelle n’est pas définie.

## 9. Forgot password

Formulaire minimal : email + action d’envoi.

Le frontend conserve la réponse générique anti-énumération : aucune information ne doit permettre de déduire si un compte existe.

## 10. Reset password

Le token de reset est lu depuis l’URL et n’est jamais demandé manuellement à l’utilisateur.

Le formulaire contient :

```text
Nouveau mot de passe
Confirmer le nouveau mot de passe
```

Après succès : message de confirmation puis navigation vers Login.

## 11. Change password

Dans `Account > Security` :

```text
Mot de passe actuel
Nouveau mot de passe
Confirmer le nouveau mot de passe
```

Avant soumission, l’interface informe que la modification déconnectera toutes les sessions actives.

Après succès, la session frontend est nettoyée conformément à la politique Auth/session puis l’utilisateur retourne sur Login.

## 12. Validation UX

Première validation : au blur ou au submit.

Lorsqu’un champ est déjà invalide, la validation peut se réévaluer pendant la correction.

Les erreurs de champ sont affichées directement sous le champ concerné.

Un submit invalide place le focus sur le premier champ invalide lorsque possible.

Une erreur backend clairement rattachable à un champ peut être rendue inline. Une erreur non rattachable reste une erreur de formulaire globale ; le frontend ne devine pas arbitrairement son origine.

## 13. Soumission

Pendant une mutation :

```text
bouton submit désactivé
+ loader local
+ prévention double soumission
```

Le formulaire ou la page entière n’est pas bloqué par un overlay global sauf besoin exceptionnel.

Après une erreur serveur de login, le mot de passe peut rester temporairement dans le state du formulaire afin d’éviter une ressaisie inutile. Il disparaît à la navigation/unmount et n’est jamais persisté côté navigateur.

## 14. Autocomplete

Attributs recommandés :

```text
email                 → email
prénom                → given-name
nom                   → family-name
mot de passe login    → current-password
nouveau mot de passe  → new-password
```

`autocomplete="off"` n’est pas utilisé par défaut pour empêcher les gestionnaires de mots de passe.

## 15. AuthLayout

L’AuthLayout est distinct des layouts authentifiés : pas de sidebar Workspace/Platform.

Il présente un conteneur centré, responsive, compatible light/dark, avec branding sobre et formulaire principal clairement identifiable.

Le design peut être qualitatif et animé, mais la lisibilité, la vitesse d’usage et l’accessibilité priment sur l’effet visuel.

## 16. Séparation Auth et plan

L’inscription crée une identité ; elle ne force pas un choix commercial dans le même formulaire.

Le choix de plan appartient au parcours d’onboarding/création du workspace. Le plan Free doit fournir un chemin fonctionnel d’entrée lorsque l’utilisateur crée son propre workspace.

Un utilisateur rejoignant un workspace existant ne doit pas être obligé de choisir un abonnement personnel.
