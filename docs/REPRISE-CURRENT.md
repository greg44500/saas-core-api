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
- maintenir une documentation dédiée à l'architecture, la sécurité, aux guidelines frontend et aux SaaS dérivés ;
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
```

Documents encore à produire :

```text
docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md
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
- mots de passe Argon2id via `node:crypto`, format versionné et comparaison `timingSafeEqual` ;
- access token non considéré comme autorité unique : `authenticate` recharge le User depuis MongoDB et vérifie son statut et `passwordChangedAt` ;
- refresh token brut jamais persisté ni retourné en JSON ; cookie HttpOnly, Secure en production, SameSite Lax actuel ;
- AuthSession à génération unique avec rotation transactionnelle, `familyId`, reuse detection et compromission de famille ;
- validation HTTP par Zod puis consommation de `req.validated` ;
- multi-tenant Workspace vérifié par existence/status du Workspace, membership actif et Role du même tenant ;
- permission, entitlement et quota documentés comme trois barrières distinctes ;
- quotas bornés réservés atomiquement ;
- pipeline File fail-closed avec type réel, checksum, antivirus et revalidation ;
- workflow File relit l'entitlement dans transaction, réserve les quotas et crée File + AuditLog de façon cohérente ;
- AuditLog distingué de l'observabilité technique ;
- Helmet, CORS, rate limits et environnement de production validés ;
- guards frontend explicitement non considérés comme barrières de sécurité.

Aucun code, test ou fichier historique n'a été supprimé.

### DOC-5 — terminé

Document canonique créé :

```text
docs/frontend/FRONTEND-GUIDELINES.md
```

Règles pratiques frontend consolidées :

- `architecture/FRONTEND.md` décrit la structure ; `FRONTEND-GUIDELINES.md` décrit la manière de développer les interfaces ;
- même intention UI → même famille de composants ; composition préférée à la duplication et au composant universel sur-paramétré ;
- hiérarchie `components/ui` → `shared` / `forms` / `data-display` → composants de feature ;
- `DataTable` reste la primitive obligatoire pour les tableaux compatibles ;
- `EntityDetailsDrawer`, `ConfirmationDialog` et composants formulaires partagés doivent être réutilisés lorsque leur contrat convient ;
- server state → RTK Query ; URL → navigation partageable ; form state → React Hook Form ; local → React ; Redux global seulement si justifié ;
- permission et capability filtrent navigation/actions lorsque pertinentes ;
- absence d'une capability d'écriture ≠ disparition automatique de toute surface de lecture ;
- onboarding minimal, trial volontaire et règles commerciales jamais reconstruites côté frontend ;
- feedback de proximité, accessibilité, responsive et performance documentés ;
- Vitest + React Testing Library + user-event actifs ; Playwright reste la cible E2E mais n'est pas encore installé.

Aucun code ni test n'a été modifié. Aucun fichier historique n'a été supprimé.

### DOC-6 — terminé

Document canonique créé :

```text
docs/derived-saas/DERIVED-SAAS.md
```

Décisions structurantes :

- un produit maintenable doit conserver l'historique Git du Core afin de pouvoir intégrer ses futures versions ;
- GitHub Template est un outil de démarrage possible mais n'est pas la stratégie canonique pour un produit devant recevoir les mises à jour du Core, car les historiques sont indépendants ;
- stratégie cible de dépôt : `origin` = dépôt du produit, `upstream-core` = dépôt `saas-core-api` ;
- le Core courant reste `0.1.0` et ne doit pas être considéré comme socle diffusé tant que `v1.0.0` n'est pas stabilisée ;
- versionnement sémantique PATCH / MINOR / MAJOR retenu ;
- chaque release Core devra fournir release notes, migrations, changements d'environnement, dépendances et compatibilité ;
- chaque produit devra tracer séparément sa version applicative et la version Core intégrée ; une convention de type `core-origin.json` est proposée mais reste à implémenter avant diffusion ;
- les mises à jour Core passent par une branche dédiée puis tests et Pull Request, jamais par injection aveugle dans `main` ;
- les corrections génériques trouvées dans un produit dérivé doivent idéalement remonter dans le Core afin que tous les produits en bénéficient ;
- Capability Registry et navigation Workspace possèdent déjà des points de composition dédiés ;
- les permissions métier possèdent des mécanismes d'extension partiels (`createSystemRoleDefinitions`) mais pas encore de point de composition applicatif complet équivalent au Capability Registry ;
- `backend/app.js` et `frontend/src/app/router.jsx` restent encore des fichiers centraux à modifier pour ajouter des routes métier ; cette limite doit être traitée avant Core 1.0 pour réduire les conflits d'upgrade ;
- release process / changelog, traçabilité version Core et CI d'upgrade restent également à formaliser avant 1.0 ;
- aucune `.github` canonique de CI n'est actuellement présente dans le dépôt ;
- transformation immédiate du Core en packages séparés non retenue ; à réévaluer après deux ou trois produits réels ;
- avant de déclarer la stratégie de dérivation finalisée, un exercice réel devra créer un dépôt pilote depuis une release Core puis lui intégrer une nouvelle version Core.

`core-deferred-work-for-derived-saas.md` est désormais absorbé sur le fond par `DERIVED-SAAS.md` et `DEBT.md`, mais reste physiquement présent jusqu'au lot DOC-10 et à validation explicite.

Aucun code ni test n'a été modifié. Aucun fichier historique n'a été supprimé.

---

## 6. Prochain lot documentaire

**DOC-7 — Conformité / RGPD**.

Objectifs :

1. consolider les anciens cadrages RGPD, cookies, confidentialité et mentions légales ;
2. distinguer obligation générique du Core et obligations dépendantes du produit dérivé ;
3. cadrer données personnelles, finalités, bases légales et droits ;
4. cadrer cookies/traceurs et consentement lorsque requis ;
5. intégrer l'inventaire vivant des trackers/providers ;
6. relier conformité, fermeture de compte, rétention, anonymisation et suppression ;
7. conserver une frontière claire entre documentation technique et validation juridique ;
8. préparer les anciens documents redondants à devenir candidats à suppression sans rien supprimer dans DOC-7.

---

## 7. Finalisation fonctionnelle du SAAS-CORE-API

Après le chantier documentaire complet :

```text
reprendre F10.6
→ auditer l'état fonctionnel réel
→ établir les lots restant à finaliser
→ traiter les blockers Core / production
→ finaliser les points d'extension dérivés identifiés en DOC-6
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
