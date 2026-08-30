# SAAS-CORE-API — Backend Core V1 Ready for Frontend

**Statut :** checkpoint R1 validé — décision R2 actée  
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

Pour la phase actuelle de développement, le frontend prend comme sources de vérité documentaires :

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

## 7. OpenAPI — décision R2

La décision R2 est actée : **OpenAPI n’est pas requis pour démarrer ni poursuivre le développement frontend du Core V1**.

Le contexte actuel est celui d’un développement assuré par un développeur unique sur `saas-core-api` et sur les futurs modules métier. Dans ce cadre, les contrats Markdown stabilisés et maintenus avec le backend constituent une documentation suffisante pour la phase de construction actuelle.

OpenAPI est donc **différé**, et non abandonné. Son intérêt sera réévalué lors de la finalisation complète backend/frontend, notamment si le projet doit alors bénéficier d’une documentation API standardisée, d’outillage automatique, de consommateurs supplémentaires ou d’une API destinée à des intégrations externes.

Si OpenAPI est introduit ultérieurement, la spécification devra décrire le contrat réellement implémenté au moment de cette finalisation et rester alignée avec les contrats Markdown de référence. Elle ne devra pas inventer de routes futures.

Cette décision évite de maintenir prématurément une troisième représentation du contrat HTTP pendant une phase où backend, frontend et futurs modules métier vont continuer à évoluer sous la responsabilité du même développeur.

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
R2  Décision OpenAPI                                     TERMINÉ — DIFFÉRÉ
F0  Fondation frontend                                   PROCHAINE ÉTAPE
```

## 10. Conclusion

Le Backend Core V1 dispose désormais d’un checkpoint explicite permettant d’engager le développement frontend sans rouvrir les invariants backend déjà stabilisés.

La décision R2 ne crée aucun travail backend supplémentaire avant F0 : les contrats Markdown restent les références documentaires d’intégration pendant le développement actuel.

Les futures fonctionnalités produit devront s’appuyer sur ce socle au lieu de contourner ses frontières Auth, Workspace, Permissions, Subscription, Quotas, Files et AuditLog.