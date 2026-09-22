# SAAS-CORE-API — Reprise courante

**Dernière mise à jour :** 2026-09-22
**Base stable avant ce lot :** v1.1.2
**Lot courant :** autorisation globale applicative
**Version cible :** 1.2.0

## État réel de référence

Le lot part du commit main :

    193e632d62cb048f3988e073665759cce8dd379f

correspondant à Core 1.1.2.

La publication de 1.2.0 n’est effective qu’après :

    Pull Request unique
    → Core Gate verte
    → merge main
    → tag immuable v1.2.0
    → GitHub Release

## Décision d’architecture

Le Core distingue désormais trois autorités :

    Platform authorization
    Application-global authorization
    Workspace authorization

Application-global authorization répond au besoin de ressources métier globales d’un SaaS dérivé qui n’appartiennent ni à Platform ni à un Workspace.

La nouvelle frontière repose sur :

    backend/config/applicationGlobalPermission.registry.js
    ApplicationGlobalRole
    ApplicationGlobalMember
    resolveApplicationGlobalAuthorization()
    authorizeApplicationGlobalPermission()

Le Core n’embarque aucune permission métier GMS ou autre permission produit.

## Sécurité

Les droits globaux sont résolus depuis MongoDB.

- aucun droit implicite depuis PlatformRole ou PlatformTeamMember ;
- aucun droit implicite depuis Role ou WorkspaceMember ;
- rôle archivé = zéro droit ;
- membership suspendu ou révoqué = zéro droit ;
- permission persistée inconnue = refus ;
- permission reserved interdite dans un rôle personnalisé ;
- création/modification/assignation limitée aux permissions déjà détenues par l’acteur ;
- bootstrap réservé aux seeds/migrations du produit ;
- User.status reste contrôlé par authenticate.

## Production

autoIndex étant désactivé en production, le lot introduit :

    npm run migration:application-global-authorization-indexes

Cette migration doit être exécutée avant utilisation de la primitive par un SaaS dérivé.

## Frontend

Aucune surface frontend Core n’est ajoutée.

Les produits dérivés montent leurs propres routes et écrans de gouvernance en utilisant les primitives backend Core.

## Produit saas-fiches-techniques-gms

Après publication et intégration de Core 1.2.0, M-002 pourra reprendre sans utiliser platform:* pour la gouvernance de son référentiel métier global.

Le produit devra composer ses permissions globales métier, synchroniser ses rôles système, attribuer explicitement les memberships nécessaires et protéger ses routes métier avec le guard Core.

Les concepts Produit, Catalogue, CanonicalProduct, ProductVariant et ProductCategory restent hors du Core.

## Références canoniques

    AGENTS.md
    docs/contracts/APPLICATION-GLOBAL-AUTHORIZATION.md
    docs/contracts/PLATFORM-TEAM.md
    docs/contracts/CAPABILITIES.md
    docs/derived-saas/DERIVED-SAAS.md
    docs/derived-saas/EXTENSION-POINTS.md
    docs/security/SECURITY.md
    docs/releases/1.2.0.md
    docs/releases/MIGRATION-POLICY.md
    docs/releases/RELEASE-POLICY.md

Le code réel, les contraintes MongoDB et les tests réellement exécutés restent prioritaires sur ce document.
