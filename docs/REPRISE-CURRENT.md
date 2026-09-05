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
- maintenir une documentation dédiée à l'architecture, la sécurité et aux SaaS dérivés ;
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
```

Documents encore à produire :

```text
docs/frontend/FRONTEND-GUIDELINES.md
docs/derived-saas/DERIVED-SAAS.md
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
- `mongoose.set('sanitizeFilter', true)` et usage de `mongoose.trusted()` limité aux filtres internes contrôlés ;
- multi-tenant Workspace vérifié par existence/status du Workspace, membership actif et Role du même tenant ;
- autorisation RBAC basée sur permissions, pas sur le nom du rôle ;
- administration Platform séparée du contexte Workspace ;
- permission, entitlement et quota documentés comme trois barrières distinctes ;
- quotas bornés réservés atomiquement avec condition MongoDB + `$inc` ;
- pipeline File : permission/access/feature avant Multer, limites multipart, signature binaire réelle, MIME/extension, SHA-256, antivirus fail-closed, stockage non dérivé du nom utilisateur, revalidation avant persistance ;
- workflow File : entitlement relu dans transaction, réservation atomique des quotas, File + AuditLog transactionnels, compensation du stockage physique si MongoDB échoue ;
- AuditLog distingué de l'observabilité technique ;
- erreurs inattendues génériques en production et logs volontairement limités ;
- Helmet, CORS ciblé, rate limit API et rate limits renforcés sur forgot-password ;
- environnement validé par Zod avec garde-fous spécifiques en production ;
- access token frontend en mémoire, refresh token inaccessible à JavaScript, reauth RTK Query centralisée avec mutex et cache API vidé à la terminaison de session ;
- guards frontend explicitement non considérés comme barrières de sécurité.

Point documentaire important : le code actuel confirme que les réservations de quotas sensibles sont bien atomiques. Le commentaire historique précédant `incrementUsageMetric` mentionne un futur contrôle de limite, mais le même service implémente ensuite `reserveUsageMetricWithinLimit`; la documentation canonique retient donc l'implémentation complète actuelle et non ce commentaire intermédiaire pris isolément.

Aucun code, test ou fichier historique n'a été supprimé.

---

## 6. Prochain lot documentaire

**DOC-5 — Guidelines frontend et composants réutilisables**.

Objectifs :

1. consolider les règles du design system ;
2. formaliser la hiérarchie `components/ui`, `shared`, `forms`, `data-display`, `features` ;
3. figer la réutilisation obligatoire de DataTable, pagination, drawers, confirmations et composants transverses ;
4. consolider formulaires, feedbacks, erreurs et toasts ;
5. consolider routing/navigation et affichage conditionnel permissions/entitlements ;
6. consolider state management ;
7. consolider responsive, accessibilité et performance ;
8. consolider les règles de tests frontend ;
9. confronter les anciennes policies au code actuel avant de les rendre candidates à suppression.

DOC-5 doit compléter `architecture/FRONTEND.md` sans créer une seconde architecture concurrente : `FRONTEND.md` décrit la structure et les responsabilités, `FRONTEND-GUIDELINES.md` décrira les règles pratiques de développement UI/UX.

---

## 7. Finalisation fonctionnelle du SAAS-CORE-API

Après le chantier documentaire complet :

```text
reprendre F10.6
→ auditer l'état fonctionnel réel
→ établir les lots restant à finaliser
→ traiter les blockers Core / production
→ audit sécurité et tests
→ figer la stratégie de distribution et de mise à jour
→ version Core finalisée
```

La feuille de route distinguera les obligations génériques du Core des responsabilités propres à chaque SaaS dérivé.

---

## 8. Distribution et maintenance des futurs SaaS

Exigence structurante : les SaaS dérivés doivent pouvoir recevoir de façon maîtrisée les correctifs et évolutions compatibles du Core sans écraser leurs modules métier.

La politique finale devra définir :

- versionnement du Core ;
- version Core utilisée par chaque SaaS ;
- séparation Core / métier ;
- procédure de mise à niveau ;
- migrations et configuration ;
- tests de non-régression ;
- résolution des conflits ;
- compatibilité et breaking changes.

Un GitHub Template pourra faciliter la création initiale d'une application mais ne résout pas, à lui seul, sa maintenance future.

---

## 9. Critère de suppression de ce fichier

`docs/REPRISE-CURRENT.md` pourra être supprimé lorsque :

- le Core sera considéré comme finalisé ;
- la documentation canonique sera complète et auditée ;
- la politique de distribution/versionnement sera opérationnelle ;
- aucune reprise de développement Core n'exigera plus de contexte temporaire.

La suppression nécessitera une validation explicite.
