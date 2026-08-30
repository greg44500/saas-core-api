# Dette fonctionnelle — File Trash / Restore

## Statut

Décision fonctionnelle validée et volontairement différée après le cycle de vie Core V1 des fichiers.

Le Core V1 retient le cycle suivant :

```text
active -> deleted -> purged
```

La suppression logique conserve temporairement le contenu physique avant purge, mais aucune restauration utilisateur n'est exposée en V1.

## Pourquoi la restauration est différée

Ajouter une restauration n'est pas une simple transition `deleted -> active`. Elle réintroduit une ressource dans la consommation fonctionnelle du workspace et doit donc être cadrée avec les quotas, les permissions et le mode de remédiation.

Avant toute implémentation, il faudra décider explicitement :

- si une corbeille utilisateur doit être exposée dans l'interface ;
- quelle permission protège la restauration (`file:restore` ou autre politique dédiée) ;
- quels rôles peuvent consulter les fichiers supprimés ;
- si `storage_bytes` doit être réservé atomiquement lors de la restauration ;
- le comportement lorsque le plan courant ne dispose plus de capacité suffisante ;
- le comportement pendant un mode de remédiation ;
- la conduite à tenir si le contenu physique n'existe plus alors que les métadonnées sont encore en `deleted` ;
- les règles UX concernant la date limite de restauration avant purge.

## Invariants à préserver

Une future restauration devra au minimum :

1. ne concerner qu'un fichier `deleted` non encore purgé ;
2. vérifier que le contenu physique est encore récupérable ;
3. réserver `storage_bytes` avant de réactiver le fichier ;
4. rendre quota, statut du fichier et AuditLog atomiquement cohérents lorsque MongoDB le permet ;
5. ne jamais reconstruire une clé de stockage depuis une donnée client ;
6. conserver la frontière multi-tenant `workspace + fileId` ;
7. produire un événement d'audit dédié ;
8. refuser la restauration si les contraintes du plan ne permettent pas de réintroduire le fichier.

## Non-objectifs Core V1

Le développement actuel ne doit donc pas ajouter :

- endpoint `/restore` ;
- listing public des fichiers supprimés ;
- permission de restauration ;
- réallocation automatique du quota après suppression ;
- restauration après purge physique.

Cette dette devra être réévaluée lors du cadrage UX/UI de la gestion documentaire ou lorsqu'un produit utilisant `saas-core-api` aura réellement besoin d'une corbeille utilisateur.
