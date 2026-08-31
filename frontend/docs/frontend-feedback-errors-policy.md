# SAAS-CORE-API — Politique Frontend feedback, erreurs et confirmations

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1

## 1. Objectif

Cette politique fixe la manière d'informer l'utilisateur après une action, une erreur API, une erreur réseau, une erreur de route ou une action sensible.

Le principe directeur est :

```text
erreur de champ             → inline
erreur de formulaire        → dans la surface concernée
succès de mutation          → toast si utile
erreur de chargement local  → état d'erreur local
erreur de route             → page d'état
action destructive          → confirmation avant action
```

Les messages restent humains, directs, actionnables et non techniques.

## 2. Toasts

Une infrastructure globale unique de notifications est utilisée.

Catégories :

```text
success
info
warning
error
```

Les toasts confirment une action dont le résultat n'est pas immédiatement évident, par exemple une invitation envoyée, un rôle modifié, un fichier supprimé ou un downgrade programmé.

Une simple navigation ou ouverture de panneau ne déclenche pas de toast inutile.

Les succès et informations peuvent disparaître automatiquement. Les warnings et erreurs importantes restent visibles assez longtemps pour être compris ou peuvent nécessiter une fermeture explicite selon gravité.

## 3. Validation de formulaire

Les erreurs de validation frontend sont affichées inline sous le champ concerné.

Un toast n'est jamais utilisé pour une erreur de champ.

Lorsque le backend retourne une erreur de validation sans précision de champ, le frontend affiche une erreur globale de formulaire et ne tente pas de deviner le champ concerné.

Les données saisies restent conservées après un échec de mutation.

## 4. Normalisation centrale des erreurs API

Les erreurs RTK Query sont normalisées par une couche centrale avant présentation.

Architecture cible :

```text
lib/errors/
├── normalizeApiError.js
├── getErrorMessage.js
└── errorCodes.js si nécessaire
```

La normalisation peut produire une forme interne du type :

```text
{
  type,
  status,
  message,
  retryable
}
```

Les composants ne doivent pas interpréter directement et différemment les formes brutes de `fetchBaseQuery`.

Les comparaisons dispersées sur le texte exact d'un message backend sont interdites.

Si une UX métier précise nécessite à terme des codes d'erreur stables, le contrat backend devra évoluer pour les exposer explicitement plutôt que le frontend n'invente des codes locaux fragiles.

## 5. 401 — session

Un `401` récupérable est invisible pour l'utilisateur :

```text
401
→ refresh automatique
→ succès
→ requête rejouée
```

Aucun toast technique n'est affiché.

Si le refresh échoue définitivement :

```text
clear Auth/cache
→ Login
```

Un seul message générique peut indiquer que la session a expiré et qu'une nouvelle connexion est nécessaire.

## 6. 403 — accès interdit

Un `403` ne déclenche pas de logout.

Pour une action locale : message contextualisé dans la surface concernée.

Pour une route entière : surface `Forbidden` dédiée avec explication claire et action de retour utile.

L'interface peut masquer préventivement les actions interdites selon les permissions connues, mais le backend reste l'autorité.

## 7. 404 — ressource ou route introuvable

Deux cas sont distingués :

```text
route frontend inconnue
ressource backend inexistante ou masquée
```

Une route frontend inconnue affiche une page globale `NotFound`.

Une ressource backend introuvable affiche une formulation générique du type :

```text
Cette ressource n'existe pas ou n'est plus disponible.
```

Si le backend utilise volontairement `404` pour masquer une ressource non autorisée, le frontend respecte cette sémantique et n'affiche pas un diagnostic de permission inventé.

## 8. Conflits métier

Les conflits de ressources ou d'état, notamment les futurs `409`, sont contextualisés lorsque le backend permet une interprétation fiable.

Exemples : invitation déjà existante, ressource modifiée entre-temps, changement devenu incompatible.

Le frontend évite les interprétations fragiles fondées uniquement sur le texte exact d'un message.

## 9. Quotas, plans et entitlement

Une limite de plan ou de quota n'est pas traitée comme une simple erreur rouge.

Le frontend explique la contrainte et propose une remédiation lorsque pertinente :

```text
limite atteinte
→ expliquer
→ afficher usage/limite
→ proposer action adaptée
```

Exemples : `Voir mon utilisation`, `Comparer les plans` ou action de mise en conformité selon les permissions.

Les fonctionnalités non incluses dans un plan sont présentées avec une explication et un CTA commercial seulement si approprié.

## 10. Erreurs réseau

Une absence de réponse réseau est distinguée d'une réponse serveur en erreur.

Message de référence :

```text
Impossible de contacter le serveur. Vérifiez votre connexion puis réessayez.
```

Une action `Réessayer` est proposée lorsque pertinente.

Lors d'un refetch échoué, les données déjà affichées restent visibles lorsqu'elles sont encore disponibles dans le cache ; un échec d'actualisation ne remplace pas automatiquement tout le contenu par une page d'erreur.

## 11. Erreurs 500

Les erreurs internes restent génériques côté utilisateur.

Aucune stack trace, erreur MongoDB/Mongoose/JWT ou détail technique interne n'est affiché.

Message UX de référence :

```text
Une erreur inattendue est survenue. Réessayez dans quelques instants.
```

Une action de retry peut être proposée lorsqu'elle est sûre.

## 12. Composants d'état partagés

Une famille commune est créée pour les principaux états :

```text
StateMessage
├── ErrorState
├── ForbiddenState
├── NotFoundState
└── NetworkErrorState
```

Chaque composant peut recevoir icône, titre, description et actions.

## 13. React Error Boundary

Les exceptions React inattendues sont gérées séparément des erreurs API.

Une `ErrorBoundary` protège au minimum les grands contextes applicatifs ou routes/layouts importants afin d'éviter un écran blanc total.

La surface de secours reste générique et propose des actions utiles, par exemple réessayer ou revenir au dashboard.

Les détails techniques sont réservés au développement et au logging approprié.

## 14. Confirmations destructrices

Les actions destructrices ou à fort impact utilisent une confirmation dédiée avant exécution.

La confirmation précise :

```text
titre explicite
conséquence réelle
Annuler
bouton d'action explicite
```

Les boutons vagues `Oui` / `Non` sont évités.

Pour les opérations exceptionnellement critiques ou irréversibles, une confirmation renforcée peut demander le nom d'une ressource ou une phrase explicite.

Cette confirmation renforcée n'est pas utilisée pour les suppressions ordinaires.

## 15. Feedback de mutation

Pendant une mutation :

```text
bouton déclencheur disabled
+ loader local
```

La page entière n'est pas bloquée sans nécessité.

Après succès, la donnée affichée est réellement mise à jour via RTK Query/cache et un toast peut compléter le feedback.

Le toast ne remplace jamais la mise à jour visuelle de la donnée.

Après échec, formulaire/panneau/modal reste ouvert et les données saisies sont conservées.

## 16. Éviter les cascades de notifications

Les erreurs de lectures parallèles sont affichées dans leurs zones respectives.

Un dashboard dont plusieurs widgets échouent ne doit pas générer une cascade de toasts rouges.

Les toasts sont principalement réservés aux actions explicitement déclenchées par l'utilisateur ou aux événements globaux réellement nécessaires.

## 17. Accessibilité

Les feedbacks importants utilisent les mécanismes accessibles appropriés (`aria-live`, `role="alert"`, focus management selon contexte).

Le feedback ne repose jamais uniquement sur la couleur.

## 18. Logging client et données sensibles

Le frontend ne journalise jamais dans la console ou un futur outil de monitoring :

```text
password
accessToken
refresh token
reset token
données personnelles sensibles
réponses complètes contenant des secrets
```

La discipline s'applique aussi en développement.

## 19. Règle de présentation

La couche de normalisation est centrale, mais la présentation reste contextuelle.

```text
Validation utilisateur      → inline
Erreur d'une zone           → dans la zone
Mutation réussie            → mise à jour UI + toast si utile
Mutation échouée            → feedback contextualisé
401 récupérable             → invisible
401 définitif               → Login
403                         → Forbidden
404                         → Not Found
500                         → message générique + retry éventuel
Erreur réseau               → message réseau + retry
Destructif                  → confirmation
Critique                     → confirmation renforcée proportionnée
```

Cette politique est normative pour les futurs lots frontend.