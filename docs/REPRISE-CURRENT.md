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
- maintenir une documentation dédiée à l'architecture, la sécurité, aux guidelines frontend, aux SaaS dérivés, à la conformité et aux opérations ;
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

docs/operations/OPERATIONS.md
```

Document encore à produire :

```text
README.md racine
```

Avant ce README final restent également les lots de consolidation de dette et de nettoyage documentaire.

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
- le Core actuel possède le cookie `refreshToken` HttpOnly et une préférence de thème dans `localStorage` ;
- aucun SDK analytics/publicitaire ni script de tracking tiers n'est actuellement identifié dans le frontend ;
- aucune bannière cookies fictive ne doit être imposée par défaut ;
- si des traceurs soumis au consentement sont ajoutés, ils devront être réellement bloqués avant consentement ;
- les durées techniques ne sont pas des durées réglementaires automatiques ;
- les workflows de droits doivent être coordonnés avec D-001, D-003 et D-006 ;
- responsable de traitement / sous-traitant, sous-traitants, transferts hors UE/EEE, AIPD et violations de données doivent être revus selon le produit ;
- D-003 et D-006 restent actives : DOC-7 documente le cadre mais ne résout pas leurs implémentations.

Aucun code ni test n'a été modifié. Aucun fichier historique n'a été supprimé.

### DOC-8 — terminé

Document canonique créé :

```text
docs/operations/OPERATIONS.md
```

Décisions structurantes :

- backend et frontend possèdent leurs installations et commandes séparées ;
- `.env.example` définit la structure de configuration mais jamais les secrets de production ;
- `env.js` applique une validation Zod fail-fast et des garde-fous spécifiques à la production ;
- MongoDB est requis avant démarrage HTTP et doit supporter les transactions utilisées par le Core ;
- `autoIndex` est désactivé en production : les indexes sont gérés explicitement par migrations ;
- le serveur exécute la maintenance des temporaires avant l'écoute HTTP, sans rendre cette purge ponctuelle bloquante ;
- seed, migration, job et opération destructive de développement sont quatre responsabilités séparées ;
- `seed:plans` et `seed:super-admin` sont conçus pour être prudents/idempotents selon leur contrat ;
- les migrations sont actuellement des runners individuels ; aucune table d'historique automatique globale n'a été trouvée, donc chaque release doit documenter l'ordre de migration ;
- les jobs Subscription/File sont des processus autonomes pouvant être lancés par cron/scheduler ; leur présence dans le dépôt ne signifie pas qu'ils sont planifiés en production ;
- le provider File actif est `local`; l'abstraction de stockage prépare de futurs providers mais D-007 reste ouverte ;
- quarantaine et stockage définitif doivent rester séparés ;
- ClamAV utilise `clamscan`, timeout contrôlé et politique fail-closed ; sa disponibilité réelle n'est pas vérifiée au startup ;
- `/api/health` est un liveness HTTP, pas une readiness MongoDB/SMTP/ClamAV/storage ;
- le rollback de code n'annule jamais automatiquement une migration de données ; aucune down migration universelle n'existe actuellement ;
- backup/restauration, readiness, observabilité, scheduling production, CI/CD, proxy/trust proxy, stockage production et supervision antivirus restent à finaliser selon le produit ;
- D-005, D-007 et D-013 restent actives : DOC-8 consolide les règles d'exploitation sans prétendre que l'infrastructure production est implémentée.

Aucun code ni test n'a été modifié. Aucun fichier historique n'a été supprimé.

---

## 6. Prochain lot documentaire

**DOC-9 — Consolidation finale de la dette**.

Objectifs :

1. auditer `docs/DEBT.md` contre tous les documents canoniques créés de DOC-0 à DOC-8 ;
2. corriger les références devenues obsolètes dans le registre de dette ;
3. vérifier que chaque dette possède un périmètre, un statut, un caractère bloquant et un critère de clôture cohérents ;
4. regrouper les dépendances entre dettes sans dupliquer leur contenu ;
5. distinguer dettes réellement Core, dettes propres aux applications dérivées et dettes conditionnelles ;
6. préparer la feuille de route fonctionnelle de finalisation après le chantier documentaire ;
7. ne supprimer aucun ancien fichier pendant DOC-9.

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