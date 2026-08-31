# SAAS-CORE-API — Checklist Feedback/Erreurs Frontend

**Statut :** cadrage figé, implémentation à faire  
**Date :** 31 août 2026

## Décisions figées

- [x] Erreurs de champs affichées inline.
- [x] Erreurs globales de formulaire affichées dans la surface du formulaire.
- [x] Une infrastructure globale unique de toasts est retenue.
- [x] Toasts limités aux confirmations utiles et événements globaux nécessaires.
- [x] Pas de toast pour une simple navigation ou ouverture de panneau.
- [x] Les erreurs RTK Query sont normalisées centralement avant présentation.
- [x] Les mappings dispersés basés sur le texte exact des messages backend sont interdits.
- [x] 401 récupérable par refresh : invisible pour l'utilisateur.
- [x] 401 définitif : nettoyage Auth/cache + retour Login avec message générique.
- [x] 403 : feedback local pour action ou surface Forbidden pour route.
- [x] 404 : distinction route inconnue / ressource inexistante ou masquée.
- [x] Le frontend respecte un 404 backend sans inventer un diagnostic de permission.
- [x] Conflits métier contextualisés uniquement lorsque le contrat permet une interprétation fiable.
- [x] Quotas/plans/entitlements utilisent une logique de remédiation contextualisée.
- [x] Erreur réseau distinguée d'une erreur HTTP serveur.
- [x] Un refetch échoué conserve les données déjà disponibles lorsqu'elles restent valides dans le cache.
- [x] Erreurs 500 présentées avec un message générique sans détail interne.
- [x] Famille partagée d'états Error/Forbidden/NotFound/Network.
- [x] React Error Boundary retenue pour les grands contextes applicatifs.
- [x] Actions destructrices confirmées avec conséquence explicite et libellé d'action précis.
- [x] Confirmation renforcée réservée aux opérations réellement critiques.
- [x] Mutation en cours : feedback local + déclencheur disabled, sans blocage plein écran par défaut.
- [x] Succès de mutation : donnée réellement mise à jour + toast éventuel.
- [x] Échec de mutation : surface conservée ouverte + saisie préservée.
- [x] Pas de cascade de toasts pour plusieurs erreurs de lecture parallèles.
- [x] Messages humains, directs, actionnables et non techniques.
- [x] Feedback important accessible via aria-live/role=alert/focus approprié.
- [x] Aucun feedback ne repose uniquement sur la couleur.
- [x] Aucun secret/credential n'est journalisé côté client.

## Implémentation à faire

- [ ] Choisir et configurer la solution de toast compatible avec le design system.
- [ ] Créer la couche de normalisation des erreurs API.
- [ ] Définir la forme normalisée interne des erreurs.
- [ ] Créer les helpers de messages UX si nécessaire.
- [ ] Créer `StateMessage` ou primitive équivalente.
- [ ] Créer `ErrorState`.
- [ ] Créer `ForbiddenState`.
- [ ] Créer `NotFoundState`.
- [ ] Créer `NetworkErrorState`.
- [ ] Intégrer les états d'erreur locaux dans les composants de données.
- [ ] Implémenter les pages de route 403/404.
- [ ] Implémenter la gestion du 500 générique.
- [ ] Implémenter la gestion réseau et les boutons Retry pertinents.
- [ ] Implémenter les confirmations destructrices partagées.
- [ ] Implémenter la confirmation renforcée uniquement pour les workflows critiques concernés.
- [ ] Implémenter une Error Boundary pour les grands contextes/routes.
- [ ] Intégrer la gestion d'accessibilité des alertes et du focus.
- [ ] Vérifier que les mutations RTK Query actualisent/invalident correctement les données visibles.
- [ ] Garantir la conservation des données de formulaire/panneau lors d'un échec de mutation.
- [ ] Ajouter les remédiations quota/plan/entitlement selon les contrats des features.
- [ ] Auditer les logs/console afin d'exclure tout secret ou credential.

## Tests unitaires

- [ ] `normalizeApiError` pour 400/401/403/404/409/500/réseau.
- [ ] helper de message UX si abstraction dédiée.
- [ ] sélection des états Retryable/non-Retryable si utilisée.
- [ ] composants d'état partagés.
- [ ] confirmation destructive.

## Tests d'intégration

- [ ] validation frontend invalide → erreur inline, aucun toast.
- [ ] 400 backend sans détail de champ → erreur globale de formulaire.
- [ ] 401 récupérable → aucun message visible, requête réussie après refresh.
- [ ] 401 définitif → Login + un seul message générique.
- [ ] 403 action locale → page conservée + message contextualisé.
- [ ] 403 route → surface Forbidden.
- [ ] 404 ressource → message générique sans fuite de permission.
- [ ] 500 → message générique, aucun détail technique.
- [ ] erreur réseau → état réseau + Retry lorsque pertinent.
- [ ] refetch échoué → anciennes données conservées si présentes.
- [ ] mutation réussie → donnée visible mise à jour + toast approprié.
- [ ] mutation échouée → formulaire/panneau reste ouvert et saisie conservée.
- [ ] plusieurs widgets en erreur → pas de cascade de toasts.
- [ ] quota dépassé → remédiation contextualisée, pas simple erreur brute.

## Tests E2E

- [ ] erreur de login générique et non énumérative.
- [ ] expiration de session récupérable totalement transparente.
- [ ] session réellement expirée → redirection Login cohérente.
- [ ] navigation vers route interdite → Forbidden accessible.
- [ ] navigation vers route inconnue → NotFound accessible.
- [ ] simulation réseau indisponible → message et Retry cohérents.
- [ ] action destructive → confirmation explicite avant mutation.
- [ ] erreur React capturée → fallback Error Boundary au lieu d'un écran blanc.

## Validation manuelle

- [ ] aucun toast inutile sur navigation simple.
- [ ] aucune cascade de notifications lors d'erreurs parallèles.
- [ ] aucun message JWT/Mongoose/Mongo/stack exposé à l'utilisateur.
- [ ] aucun mot de passe/token/secrets dans les logs client.
- [ ] feedback lisible en mode clair et sombre.
- [ ] feedback compréhensible sans se reposer sur la couleur.
- [ ] navigation clavier correcte dans les confirmations et états d'erreur.
- [ ] lecteur d'écran informé des erreurs et succès importants.
