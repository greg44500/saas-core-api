# SAAS-CORE-API — Backend Core V1 Ready for Frontend

**Statut :** checkpoint R1 validé  
**Date :** 30 août 2026  
**Périmètre :** Backend Core V1  
**Référence de validation :** suite globale Vitest exécutée localement après consolidation D1

## 1. Décision de readiness

Le Backend Core V1 est considéré **prêt pour démarrer l’intégration frontend**.

Cette décision signifie que les contrats HTTP nécessaires au futur frontend sont suffisamment stabilisés, que les invariants Core ont été audités et que la suite globale de tests est verte au checkpoint R1.

Elle ne signifie pas que le produit est prêt pour une mise en production commerciale complète. Les dettes explicitement différées restent suivies dans `docs/backend-implementation-checklist.md` et dans les documents de dette dédiés.

## 2. Validation finale R1

Résultat de la suite globale exécutée localement :

```text
Test Files  181 passed (181)
Tests       845 passed (845)
```

Aucun test en échec n’a été signalé pour ce checkpoint.

Les commits D1 postérieurs au dernier hardening applicatif sont documentaires ; ils n’ont pas modifié les routes, controllers, services, models, middlewares ou validations du backend.

## 3. Domaines Core validés pour consommation frontend

Le checkpoint couvre notamment :

- User / Auth / sessions / refresh rotation ;
- Workspaces et contexte multi-tenant ;
- Roles / Permissions ;
- Workspace Members ;
- Invitations ;
- transfert d’ownership ;
- catalogue Plans ;
- Subscription workspace, trial et entitlement effectif ;
- quotas et UsageMetric ;
- Files : upload, listing, lecture, téléchargement et soft delete ;
- AuditLog workspace ;
- administration Platform réservée `SUPER_ADMIN` ;
- jobs lifecycle et purge ;
- seeds et migrations nécessaires au Core.

## 4. Contrats frontend de référence

Le frontend doit prendre comme sources de vérité :

```text
docs/frontend-backend-integration-contract.md
docs/frontend-backend-subscription-contract.md
```

Le contrat global a été aligné pendant D1 sur le HEAD Core V1 pour les surfaces stabilisées.

Le contrat Subscription spécialisé a été revérifié contre les routes, validations et controllers actuels sans divergence nécessitant une correction.

Le frontend ne doit pas inventer d’endpoints à partir des services internes du backend.

## 5. Garanties architecturales vérifiées avant le checkpoint

Les lots précédant R1 ont notamment validé :

- validation stricte des entrées ;
- permissions centralisées ;
- isolation tenant sur les domaines sensibles ;
- transactions pour les opérations multi-documents critiques ;
- quotas protégés côté backend ;
- actions sensibles auditées ;
- index opérationnels audités ;
- non-exposition des secrets et données techniques sensibles dans les contrats publics ;
- variables d’environnement durcies ;
- politique `autoIndex` adaptée à la production ;
- seeds/migrations audités pour idempotence et exploitation ;
- jobs bornés, déterministes et rejouables selon leur contrat ;
- suppression des usages de validation Mongoose synchrones identifiés comme dette runtime.

## 6. Dettes connues qui ne bloquent pas le démarrage du frontend

Restent volontairement hors du checkpoint **Ready for Frontend** :

- fermeture/suppression fonctionnelle complète du compte utilisateur et du workspace ;
- corbeille/restauration utilisateur des fichiers ;
- Billing/Payment réel, moyens de paiement, fiscalité, factures, webhooks provider et cycle définitif `past_due` ;
- provider cloud de stockage et antivirus adaptés à l’environnement de production ;
- Notifications génériques sans besoin métier concret ;
- API Keys tant qu’aucun usage M2M n’est défini ;
- webhooks génériques sans provider/événement concret.

Ces éléments ne doivent pas être implémentés implicitement pendant F0 ou dans les composants frontend.

## 7. OpenAPI — décision séparée R2

OpenAPI reste un item distinct du checkpoint R1.

Le backend peut démarrer son frontend à partir des contrats Markdown stabilisés, mais la décision de maintenir l’exigence OpenAPI pour le Core doit être prise explicitement dans **R2**.

Si cette exigence est conservée, la spécification devra décrire le contrat réellement implémenté et rester alignée avec les deux documents d’intégration de référence. Elle ne devra pas inventer de routes futures.

## 8. Règle de changement après checkpoint

À compter de ce checkpoint, toute modification backend observable par le frontend doit entraîner une revue du contrat correspondant lorsqu’elle modifie notamment :

- endpoint ou méthode HTTP ;
- paramètres, query ou body ;
- validation ;
- permission ou rôle requis ;
- statut HTTP ;
- DTO ou champ public ;
- convention d’erreur ;
- règle d’entitlement, quota ou remédiation visible par le client.

Un refactor strictement interne ne doit pas provoquer artificiellement une modification de contrat.

## 9. Prochaine séquence

```text
C1  Checklist backend officielle                         TERMINÉ
H1  Audit jobs / maintenance / reconciliation            TERMINÉ
H2  Audit index / secrets / env / operational hardening  TERMINÉ
D1  Contrat frontend/backend Core global                 TERMINÉ
R1  Suite globale finale + checkpoint readiness          TERMINÉ
R2  OpenAPI : confirmer l’exigence puis produire/aligner À DÉCIDER
F0  Fondation frontend                                   APRÈS DÉCISION R2
```

## 10. Conclusion

Le Backend Core V1 dispose désormais d’un checkpoint explicite permettant d’engager le développement frontend sans rouvrir les invariants backend déjà stabilisés.

Les futures fonctionnalités produit devront s’appuyer sur ce socle au lieu de contourner ses frontières Auth, Workspace, Permissions, Subscription, Quotas, Files et AuditLog.
