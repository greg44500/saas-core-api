# Dette fonctionnelle — File Trash / Restore

## Statut

Décision fonctionnelle validée et volontairement différée après le cycle de vie Core V1 des fichiers.

Le Core V1 retient le cycle suivant :

```text
active -> deleted -> purged
```

La suppression logique conserve temporairement le contenu physique avant purge, mais aucune restauration utilisateur n'est encore exposée.

## Orientation UX validée le 2026-09-02

La direction produit souhaitée est une corbeille utilisateur inspirée du fonctionnement de Google Drive :

- une suppression ordinaire place le fichier dans une corbeille au lieu de détruire immédiatement son contenu physique ;
- les fichiers supprimés restent visibles dans une vue Corbeille pendant la période de rétention ;
- l'interface indique la date de suppression et la date limite avant purge définitive ;
- une action de restauration doit permettre de réactiver un fichier tant qu'il n'a pas été purgé ;
- la destruction définitive manuelle reste une capacité distincte et plus sensible, qui n'est pas nécessaire pour la première version de la corbeille.

Cette orientation ne modifie pas les invariants backend actuels. Elle devra être recadrée explicitement au moment du lot frontend de soft-delete avant d'ajouter les endpoints de consultation/restauration nécessaires.

## Pourquoi la restauration nécessite un cadrage backend

Ajouter une restauration n'est pas une simple transition `deleted -> active`. Elle réintroduit une ressource dans la consommation fonctionnelle du workspace et doit donc être cadrée avec les quotas, les permissions et le mode de remédiation.

Avant toute implémentation, il faudra décider explicitement :

- quelle permission protège la restauration (`file:restore` ou autre politique dédiée) ;
- quels rôles peuvent consulter les fichiers supprimés ;
- si `file:read` suffit pour consulter la corbeille ou si une permission dédiée est réellement nécessaire ;
- comment `storage_bytes` est réservé atomiquement lors de la restauration ;
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

## Non-objectifs tant que le lot Trash / Restore n'est pas ouvert

Le développement courant ne doit donc pas ajouter prématurément :

- endpoint `/restore` ;
- listing public des fichiers supprimés ;
- permission de restauration ;
- réallocation automatique du quota après suppression ;
- restauration après purge physique.

## Point de reprise obligatoire

Lors du lot frontend qui introduira le soft-delete utilisateur, avant de considérer ce parcours comme finalisé, il faudra rappeler explicitement cette dette et décider si la Corbeille / Restore entre immédiatement dans le périmètre ou reste un lot séparé. La suppression simple ne doit pas faire oublier que le contenu physique est conservé pendant 30 jours et que l'architecture est volontairement compatible avec cette future corbeille.
