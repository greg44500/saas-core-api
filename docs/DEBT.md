# SAAS-CORE-API — Registre canonique des dettes actives

**Statut :** source de vérité documentaire pour les dettes non résolues  
**Dernière mise à jour :** 2026-09-07  
**Périmètre :** Core clonable et, lorsque précisé, applications dérivées

---

## 1. Objet

Ce document est le registre unique des dettes fonctionnelles, techniques, de conformité, de distribution et de préparation à la production encore actives.

Il ne remplace pas la roadmap fonctionnelle courante. L'audit final du code peut encore révéler des lots fonctionnels restant à terminer sans qu'ils soient automatiquement des « dettes ».

Hiérarchie :

```text
code + contraintes DB
→ tests validés
→ contrats / architecture / sécurité canoniques
→ DEBT.md pour les écarts non résolus
```

Les anciens fichiers `functional-debt-*`, `core-deferred-work-for-derived-saas.md` et autres cadrages historiques ne portent plus le statut autoritatif des dettes.

---

## 2. Statuts autorisés

Les seuls statuts utilisés dans ce registre sont :

```text
À CADRER
PLANIFIÉ
EN COURS
DIFFÉRÉ
CONDITIONNEL
BLOQUÉ
VALIDÉ
NON APPLICABLE
```

Les notions telles que « par produit », « après ajout du métier » ou « avant production » ne sont pas des statuts. Elles sont décrites dans les champs **Périmètre**, **Blocage Core 1.0**, **Blocage production dérivée** et **Déclencheur**.

`NON APPLICABLE` doit être justifié dans le produit dérivé concerné.

---

## 3. Deux gates différentes

La consolidation DOC-9 distingue deux objectifs qui ne doivent plus être confondus.

### 3.1 Core 1.0 finalisé

Le Core peut être considéré comme un socle générique stable lorsque ses responsabilités communes sont cohérentes, testées, documentées et suffisamment extensibles pour être dérivées puis mises à niveau.

Un provider de paiement réel, une entreprise éditrice, un hébergeur ou une politique juridique spécifique ne sont pas nécessaires pour déclarer le **socle** finalisé.

### 3.2 SaaS dérivé prêt pour la production

Un produit dérivé doit en plus résoudre les dettes qui dépendent de son modèle commercial, de ses traitements de données, de ses providers et de son infrastructure.

Invariant :

```text
Core 1.0 finalisé
≠
produit dérivé automatiquement production-ready
```

---

## 4. Synthèse des dettes

### 4.1 Blockers connus de la finalisation Core 1.0

| ID | Dette | Statut |
|---|---|---|
| D-019 | Moteur sécurisé de rétention et purge des données Core | PLANIFIÉ |
| D-020 | Invitation commerciale client et offres privées de découverte | PLANIFIÉ |
| D-015 | Versionnement, provenance, releases et discipline de migration du Core | PLANIFIÉ |
| D-016 | E2E Core avec Playwright | PLANIFIÉ |
| D-017 | Validation réelle création + upgrade d'un SaaS dérivé pilote | PLANIFIÉ |

D-001 a été clôturée pendant CORE-FIN-4, D-014 pendant CORE-FIN-5 et D-018 le 2026-09-07. Elles ne sont plus des blockers actifs de la finalisation Core.

D-019 et D-020 sont volontairement placées avant D-015 : le versionnement ne doit pas figer une release candidate tant que ces deux capacités génériques déjà démontrées comme nécessaires ne sont pas cadrées puis implémentées ou explicitement reclassifiées.

### 4.2 Non-blockers Core 1.0 mais blockers possibles d'un produit réel

```text
D-003 conformité / RGPD
D-004 Billing / Payment
D-005 observabilité
D-006 rétention / anonymisation réglementaire
D-007 stockage fichiers production
D-012 E2E du produit dérivé
D-013 configuration / déploiement production
```

Leur applicabilité dépend du produit et de son exploitation.

### 4.3 Dettes différées ou conditionnelles

```text
D-002 corbeille / restauration Files
D-008 notifications étendues
D-009 API Keys / Webhooks
D-010 authentification avancée
D-011 préférences d'affichage avancées
```

Elles ne doivent pas être ajoutées au Core uniquement pour anticiper un besoin hypothétique.

### 4.4 Dettes récemment clôturées, conservées temporairement pour traçabilité

```text
D-001 fermeture de compte et cycle de vie Workspace → VALIDÉ
D-014 points d'extension métier RBAC/routing            → VALIDÉ
D-018 équipe Platform / RBAC / invitations internes     → VALIDÉ
```

Les sections correspondantes restent temporairement présentes afin de documenter leurs critères de clôture. Elles pourront être retirées du registre actif lors d'un nettoyage documentaire ultérieur, l'historique restant disponible dans Git.

---

## 5. Règles de maintenance

Pour chaque dette :

- conserver un identifiant stable ;
- utiliser uniquement un statut autorisé ;
- indiquer son périmètre ;
- distinguer le blocage Core 1.0 du blocage production d'un SaaS dérivé ;
- indiquer le déclencheur lorsque la dette dépend du produit ;
- définir un critère de clôture vérifiable ;
- ne pas dupliquer son statut dans un autre document ;
- lorsqu'elle devient `VALIDÉ`, vérifier le code, les tests et la documentation canonique concernés ;
- retirer ensuite la dette active lors d'un nettoyage documentaire ultérieur, l'historique restant disponible dans Git.

---

## D-001 — Fermeture de compte et cycle de vie de fermeture Workspace

**Statut :** VALIDÉ  
**Périmètre :** Core + intégration future avec les politiques du produit dérivé  
**Blocage Core 1.0 :** non — clôturé pendant CORE-FIN-4  
**Blocage production dérivée :** la politique de conservation réelle reste couverte par D-003 / D-006  
**Dépendances restantes :** D-003, D-006 uniquement pour la conformité et la purge du produit réel

### État validé

Le Core expose désormais :

```text
GET  /api/users/me/closure-impact
POST /api/users/me/closure
POST /api/workspaces/:workspaceId/archive
PATCH /api/platform/workspaces/:workspaceId/close
```

Le cycle de vie est explicitement séparé :

```text
ARCHIVED
→ retrait volontaire / opérationnel owner

CLOSED
→ fermeture fonctionnelle terminale Platform
```

La fermeture Account self-service :

- exige mot de passe courant, email de confirmation et `confirmAccountClosure = true` ;
- recalcule les ownerships et memberships depuis MongoDB ;
- archive automatiquement les Workspaces encore réellement possédés ;
- laisse actifs les Workspaces transférés avant la demande ;
- retire les memberships du User fermant ;
- libère les quotas membres concernés ;
- révoque les invitations pendantes reçues ;
- fait évoluer le User `ACTIVE → DELETION_REQUESTED → CLOSED` dans le workflow transactionnel ;
- révoque les AuthSessions ;
- audite les transitions sensibles.

L'archivage owner :

- est owner-only ;
- exige mot de passe courant et confirmation exacte du nom ;
- passe le Workspace `ACTIVE → ARCHIVED` ;
- neutralise les Subscriptions commerciales closables ;
- conserve la baseline ;
- révoque les invitations pendantes ;
- conserve les données et l'historique pour les traitements ultérieurs de rétention.

La fermeture terminale `CLOSED` reste réservée au workflow Platform.

Le durcissement Auth refuse `deletion_requested` / `closed` sur login, access token, refresh et reset-password. `forgot-password` reste neutre contre l'énumération sans fournir de récupération permettant de réactiver ces états.

Le frontend :

- place « Fermer mon compte » dans la page Sécurité ;
- récupère l'impact réel avant confirmation ;
- réutilise les composants partagés de confirmation ;
- termine la session et purge le cache RTK Query après fermeture ;
- expose l'archivage Workspace dans les paramètres owner uniquement ;
- n'invente pas une permission `workspace:archive` ni un impact chiffré non fourni par le backend.

### Validation

CORE-FIN-4 a été validé avec :

```text
backend : tests complets confirmés verts
frontend : tests ciblés confirmés verts
frontend : tests globaux confirmés verts
frontend : build Vite confirmé OK
```

La couverture E2E transversale avec Playwright reste le blocker générique D-016. Elle couvrira également les parcours de lifecycle pertinents, mais n'empêche plus D-001 d'être considérée fonctionnellement implémentée et validée.

### Compatibilité D-006

Invariant conservé :

```text
fermeture fonctionnelle / archivage
≠
purge physique immédiate
```

Le Core ne code aucune durée juridique universelle. Les politiques réelles de rétention, anonymisation et suppression restent à définir dans le SaaS dérivé via D-006.

---

## D-002 — Corbeille et restauration des fichiers

**Statut :** DIFFÉRÉ  
**Périmètre :** Core  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** non par défaut  
**Déclencheur :** besoin produit de restauration après suppression logique

Le cycle actuel permet la suppression logique puis la purge différée, mais aucune route de restauration n'est exposée.

Une restauration devra notamment définir :

- permission de restauration ;
- accès à la corbeille ;
- vérification de l'existence physique ;
- réservation atomique de `storage_bytes` ;
- comportement si le Plan ne permet plus la restauration ;
- comportement en mode remédiation ;
- audit dédié ;
- frontière multi-tenant stricte.

**Critère de clôture :** listing de corbeille et restauration sécurisés, quota cohérent, UI dédiée et tests de sécurité/concurrence pertinents.

---

## D-003 — RGPD, cookies, confidentialité et obligations légales

**Statut :** À CADRER  
**Périmètre :** chaque application dérivée + mécanismes génériques du Core lorsqu'ils deviennent nécessaires  
**Blocage Core 1.0 :** non par défaut  
**Blocage production dérivée :** oui lorsque les obligations sont applicables  
**Déclencheur :** mise en production réelle, nouveaux traitements/providers/traceurs, exercice des droits ou autre obligation applicable

Le cadre canonique est désormais :

```text
docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md
```

Le Core actuel ne possède aucun analytics/publicité/traceur tiers identifié et ne doit donc pas implémenter une fausse bannière de consentement uniquement par anticipation.

Selon le produit réel, il faudra finaliser notamment :

- registre des traitements ;
- finalités et bases légales ;
- information des personnes ;
- politiques et mentions légales ;
- cookies/traceurs et consentement seulement lorsque requis ;
- blocage réel des traceurs soumis au consentement ;
- sous-traitants et transferts ;
- exercice des droits ;
- AIPD lorsque requise ;
- procédure de violation de données ;
- validation juridique/organisationnelle appropriée.

Le futur module de consentement n'est donc pas un blocker Core 1.0 tant qu'aucun traitement générique du Core ne le nécessite.

**Critère de clôture :** pour le produit concerné, conformité technique/documentaire alignée sur les traitements réels, inventaire à jour et gate pré-production validée.

---

## D-004 — Billing / Payment réel

**Statut :** À CADRER  
**Périmètre :** application dérivée commercialisée avec paiement réel  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** oui pour une commercialisation payante automatisée  
**Déclencheur :** activation d'un encaissement réel

Le Core gère Plan, Subscription, trial, entitlement, quotas et dérogations. Ces mécanismes ne constituent pas une autorité financière.

À finaliser lorsqu'un produit devient payant :

- provider de paiement ;
- frontière Billing/Payment distincte de Subscription ;
- identité facturée ;
- moyens de paiement ;
- événements provider et idempotence ;
- échecs, retards, résiliations, remboursements ;
- remises, proratas et coupons réellement facturés ;
- TVA/taxes ;
- factures/avoirs lorsque nécessaires ;
- historique et audit financier adapté.

Les décisions de cadrage déjà retenues pendant CORE-FIN-4 restent valides pour la future D-004 :

- un incident de paiement ne désactive pas le User ;
- Subscription conserve l'état commercial réel ;
- une future grâce commerciale doit être temporaire, motivée, auditée et distincte d'EntitlementOverride ;
- un médiateur humain ne modifie jamais MongoDB à la main et ne force pas artificiellement `Subscription.status` ;
- un paiement externe doit être enregistré/rapproché par une commande métier dédiée ;
- les données de carte ne doivent pas être saisies ou stockées par le Core.

Invariant :

```text
Subscription / entitlement
≠
encaissement / facture / autorité financière
```

**Critère de clôture :** domaine Billing/Payment sécurisé et testé, provider intégré si nécessaire, idempotence démontrée et fiscalité/facturation validées pour le produit.

---

## D-005 — Observabilité technique de production

**Statut :** À CADRER  
**Périmètre :** chaque déploiement de production  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** oui pour une observabilité minimale adaptée au service  
**Déclencheur :** préparation d'un environnement de production

`AuditLog` reste un journal fonctionnel et de sécurité ; il ne remplace pas le monitoring technique.

À prévoir selon l'infrastructure :

- erreurs HTTP 5xx ;
- latence API ;
- santé MongoDB ;
- SMTP ;
- jobs planifiés ;
- pipeline antivirus/File ;
- erreurs frontend significatives ;
- corrélation `requestId` ;
- métriques et alertes ;
- politique de rétention des logs ;
- absence de secrets/données inutiles dans les logs.

Le `/api/health` actuel est un liveness check, pas une readiness complète.

**Critère de clôture :** instrumentation, alertes, liveness/readiness et procédures adaptées au déploiement réel, testées avant go-live.

---

## D-006 — Rétention, anonymisation et suppression réglementaire

**Statut :** À CADRER  
**Périmètre :** application dérivée + points d'intégration génériques du Core  
**Blocage Core 1.0 :** non comme politique juridique universelle  
**Blocage production dérivée :** oui lorsque des données personnelles, contractuelles ou réglementées sont conservées  
**Déclencheur :** cadrage pré-production du produit réel ; D-001 fournit désormais le cycle fonctionnel sur lequel brancher cette politique

Le soft delete, l'archivage ou `FILE_RETENTION_DAYS` ne constituent pas une politique réglementaire générale.

À définir par produit :

- comptes clôturés ;
- fichiers ;
- AuditLogs ;
- données contractuelles/financières ;
- sauvegardes ;
- anonymisation/pseudonymisation ;
- purge définitive ;
- exceptions légales ;
- dépendances entre User et données du Workspace.

Le Core doit seulement rester compatible avec ces politiques et ne pas imposer une durée légale arbitraire.

**Critère de clôture :** matrice de conservation documentée, mécanismes techniques correspondants implémentés et tests de purge/anonymisation adaptés au produit.

---

## D-007 — Stockage et exploitation des fichiers en production

**Statut :** À CADRER  
**Périmètre :** Core Files + infrastructure du produit dérivé  
**Blocage Core 1.0 :** non pour la distribution du socle tant que le provider local est clairement qualifié comme provider courant et que le contrat d'extension reste stable  
**Blocage production dérivée :** oui si le produit utilise les Files et que le stockage local n'est pas adapté à son infrastructure  
**Déclencheur :** déploiement réel du module File

Le Core possède déjà un contrat de provider de stockage, mais la configuration courante accepte uniquement `local`.

À valider/implémenter selon le déploiement :

- provider distant ou volume persistant adapté ;
- sauvegarde/restauration ;
- chiffrement et contrôle d'accès ;
- disponibilité ;
- suppression physique ;
- rétention ;
- supervision antivirus ;
- quotas/coûts ;
- localisation des données si nécessaire.

L'ajout ultérieur d'un provider S3-compatible constitue une évolution générique pertinente du Core, mais n'est pas retenu comme blocker obligatoire de la release 1.0 tant que la documentation n'affirme pas que `local` est une architecture production universelle.

**Critère de clôture :** provider et procédures d'exploitation validés pour l'environnement de production concerné.

---

## D-008 — Notifications et communications transactionnelles étendues

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** seulement si les parcours du produit les exigent  
**Déclencheur :** besoin produit de notifications au-delà des emails transactionnels déjà utilisés par le Core

À cadrer lorsque nécessaire : notifications in-app, emails métier, destinataires, préférences, priorités, historique, délivrabilité et anti-abus.

**Critère de clôture :** besoin classé `NON APPLICABLE` ou canaux/mécanismes implémentés et testés.

---

## D-009 — API Keys et Webhooks

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée exposant des intégrations externes  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** seulement si ces intégrations sont proposées  
**Déclencheur :** exposition machine-to-machine ou webhooks

Exigences minimales : secrets jamais stockés en clair, scopes, expiration/révocation, audit, rate limiting, signature, retry, protection SSRF, validation stricte des URLs et idempotence lorsque nécessaire.

**Critère de clôture :** `NON APPLICABLE` ou domaine dédié implémenté avec protections/tests adaptés.

---

## D-010 — Authentification avancée

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée / évolution Core motivée par plusieurs produits  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** seulement si le risque, le contrat ou le produit l'exige  
**Déclencheur :** besoin MFA, passkeys, SSO entreprise ou nouveau provider

Ces mécanismes ne doivent pas être ajoutés au Core seulement pour anticiper un besoin hypothétique.

**Critère de clôture :** `NON APPLICABLE` pour le produit ou mécanisme requis implémenté et testé.

---

## D-011 — Préférences d'affichage utilisateur avancées

**Statut :** CONDITIONNEL  
**Périmètre :** Core clonable / application dérivée  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** non  
**Déclencheur :** dashboards suffisamment denses pour justifier une personnalisation persistante

La préférence de thème locale existe déjà. Cette dette concerne un futur système plus large de préférences d'affichage.

Invariant :

```text
préférence d'affichage
≠ permission
≠ entitlement
≠ suppression de donnée
```

**Critère de clôture :** besoin réel confirmé puis contrat centralisé et testé, ou classement `NON APPLICABLE`.

---

## D-012 — Tests E2E de chaque application dérivée

**Statut :** À CADRER  
**Périmètre :** chaque application dérivée  
**Blocage Core 1.0 :** non — voir D-016 pour les E2E du Core  
**Blocage production dérivée :** oui  
**Déclencheur :** après ajout du métier, avant go-live

Les tests Core ne remplacent pas les tests du produit dérivé.

Avant production, couvrir au minimum :

- authentification/session ;
- sélection et accès Workspace ;
- RBAC ;
- entitlements/quotas ;
- parcours métier critique ;
- Platform applicable ;
- logout/restauration de session ;
- principaux états interdits.

**Critère de clôture :** parcours E2E critiques verts sur une configuration représentative de production.

---

## D-013 — Configuration et déploiement de production

**Statut :** À CADRER  
**Périmètre :** chaque application dérivée  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** oui  
**Déclencheur :** préparation d'un environnement réel

À valider selon l'infrastructure :

- variables d'environnement et secrets ;
- HTTPS ;
- reverse proxy / `trust proxy` ;
- CORS ;
- cookies `Secure` / `SameSite` / `Domain` ;
- MongoDB et sauvegardes ;
- migrations/indexes ;
- SMTP ;
- stockage ;
- antivirus ;
- jobs réellement ordonnancés ;
- health/readiness ;
- logs/monitoring ;
- rollback.

Référence canonique : `docs/operations/OPERATIONS.md`.

**Critère de clôture :** checklist de production spécifique au produit validée, smoke tests réalisés et procédures de rollback/restauration testées lorsque nécessaires.

---

## D-014 — Points d'extension métier : RBAC et routing backend/frontend

**Statut :** VALIDÉ  
**Périmètre :** Core  
**Blocage Core 1.0 :** non — clôturé pendant CORE-FIN-5  
**Blocage production dérivée :** non pour les points de composition du Core ; la validation d'une dérivation réelle reste couverte par D-017  
**Source :** DOC-6 / `docs/derived-saas/DERIVED-SAAS.md` / `docs/derived-saas/EXTENSION-POINTS.md`

### État validé

Les points de composition explicites suivants sont maintenant disponibles :

```text
capabilities / relations feature → métriques
→ backend/config/applicationCapability.registry.js

permissions métier / extensions des rôles système
→ backend/config/applicationRolePermission.registry.js

routes backend métier
→ backend/config/applicationRoutes.registry.js

routes frontend métier
→ frontend/src/app/application-routes.js

navigation Workspace métier
→ frontend/src/app/workspace-navigation.js
```

Le registre RBAC applicatif permet à un module métier de déclarer ses permissions et ses enrichissements des rôles système sans modifier les constantes centrales du Core.

Le registre de routes backend permet de monter explicitement les routers métier sans allonger directement la liste centrale de `backend/app.js`. Le module métier reste responsable de sa chaîne de sécurité ordonnée : authentification, validation des paramètres, contexte Workspace, entitlement si nécessaire, RBAC, validation Zod puis controller.

Le registre de routes frontend compose les surfaces `publicRoutes`, `authenticatedRoutes`, `workspaceRoutes` et `platformRoutes` dans les guards/layouts Core correspondants.

La navigation Workspace et les capabilities restent composables au niveau applicatif. La relation feature → métriques est désormais explicite et data-driven ; le frontend n'infère plus une dépendance métier à partir d'une catégorie visuelle.

Aucun système de plugins, autodécouverte filesystem ou chargement dynamique de code n'a été introduit : la composition reste explicite, minimale et vérifiable.

### Validation

CORE-FIN-5 / D-014 a été validé le 2026-09-05 avec :

```text
backend : tests ciblés et tests globaux locaux confirmés verts
frontend : tests ciblés et tests globaux locaux confirmés verts
frontend : build Vite complet confirmé OK
```

Le dernier écart observé concernait un fixture frontend encore basé sur l'ancien contrat implicite par catégorie. Le fixture a été aligné sur le contrat actuel `featureDefinitions[].metricKeys` sans réintroduire l'ancienne heuristique.

Le critère de clôture est donc atteint : un module métier peut enregistrer ses permissions, enrichir les rôles système, monter ses routes backend/frontend et composer navigation/capabilities via les points applicatifs prévus, sans réécrire les longues listes centrales du Core.

D-017 reste nécessaire pour éprouver cette architecture sur un dépôt dérivé pilote puis lors d'un upgrade Core réel ; cela ne remet pas en cause la clôture du contrat d'extension lui-même.

---

## D-015 — Versionnement, provenance, releases et discipline de migration du Core

**Statut :** PLANIFIÉ  
**Périmètre :** Core / distribution  
**Blocage Core 1.0 :** oui  
**Blocage production dérivée :** oui pour une mise à niveau Core maîtrisée  
**Source :** DOC-6 + DOC-8

Le Core est encore en `0.1.0`. Sa diffusion officielle doit disposer d'un contrat de release exploitable.

À finaliser avant `v1.0.0` :

- SemVer réellement appliqué ;
- tag Git de release ;
- changelog ou GitHub Release structurée ;
- format de release notes ;
- liste des changements de contrats ;
- variables d'environnement ajoutées/modifiées ;
- dépendances système ajoutées/modifiées ;
- migrations requises, ordre et phase pre/post-deploy ;
- caractère idempotent ou non des migrations ;
- contrôles post-migration ;
- stratégie de reprise/rollback lorsque nécessaire ;
- décision explicite sur la suffisance des runners individuels ou besoin d'un registre/orchestrateur de migrations ;
- convention machine-readable de provenance Core dans les produits dérivés (`core-origin.json` ou remplacement équivalent) ;
- mise à jour de cette provenance lors d'un upgrade ;
- checklist de release et gate de tests.

La CI GitHub Actions peut automatiser cette discipline mais n'est pas une fin en soi : l'exigence est que la gate soit reproductible et vérifiable.

### Critère de clôture

Une release candidate du Core doit pouvoir produire un artefact documentaire complet indiquant version, changements, migrations, configuration et procédure d'upgrade, et un produit dérivé doit pouvoir identifier de manière fiable la version/commit Core qu'il intègre.

---

## D-016 — E2E du Core avec Playwright

**Statut :** PLANIFIÉ  
**Périmètre :** Core  
**Blocage Core 1.0 :** oui  
**Blocage production dérivée :** les produits devront ajouter leurs propres E2E via D-012  
**Dépendances :** finalisation fonctionnelle ; D-014 satisfaite

La stratégie de tests du projet impose Playwright, mais Playwright n'est pas encore installé/configuré dans le frontend actuel.

Les E2E Core doivent vérifier les parcours transversaux plutôt que dupliquer tous les tests unitaires.

Socle minimal attendu :

```text
authentification / session / refresh / logout
fermeture Account / session terminale
création ou accès Workspace
archivage owner / perte d'accès Workspace
isolation tenant
RBAC
subscription / entitlement / quota critique
administration Platform critique
File lorsque la capability est activée
principaux états interdits
```

### Critère de clôture

Playwright installé et documenté, environnement E2E reproductible, parcours Core critiques verts et commande intégrée à la gate de release.

---

## D-017 — Validation réelle de la dérivation et de l'upgrade du Core

**Statut :** PLANIFIÉ  
**Périmètre :** Core / stratégie de distribution  
**Blocage Core 1.0 :** oui pour déclarer la stratégie de distribution réellement validée  
**Dépendances :** D-014 (validée), D-015, D-016

La stratégie `origin` produit + `upstream-core` a été documentée, mais elle n'a pas encore été éprouvée sur un produit pilote après stabilisation des points d'extension.

### Exercice obligatoire

```text
release Core candidate
↓
création d'un dépôt SaaS pilote en conservant l'historique Git
↓
ajout d'un petit module métier représentatif
↓
capabilities + permissions + routes + UI métier
↓
nouvelle évolution compatible du Core
↓
release Core suivante
↓
branche d'upgrade du SaaS pilote
↓
merge + migrations/config si applicable
↓
tests Core + métier + E2E
↓
validation des conflits et de la provenance Core
```

Le module pilote doit être suffisamment petit pour tester l'architecture de dérivation, pas devenir un nouveau produit métier complet dans le dépôt Core.

### Critère de clôture

Création et upgrade réellement exécutés et documentés, conflits éventuels analysés, tests verts et corrections génériques remontées dans le Core si l'exercice révèle une frontière insuffisante.

---

## D-018 — Équipe de la Plateforme, RBAC Platform et invitations internes

**Statut :** VALIDÉ  
**Périmètre :** Core  
**Blocage Core 1.0 :** non — clôturé le 2026-09-07  
**Blocage production dérivée :** non pour le contrat Core ; les rôles réels d'une équipe peuvent être adaptés par les presets/rôles personnalisés prévus  
**Source :** `docs/contracts/PLATFORM-TEAM.md`

### État validé

Le Core possède désormais :

```text
User
→ identité/authentification globale

PlatformTeamMember
→ appartenance à l'équipe interne

PlatformRole
→ rôle système ou personnalisé

PlatformPermission
→ autorité effective code-owned

PlatformInvitation
→ invitation interne sécurisée

Fondateur
→ qualité historique protégée distincte du rôle RBAC
```

Invariants validés :

- exactement un Fondateur actif ;
- Fondateur toujours `super_admin` ;
- plusieurs Super administrateurs supportés ;
- protection du dernier Super administrateur actif ;
- protection du Fondateur contre rétrogradation, suspension, révocation et fermeture ordinaires ;
- séparation stricte RBAC Platform / RBAC Workspace ;
- autorité Platform résolue depuis l'état MongoDB courant ;
- suspension/révocation effective sans attendre l'expiration du JWT ;
- `User.platformRole` non utilisé comme autorité frontend ;
- rôles système immuables depuis l'administration courante ;
- rôles personnalisés avec clé backend opaque, justification obligatoire et permissions du registre actif ;
- permissions `RESERVED` interdites aux rôles personnalisés ;
- clone exact d'un rôle actif interdit ;
- archivage d'un rôle personnalisé interdit tant qu'il est assigné à un membre `ACTIVE` ou `SUSPENDED` ;
- `platform:roles:create`, `platform:roles:update` et `platform:roles:archive` classées `RESERVED`, absentes du preset `platform_admin` et non assignables à un rôle personnalisé ;
- invitation Platform sécurisée, temporaire, révocable et distincte des invitations Workspace ;
- secrets d'invitation non persistés ni exposés en clair ;
- UI « Équipe de la Plateforme » basée sur les composants partagés et une table Membres consultative ouvrant un drawer de détail/actions ;
- synchronisation frontend de l'autorité Platform après `403` et invalidation du contexte courant.

### Validation

Le 2026-09-07, l'utilisateur a confirmé verts :

```text
backend ciblé D-018
backend global
frontend ciblé
frontend global
build Vite production
```

Les gates manuels de sécurité ont également été confirmés :

```text
GET /api/platform/me du Fondateur → isFounder=true / super_admin
protection Fondateur → 403 sur mutations interdites
gouvernance custom role par platform_admin → refusée
permission RESERVED dans rôle custom → refusée
clone exact rôle actif → refusé
archivage rôle assigné ACTIVE → refusé
archivage rôle assigné SUSPENDED → refusé
invitations → rotation/revoke/secrets validés
utilisateur SaaS ordinaire → platformAccess=null
```

Le critère de clôture est atteint. Toute évolution future doit respecter `docs/contracts/PLATFORM-TEAM.md`.

---

## D-019 — Moteur sécurisé de rétention et purge des données Core

**Statut :** PLANIFIÉ  
**Périmètre :** Core  
**Blocage Core 1.0 :** oui — doit être traité avant D-015  
**Blocage production dérivée :** dépend de la policy de conservation réellement configurée  
**Dépendance conceptuelle :** D-006 définit la politique juridique/produit ; D-019 fournit le moteur générique d'exécution

D-019 n'est pas une politique juridique universelle.

```text
D-006
→ quoi conserver, combien de temps et pourquoi selon le produit / cadre applicable

D-019
→ appliquer de manière sécurisée une policy explicite déjà configurée
```

Cible de cadrage avant code :

- policy de rétention explicite et versionnable ;
- éligibilité calculée côté backend ;
- aucun cutoff arbitraire fourni par le client ;
- aucune route générique de suppression par filtre libre ;
- autorité Platform fortement restreinte ;
- preview avant purge ;
- confirmation explicite pour les opérations manuelles ;
- traitement par lots bornés ;
- audit durable indépendant du contenu supprimé ;
- prévention de deux exécutions concurrentes ;
- scheduler compatible multi-instance ;
- lock distribué MongoDB privilégié si suffisant avant ajout de Redis ;
- indexes et coûts de requêtes vérifiés ;
- idempotence et reprise après échec ;
- tests sécurité, concurrence et non-régression.

### Critère de clôture

Contrat de rétention Core documenté, moteur fail-closed implémenté, exécutions concurrentes protégées, preview/confirmation sécurisées lorsque pertinentes, audit durable, tests ciblés et globaux verts.

---

## D-020 — Invitation commerciale client et offres privées de découverte

**Statut :** PLANIFIÉ  
**Périmètre :** Core — onboarding commercial générique  
**Blocage Core 1.0 :** oui — besoin générique confirmé avant versionnement  
**Blocage production dérivée :** seulement si le produit utilise ce canal d'acquisition  
**Dépendances :** Plan / Subscription / EntitlementOverride / Workspace / User / RBAC Platform existants

Le besoin est distinct de D-018 :

```text
PlatformInvitation
→ collaborateur interne de l'éditeur

future CommercialInvitation
→ prospect ou futur client utilisateur du SaaS
```

Le modèle ne doit jamais réutiliser `PlatformInvitation` pour une finalité commerciale client.

### Cible fonctionnelle à cadrer avant code

Le Core doit pouvoir permettre à un acteur Platform autorisé d'envoyer une invitation commerciale ciblée préparant une offre privée.

Cas visés :

```text
Free standard
Free personnalisé via EntitlementOverride
Découverte commerciale temporaire
Découverte commerciale sans échéance
plan privé négocié
beta / partenaire / early adopter
```

Décisions déjà figées :

- une offre « Découverte commerciale » peut être représentée par un Plan privé (`isPublic=false`) ;
- le prix peut être `0` sans transformer l'offre en plan baseline ;
- les fonctionnalités sont explicitement listées dans le Plan ; aucune règle dynamique « toutes les fonctionnalités sauf IA » ne doit accorder automatiquement de futures capabilities ;
- l'IA peut être exclue explicitement de l'offre ;
- une offre sans échéance n'est pas appelée « trial illimité » ;
- un vrai trial reste temporaire et conserve sa sémantique `trialEndsAt` ;
- l'accès commercial manuel ne doit pas nécessairement consommer le `TrialEligibility` public : ce point doit être contractualisé avant implémentation ;
- les `EntitlementOverride` restent le mécanisme des exceptions individuelles, tandis qu'un Plan privé représente une offre réutilisable ;
- le Workspace n'est créé ou rattaché qu'au moment de l'acceptation selon le flow retenu, afin d'éviter les environnements orphelins ;
- l'utilisateur invité devient owner du Workspace cible selon le workflow prévu ;
- le Super administrateur est seul autorisé au départ ;
- l'autorité doit néanmoins être conçue par permissions Platform dédiées afin de pouvoir être déléguée ultérieurement à un rôle commercial sans changer la logique métier ;
- un commercial autorisé sélectionne une offre existante mais ne fabrique pas arbitrairement un Plan ou un jeu de capabilities au moment de l'invitation ;
- raison commerciale, acteur, bénéficiaire, offre, dates et révocations doivent être audités ;
- secrets d'invitation temporaires, rotation/revoke et absence de stockage en clair doivent reprendre les primitives de sécurité éprouvées sans partager le modèle métier D-018.

### Point d'architecture à traiter

Le résolveur actuel des Subscriptions commerciales actives attend une `currentPeriodEnd` future. Une offre commerciale gratuite réellement sans échéance doit donc recevoir une sémantique métier explicite ; aucune date artificielle lointaine telle que `2099-12-31` ne doit simuler l'illimité.

### Critère de clôture

Contrat d'onboarding commercial validé, permissions Platform dédiées, modèle d'invitation client distinct, offre privée temporaire/permanente correctement représentée, acceptation atomique et auditée, sécurité des secrets validée, frontend réutilisable, tests backend/frontend et build verts.

---

## 6. Éléments volontairement non intégrés comme dette active

### Ancien placeholder « petite dette finale annoncée »

Un ancien document mentionne une dette non définie. Aucun contenu actionnable n'est disponible ; elle n'est pas inventée.

### Packages Core séparés

L'extraction immédiate de packages `@saas-core/*` n'est pas une dette V1. Elle sera réévaluée après plusieurs produits réels si les conflits observés justifient cette complexité.

### Provider de paiement imposé au Core

Aucun Stripe/PayPal/provider financier n'est imposé au Core générique. Le besoin réel reste D-004 au niveau du produit commercialisé.

### CMP / bannière cookies imposée au Core

Aucune CMP fictive n'est requise tant qu'aucun traceur soumis au consentement n'est présent. Le besoin reste couvert par D-003 lorsqu'il devient applicable.

### Limite universelle du nombre de Workspaces

Le Core V1 reste techniquement multi-workspace et Workspace-scoped commercialement. Une règle universelle telle que `Free = 1 Workspace` ou `Premium = 5 Workspaces` n'est pas retenue comme dette du Core.

Un SaaS dérivé peut :

- fonctionner en mono-workspace ;
- ajouter une couche commerciale multi-workspace si son produit le justifie ;
- conserver un Workspace unique et monétiser une métrique métier interne, par exemple un nombre de dossiers de travail.

---

## 7. Ordre de traitement recommandé après le chantier documentaire

État après clôture D-018 :

```text
1. D-001 fermeture Account / Workspace                         ✅ VALIDÉ
2. D-014 points d'extension métier                             ✅ VALIDÉ
3. D-018 Équipe de la Plateforme / RBAC / invitations          ✅ VALIDÉ
4. D-019 moteur sécurisé de rétention / purge Core             PLANIFIÉ
5. D-020 invitation commerciale / offre privée découverte       PLANIFIÉ
6. D-015 release/version/provenance/migrations                  PLANIFIÉ
7. D-016 Playwright E2E Core                                    PLANIFIÉ
8. audit final architecture / sécurité / qualité
9. D-017 dérivation + upgrade pilote                            PLANIFIÉ
10. taguer uniquement ensuite la release Core stable
```

D-019 puis D-020 doivent être traitées avant D-015. Aucune release `v1.0.0` ne doit être déclarée avant la clôture ou la reclassification explicite de tous les blockers Core 1.0.

---

## 8. Gate finale d'un SaaS dérivé

Un produit dérivé ne doit pas être considéré prêt pour la production tant que :

```text
version Core compatible validée
+
modules métier validés
+
dettes bloquantes applicables traitées
+
configuration / infrastructure production validées
+
conformité applicable validée
+
Billing réel validé si produit payant
+
E2E produit verts
+
procédures de sauvegarde / rollback / monitoring adaptées
```

Les dettes conditionnelles non applicables doivent être explicitement classées `NON APPLICABLE` dans la documentation propre au produit.