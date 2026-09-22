# SAAS-CORE-API — Reprise courante

**Dernière mise à jour :** 2026-09-22  
**Baseline stable :** v1.2.0  
**Commit baseline :** 5703a7536b4b77945cec3e7ba8198bc29e2b28b7  
**Lot courant :** upload temporaire sécurisé configurable  
**Release cible :** aucune — changement volontairement non tagué

## État réel de référence

Le lot part du commit main :

    5703a7536b4b77945cec3e7ba8198bc29e2b28b7

correspondant à Core 1.2.0.

Le travail est réalisé sur :

    feat/configurable-secure-temporary-upload

Objectif Git :

    une branche
    → une PR Core
    → Core Gate
    → un merge main

Aucun bump de version, tag ou GitHub Release n'est prévu pour ce lot.

## Besoin générique

Un SaaS dérivé doit pouvoir recevoir un fichier multipart uniquement pour un
traitement technique temporaire, en réutilisant les garanties de sécurité du
Core sans créer un document File durable.

Premier besoin démontré : import de données tabulaires dans un produit dérivé.

Le Core ne connaît aucune règle métier d'import.

## Architecture retenue

Le pipeline existant est généralisé au lieu d'être dupliqué.

Primitives ajoutées ou généralisées :

    createMulterUpload()
    normalizeTemporaryUploadPolicy()
    createUploadedFileTypeInspector()
    createSecureTemporaryUploadService()

Le comportement historique du module File durable reste le défaut :

    PDF
    JPEG
    PNG

## Politique configurable

Le produit dérivé peut déclarer :

    MIME autorisés
    extensions autorisées
    taille maximale
    contentInspector spécialisé si nécessaire

La dépendance actuelle file-type sait reconnaître XLSX/OOXML mais n'accepte
pas CSV ni les anciens fichiers XLS/MS-CFB comme types identifiés.

Le contrat impose donc un contentInspector produit pour les formats que
file-type ne sait pas distinguer de manière suffisamment fiable.

Une simple confiance dans le nom du fichier, son extension ou son MIME client
est interdite.

## Sécurité conservée

Le pipeline temporaire conserve :

    quarantaine disque
    limites Multer
    nom temporaire aléatoire
    inspection du contenu
    checksum SHA-256
    antivirus
    fail-closed
    nettoyage après erreur d'inspection
    nettoyage après erreur du consommateur
    purge des temporaires abandonnés
    confinement des chemins

## Non-persistance

Cette primitive n'impose pas :

    document File MongoDB
    capability file_upload
    quota storage_bytes
    quota file_uploads_monthly
    corbeille utilisateur
    stockage définitif

Le produit reste responsable des permissions et capabilities métier de la
route qui consomme le fichier.

## Produit saas-fiches-techniques-gms

Après merge de ce lot Core :

1. relever le commit exact de main Core ;
2. intégrer ce commit dans le produit selon la stratégie de dérivation ;
3. mettre à jour core-origin.json avec le commit réellement intégré sans
   inventer de nouvelle release ;
4. remettre feature/m002-catalogue-produits à jour ;
5. remplacer multer.memoryStorage() par la primitive Core ;
6. définir les contentInspectors produit nécessaires aux formats réels ;
7. reprendre M-002 sans recommencer le module.

## Références canoniques

    AGENTS.md
    docs/contracts/SECURE-TEMPORARY-UPLOAD.md
    docs/derived-saas/DERIVED-SAAS.md
    docs/derived-saas/EXTENSION-POINTS.md
    docs/releases/RELEASE-POLICY.md
    docs/DEBT.md

Le code réel et les tests réellement exécutés restent prioritaires sur ce
document.
