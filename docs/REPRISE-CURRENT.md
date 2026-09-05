# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il est mis à jour en place à chaque checkpoint significatif et sera supprimé lorsque le SAAS-CORE-API sera finalisé et que sa documentation canonique sera complète.

## 1. Rôle du document

`REPRISE-CURRENT.md` sert uniquement à reprendre le travail entre deux conversations ou deux sessions de développement.

Il n'est pas une source normative. En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés validés ;
3. contrats canoniques actifs ;
4. architecture, sécurité et conventions actives ;
5. registre de dette actif ;
6. présent document.

Git conserve l'historique de ses versions ; aucune synthèse datée supplémentaire n'est nécessaire.

---

## 2. État de reprise

Le développement fonctionnel reste temporairement suspendu avant la poursuite de **F10.6** afin de finaliser le chantier documentaire du Core.

Aucune logique applicative backend/frontend ne doit être modifiée dans ce chantier documentaire sauf décision explicite séparée si un audit révèle une incohérence de code.

---

## 3. Principes documentaires validés

- centraliser la documentation structurante sous `docs/` ;
- conserver une séparation logique backend/frontend sans deux silos documentaires concurrents ;
- vérifier le code et les tests avant de consolider les anciens documents ;
- ne supprimer aucun fichier sans validation explicite ;
- maintenir un registre unique des dettes ;
- maintenir des contrats canoniques communs frontend/backend ;
- maintenir une documentation dédiée à l'architecture, la sécurité, aux guidelines frontend, aux SaaS dérivés et à la conformité ;
- créer le README racine après stabilisation des chemins ;
- utiliser uniquement `REPRISE-CURRENT.md` pour les futures reprises.

---

## 4. Documents canoniques déjà créés

```text
docs/README.md
docs/DEBT.md
docs/REPRISE-CURRENT.md

docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md

docs/architecture/ARCHITECTURE.md
docs/architecture/BACKEND.md
docs/architecture/FRONTEND.md

docs/security/SECURITY.md

docs/frontend/FRONTEND-GUIDELINES.md

docs/derived-saas/DERIVED-SAAS.md

docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md
```

Documents encore à produire :

```text
docs/operations/OPERATIONS.md
README.md racine
```

---

## 5. Checkpoints documentaires

### DOC-0 — terminé

- `docs/DEBT.md` est le registre canonique unique des dettes actives ;
- `docs/REPRISE-CURRENT.md` est l'unique synthèse de reprise temporaire.

### DOC-1 — terminé

- inventaire documentaire réalisé ;
- fragmentation confirmée ;
- `docs/README.md` créé comme index canonique et tableau de migration ;
- centralisation sous `docs/` validée ;
- aucune suppression.

### DOC-2 — terminé

Contrats canoniques créés :

```text
docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md
```

Décisions importantes corrigées contre le code :

- clé technique Plan générée par le backend et non saisie par le SUPER_ADMIN ;
- clé non exposée dans le catalogue public ;
- baseline portée par `systemRole = baseline` / `isBaseline` ;
- entitlement Workspace composé avec les overrides actifs ;
- métadonnées internes d'override réservées à Platform ;
- `team_management` protège membres, invitations et rôles ;
- `audit_logs` protège uniquement la consultation des logs Workspace ;
- politique commerciale V1 Workspace-scoped ;
- `ACTIVE_PLAN_CAPABILITY_REGISTRY` autorité runtime ;
- capabilities métier déclarées par le logiciel, jamais créées librement depuis Platform.

Aucun ancien contrat n'a été supprimé.

### DOC-3 — terminé

Documents créés :

```text
docs/architecture/ARCHITECTURE.md
docs/architecture/BACKEND.md
docs/architecture/FRONTEND.md
```

Décisions structurantes :

- le Core fournit les fondations SaaS génériques ; les applications dérivées ajoutent leurs modules métier ;
- dépendance `module métier → Core`, jamais `Core → métier spécifique` ;
- Account, Workspace et Platform sont trois contextes distincts ;
- Workspace reste la frontière tenant du Core V1 ;
- backend organisé par modules avec responsabilités route/controller/service/model/validation explicites ;
- services techniques transverses séparés ;
- frontend organisé par app/components/features/services/api/store/hooks/lib/utils ;
- RTK Query pour le server state ; Redux Toolkit global seulement si justifié ; état local via React ;
- composants réutilisables obligatoires lorsque pertinents ;
- versions documentées alignées sur les packages réellement installés.

Aucun code ni test n'a été modifié. Aucun document historique n'a été supprimé.

### DOC-4 — terminé

Document canonique créé :

```text
docs/security/SECURITY.md
```

Sécurité consolidée contre le code courant :

- défense en profondeur : Auth → validation → tenant → RBAC → access mode → entitlement → quota → service → DB → transaction → audit selon le risque ;
- credentials séparés de `User` dans `AuthIdentity` ;
- access token non considéré comme autorité unique ;
- refresh token brut jamais persisté ni retourné en JSON ;
- AuthSession à génération unique avec rotation transactionnelle et reuse detection ;
- multi-tenant Workspace vérifié par membership/Role du même tenant ;
- permission, entitlement et quota restent trois barrières distinctes ;
- quotas bornés réservés atomiquement ;
- pipeline File fail-closed avec type réel, checksum, antivirus et revalidation ;
- AuditLog distingué de l'observabilité technique ;
- Helmet, CORS, rate limits et environnement de production validés ;
- guards frontend explicitement non considérés comme barrières de sécurité.

Aucun code, test ou fichier historique n'a été supprimé.

### DOC-5 — terminé

Document canonique créé :

```text
docs/frontend/FRONTEND-GUIDELINES.md
```

Règles pratiques consolidées :

- architecture et guidelines frontend restent deux responsabilités distinctes ;
- même intention UI → même famille de composants ;
- `DataTable` obligatoire pour les tableaux compatibles ;
- `EntityDetailsDrawer`, `ConfirmationDialog` et composants formulaires partagés réutilisés lorsque pertinents ;
- server state → RTK Query ; URL → navigation partageable ; form state → React Hook Form ; local → React ; Redux global seulement si justifié ;
- permission et capability filtrent navigation/actions lorsque pertinentes ;
- absence d'une capability d'écriture ≠ disparition automatique de toute surface de lecture ;
- onboarding minimal, feedback contextuel, accessibilité, responsive et performance documentés ;
- Vitest + React Testing Library + user-event actifs ; Playwright reste la cible E2E mais n'est pas encore installé.

Aucun code ni test n'a été modifié. Aucun fichier historique n'a été supprimé.

### DOC-6 — terminé

Document canonique créé :

```text
docs/derived-saas/DERIVED-SAAS.md
```

Décisions structurantes :

- un produit maintenable conserve l'historique Git du Core ;
- GitHub Template n'est pas la stratégie canonique pour un produit devant recevoir les mises à jour du Core ;
- `origin` = dépôt produit et `upstream-core` = dépôt `saas-core-api` ;
- le Core courant reste `0.1.0` et devra atteindre une vraie `v1.0.0` avant diffusion ;
- SemVer PATCH / MINOR / MAJOR retenu ;
- chaque produit devra tracer sa version propre et la version Core intégrée ;
- upgrades par branche dédiée + migrations + tests + revue + Pull Request ;
- corrections génériques découvertes dans un SaaS dérivé doivent remonter dans le Core ;
- Capability Registry et navigation Workspace possèdent déjà des points de composition ;
- routing backend/frontend, permissions métier, traçabilité version Core et release process doivent encore être renforcés avant 1.0 ;
- packages séparés non retenus pour la V1 ;
- un test réel création + upgrade d'un SaaS pilote sera requis avant de considérer la stratégie validée.

Aucun code ni test n'a été modifié. Aucun fichier historique n'a été supprimé.

### DOC-7 — terminé

Documents canoniques créés :

```text
docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md
```

Décisions structurantes :

- la conformité est transverse : technique + documentation + exploitation + qualification juridique ;
- le Core fournit un cadre générique, chaque SaaS dérivé doit qualifier ses traitements et prestataires réels ;
- l'inventaire technique vivant ne remplace pas le registre des activités de traitement ;
- les anciens documents RGPD/cookies très redondants sont désormais absorbés sur le fond mais conservés physiquement jusqu'à autorisation de suppression ;
- le Core actuel possède le cookie `refreshToken` HttpOnly et une préférence de thème dans `localStorage` ;
- aucun SDK analytics/publicitaire ni script de tracking tiers n'est actuellement identifié dans le frontend ;
- aucune bannière cookies fictive ne doit donc être imposée par défaut ;
- si des traceurs soumis au consentement sont ajoutés, ils devront être réellement bloqués avant consentement et le refus devra rester aussi accessible que l'acceptation ;
- `ConsentConfiguration`, `ConsentRecord`, Consent Manager et tracker gating sont des architectures futures conditionnelles, non des fonctionnalités actuellement implémentées ;
- les durées techniques ne sont pas des durées réglementaires automatiques ;
- la matrice de conservation doit couvrir base active, archivage intermédiaire, purge/anonymisation et sauvegardes ;
- les workflows de droits doivent être coordonnés avec D-001, D-003 et D-006 ;
- responsable de traitement / sous-traitant doivent être qualifiés traitement par traitement ;
- sous-traitants, contrats article 28 et transferts hors UE/EEE doivent être revus par produit ;
- une AIPD doit être évaluée lorsqu'un traitement est susceptible d'engendrer un risque élevé ;
- une procédure de violation de données doit exister en production, avec registre interne et notification CNIL lorsque requise, si possible sous 72 heures pour une violation présentant un risque ;
- mentions légales, politiques et informations publiques doivent utiliser les données réelles du produit ;
- D-003 et D-006 restent actives : DOC-7 documente le cadre mais ne résout pas leurs implémentations.

Sources officielles CNIL/RGPD ont été revérifiées au 2026-09-05 pendant DOC-7.

Aucun code ni test n'a été modifié. Aucun fichier historique n'a été supprimé.

---

## 6. Prochain lot documentaire

**DOC-8 — Opérations**.

Objectifs :

1. consolider l'environnement et les variables de configuration ;
2. documenter démarrage backend/frontend et prérequis ;
3. documenter MongoDB et les contraintes de transactions ;
4. distinguer seeds, migrations, jobs et opérations manuelles ;
5. documenter l'ordre d'exécution et l'idempotence attendue ;
6. documenter stockage, répertoires temporaires et antivirus ;
7. documenter health check et dépendances externes ;
8. cadrer déploiement production, migrations pré/post déploiement et rollback ;
9. relier observabilité, backups et incident response aux dettes encore ouvertes ;
10. préparer les anciennes checklists opérationnelles à devenir candidates à suppression sans rien supprimer dans DOC-8.

---

## 7. Finalisation fonctionnelle du SAAS-CORE-API

Après le chantier documentaire complet :

```text
reprendre F10.6
→ auditer l'état fonctionnel réel
→ établir les lots restant à finaliser
→ traiter les blockers Core / production
→ finaliser les points d'extension dérivés identifiés en DOC-6
→ traiter les dettes Core indispensables
→ audit sécurité et tests
→ tester réellement création + upgrade d'un SaaS dérivé pilote
→ version Core finalisée
```

La feuille de route distinguera les obligations génériques du Core des responsabilités propres à chaque SaaS dérivé.

---

## 8. Distribution et maintenance des futurs SaaS

Décision actuelle :

```text
Core finalisé et versionné
↓
création du produit en conservant l'historique Git du Core
↓
origin = dépôt produit
upstream-core = dépôt SAAS-CORE-API
↓
modules métier ajoutés par composition
↓
future release Core
↓
branche d'upgrade
↓
tests + migrations + revue
↓
Pull Request produit
```

Le GitHub Template ne doit pas être confondu avec cette stratégie de maintenance.

---

## 9. Critère de suppression de ce fichier

`docs/REPRISE-CURRENT.md` pourra être supprimé lorsque :

- le Core sera considéré comme finalisé ;
- la documentation canonique sera complète et auditée ;
- la politique de distribution/versionnement sera réellement testée et opérationnelle ;
- aucune reprise de développement Core n'exigera plus de contexte temporaire.

La suppression nécessitera une validation explicite.