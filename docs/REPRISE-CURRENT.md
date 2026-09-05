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
```

Documents encore à produire :

```text
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
- `DataTable` reste la primitive obligatoire pour les tableaux compatibles ; une feature ne recrée pas la structure HTML d'un tableau ;
- `DataTableActions` et styles de densité communs restent centralisés ;
- `EntityDetailsDrawer` est la surface partagée privilégiée lorsque des détails doivent être consultés sans perdre le contexte de liste ;
- `ConfirmationDialog` porte les confirmations bloquantes compatibles avec son contrat ;
- composants formulaires partagés existants réutilisés avant création d'une variante ;
- React Hook Form + Zod frontend + mutations RTK Query pour les formulaires ; backend toujours autorité finale ;
- server state → RTK Query ; URL → navigation partageable ; form state → React Hook Form ; local → React ; Redux global seulement si justifié ; persistance navigateur interdite par défaut ;
- appels API centralisés ; pas de `fetch()` dispersé ni de second cache serveur sans décision d'architecture ;
- navigation Workspace composable : un SaaS dérivé ajoute ses groupes au point de composition `app/` sans modifier la Sidebar générique ;
- permission et capability peuvent filtrer navigation/actions ; les groupes sans élément visible disparaissent ;
- une capability complètement absente ne doit pas polluer l'UI avec des blocs permanents `Indisponible` ;
- nuance conservée : l'absence d'une capability d'écriture ne signifie pas automatiquement que toute surface de lecture disparaît, par exemple `file_upload` et `file_read` portent deux intentions distinctes ;
- onboarding minimal, trial volontaire et règles commerciales jamais reconstruites côté frontend ;
- feedback de proximité : champ inline, erreur locale dans sa surface, toast uniquement lorsqu'il apporte une valeur globale ;
- accessibilité intégrée aux composants partagés : focus, clavier, labels, alertes accessibles, réduction des animations ;
- responsive défini par comportement ;
- performance : lazy loading pour le code, pagination serveur pour les gros datasets, virtualisation seulement si besoin mesuré ;
- pages légères : assemblage et orchestration, pas de logique métier lourde ;
- Vitest + React Testing Library + user-event pour les tests unitaires/composants ; intégration cross-feature lorsque nécessaire ; Playwright reste la cible E2E mais n'est pas encore installé dans le package frontend actuel ;
- les futurs SaaS dérivés doivent composer les primitives du Core et ne pas recréer un design system, DataTable, système de toast, cache serveur ou architecture de navigation parallèle.

Anciennes policies et contrats frontend ayant servi de sources sont désormais considérés comme absorbés sur le fond, mais restent physiquement présents jusqu'au lot de nettoyage et à validation explicite.

Aucun code ni test n'a été modifié. Aucun fichier historique n'a été supprimé.

---

## 6. Prochain lot documentaire

**DOC-6 — SaaS dérivés et maintenance du Core**.

Objectifs :

1. définir le processus de création d'un nouveau SaaS à partir du Core ;
2. formaliser les frontières à ne pas modifier inutilement dans le Core ;
3. documenter l'ajout des modules métier backend/frontend et des capabilities ;
4. définir le versionnement du Core ;
5. enregistrer la version Core utilisée par chaque SaaS dérivé ;
6. définir la stratégie de mise à niveau contrôlée des produits existants ;
7. définir la gestion des migrations, changements de configuration et breaking changes ;
8. définir les tests de non-régression lors d'une mise à niveau ;
9. préciser la place de GitHub Template : outil possible de création initiale, mais pas stratégie suffisante de maintenance ;
10. préparer une stratégie progressive compatible avec un futur passage à des packages Core si le retour d'expérience le justifie.

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
