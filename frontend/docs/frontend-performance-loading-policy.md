# SAAS-CORE-API — Politique de chargement, lazy loading et performance Frontend

**Statut :** référence normative frontend  
**Date :** 31 août 2026  
**Périmètre :** Frontend Core V1 et futurs modules métier

## 1. Objectif

Ce document fixe les règles de chargement du code, des données et des grandes listes afin de maintenir une expérience fluide sans introduire d’optimisations prématurées ou incohérentes.

La règle directrice est : **réduire ce qui est chargé, rendre visibles les temps d’attente utiles, et adapter la stratégie au type réel de charge**.

## 2. Trois problèmes différents

Le terme « lazy loading » ne doit pas mélanger :

```text
1. chargement différé du code JavaScript
2. chargement progressif des données
3. rendu de très grands volumes dans le DOM
```

Chaque problème a une solution distincte.

## 3. Lazy loading du code

Le route-level code splitting est retenu comme pratique par défaut pour les zones et fonctionnalités suffisamment lourdes.

React `lazy()` et `Suspense` peuvent être utilisés pour différer le téléchargement de routes ou de blocs fonctionnels non nécessaires au premier rendu.

Granularité recommandée :

```text
Auth
Workspace
Platform
features métier lourdes
```

Le projet ne doit pas lazy-loader systématiquement les petites primitives UI telles que boutons, badges ou cellules simples.

Objectif : éviter une multiplication de chunks et de transitions sans gain réel.

## 4. Stratégie de loaders

Il n’existe pas un loader unique pour tous les contextes.

### 4.1 Chargement de route ou gros bundle

Utiliser un `PageLoader` cohérent avec le design system.

Il peut intégrer :

- une animation discrète ;
- un symbole ou élément de marque ;
- un texte court uniquement si le temps d’attente ou l’action le justifie.

### 4.2 Chargement de données structurantes

Utiliser préférentiellement des skeletons lorsque la structure de l’écran est connue.

Exemples :

```text
dashboard
liste de membres
profil
fichiers
cards structurées
```

Le skeleton doit préserver la structure visuelle et limiter les sauts de layout.

### 4.3 Mutation ou action locale

Utiliser un feedback local :

```text
spinner dans le bouton
libellé de progression
désactivation contrôlée
progression d’upload lorsque disponible
```

Une action locale ne doit pas bloquer tout l’écran sans nécessité.

## 5. Chargement de gros volumes de données

Le volume de données ne doit pas être traité par `React.lazy()`.

Pour les datasets importants, le frontend doit éviter de charger l’ensemble des enregistrements si seule une fraction est visible.

Stratégie par défaut :

```text
pagination serveur
+ recherche serveur
+ filtres serveur
+ tri serveur
+ RTK Query
+ paramètres de navigation dans l’URL lorsque pertinent
```

Le backend reste responsable de fournir des endpoints paginés et filtrables lorsque le volume le justifie.

## 6. Pagination

La pagination explicite est la stratégie par défaut pour les vues professionnelles structurées :

```text
Users
Members
Files
Subscriptions
Audit Logs
listes métier administratives
```

Les paramètres utiles doivent être synchronisables avec l’URL lorsque la vue doit être rechargeable ou partageable :

```text
?page=3&limit=50&status=active&search=...
```

Cela respecte la politique de state management du projet.

## 7. Infinite loading

L’infinite loading n’est pas la stratégie par défaut.

Il peut être retenu lorsque la nature de l’expérience correspond à une consommation continue :

```text
activity feed
timeline
notifications
flux chronologique
catalogue exploratoire
```

Son adoption doit être justifiée par l’UX, et non uniquement par le volume de données.

## 8. Virtualisation

La virtualisation peut être introduite lorsque :

- un volume important est déjà chargé en mémoire ;
- le nombre d’éléments DOM devient un problème mesurable ;
- pagination ou réduction des données ne suffit pas au besoin fonctionnel.

Une bibliothèque de virtualisation peut alors être envisagée sans modifier le choix RTK Query pour le server state.

Exemple : TanStack Virtual pourrait être étudié si une grille métier massive le nécessite. Cela n’implique pas l’utilisation de TanStack Query.

La virtualisation ne doit pas être ajoutée prématurément sans problème observable.

## 9. RTK Query et cache

RTK Query reste la couche de server state.

Les endpoints doivent éviter :

- requêtes dupliquées ;
- fetch manuel dispersé ;
- conservation inutile de volumes excessifs ;
- invalidations trop larges ;
- duplication des données dans Redux classique.

Les tags, invalidations, pagination et éventuelles infinite queries sont définis progressivement par domaine.

## 10. États UX obligatoires

Toute vue dépendant de données asynchrones doit considérer selon le contexte :

```text
idle
loading
success
empty
error
forbidden
unauthenticated
refreshing / refetching lorsque pertinent
```

L’utilisateur ne doit pas confondre :

```text
aucune donnée
avec
chargement en cours
avec
erreur de chargement
```

## 11. Préserver les données déjà visibles

Lors d’un refetch ou changement léger de filtre, le frontend doit éviter de vider brutalement l’écran lorsqu’il est possible de conserver un contexte utile.

Le choix entre skeleton, données précédentes, indicateur de rafraîchissement ou transition dépend du type de vue et doit éviter les flashs inutiles.

## 12. Responsive et performance

Sur mobile ou réseau plus lent :

- éviter les bundles initiaux excessifs ;
- ne pas charger des données invisibles sans besoin ;
- adapter la densité des composants ;
- conserver un feedback immédiat sur les interactions.

Responsive et performance doivent être évalués ensemble sur les parcours critiques.

## 13. Mesure avant optimisation avancée

Les optimisations avancées telles que :

```text
virtualisation
memoization complexe
prefetch agressif
splitting très fin
```

ne doivent être introduites qu’avec un besoin identifiable ou une mesure démontrant leur intérêt.

Le projet privilégie d’abord :

```text
architecture claire
pagination serveur
cache cohérent
code splitting aux bonnes frontières
composants légers
requêtes limitées au besoin
```

## 14. Matrice de décision

```text
Problème : bundle initial trop lourd
→ route-level lazy loading / code splitting

Problème : attente de chargement de route
→ PageLoader

Problème : structure connue mais données absentes
→ Skeleton

Problème : mutation locale
→ feedback local dans le composant/action

Problème : dataset très volumineux
→ pagination/filtre/recherche/tri serveur

Problème : flux continu
→ infinite query si UX justifiée

Problème : trop d’éléments DOM rendus
→ virtualisation après mesure
```

## 15. Principe final

Le projet retient :

```text
code       → lazy loading aux frontières de routes/features lourdes
data       → chargement serveur progressif via RTK Query
large list → pagination serveur par défaut
feed       → infinite loading seulement si pertinent
DOM massif → virtualisation seulement si nécessaire
UX loading → loader, skeleton ou feedback local selon le contexte
```

Cette politique doit être appliquée dès l’architecture afin que les futurs modules métier à forte volumétrie puissent évoluer sans réécriture structurelle.