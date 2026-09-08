# SAAS-CORE-API — Registre canonique des dettes actives

**Statut :** source de vérité documentaire pour les dettes non résolues  
**Dernière mise à jour :** 2026-09-08  
**Périmètre :** Core clonable et, lorsque précisé, applications dérivées

---

## 1. Objet

Ce document est le registre unique des dettes fonctionnelles, techniques, de conformité, de distribution et de préparation à la production encore actives.

Il ne remplace pas la roadmap fonctionnelle courante. L'historique détaillé des dettes clôturées reste disponible dans Git et dans les contrats canoniques concernés.

Hiérarchie :

```text
code + contraintes DB
→ tests validés
→ contrats / architecture / sécurité canoniques
→ DEBT.md pour les écarts non résolus
```

Les anciens fichiers historiques de dette ne portent plus de statut autoritatif.

---

## 2. Statuts autorisés

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

`NON APPLICABLE` doit être justifié dans le produit dérivé concerné.

---

## 3. Deux gates différentes

### 3.1 Core 1.0 finalisé

Le Core peut être considéré comme un socle générique stable lorsque ses responsabilités communes sont cohérentes, testées, documentées et suffisamment extensibles pour être dérivées puis mises à niveau.

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

### 4.1 Blockers connus de la finalisation et de la première dérivation du Core

| ID | Dette | Statut |
|---|---|---|
| D-020 | Invitation commerciale client et offres privées de découverte | EN COURS |
| D-015 | Versionnement, provenance, releases et discipline de migration du Core | PLANIFIÉ |
| D-016 | E2E Core avec Playwright | PLANIFIÉ |
| D-002 | Corbeille et restauration des fichiers | PLANIFIÉ |
| D-017 | Validation réelle création + upgrade d'un SaaS dérivé pilote | PLANIFIÉ |

D-001, D-014, D-018 et D-019 sont clôturées et ne sont plus des blockers actifs.

D-020 reste volontairement placé avant D-015 : le versionnement ne doit pas figer une release candidate tant que l'onboarding commercial générique déjà identifié comme nécessaire n'est pas implémenté puis validé ou explicitement reclassifié.

D-002 reste totalement indépendant de D-020, mais il doit être `VALIDÉ` avant D-017 et avant toute première dérivation métier du Core.

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

### 4.3 Dettes différées ou conditionnelles

```text
D-008 notifications étendues
D-009 API Keys / Webhooks
D-010 authentification avancée
D-011 préférences d'affichage avancées
```

### 4.4 Dettes clôturées conservées pour traçabilité minimale

```text
D-001 fermeture de compte et cycle de vie Workspace            → VALIDÉ
D-014 points d'extension métier RBAC/routing                   → VALIDÉ
D-018 équipe Platform / RBAC / invitations internes            → VALIDÉ
D-019 moteur sécurisé de rétention / purge Core                → VALIDÉ
```

Références principales :

```text
D-014 → docs/derived-saas/DERIVED-SAAS.md + EXTENSION-POINTS.md
D-018 → docs/contracts/PLATFORM-TEAM.md
D-019 → docs/contracts/RETENTION.md
```

L'historique détaillé des dettes clôturées reste disponible dans Git ; il n'est pas nécessaire de maintenir leur ancien cadrage comme dette active.

---

## 5. Règles de maintenance

Pour chaque dette active :

- conserver un identifiant stable ;
- utiliser uniquement un statut autorisé ;
- indiquer son périmètre ;
- distinguer le blocage Core 1.0 du blocage production d'un SaaS dérivé ;
- indiquer le déclencheur lorsque la dette dépend du produit ;
- définir un critère de clôture vérifiable ;
- ne pas dupliquer son statut dans un autre document ;
- lorsqu'elle devient `VALIDÉ`, vérifier code, tests et documentation canonique ;
- la retirer ensuite des blockers actifs, l'historique restant disponible dans Git.

---

## D-002 — Corbeille et restauration des fichiers

**Statut :** PLANIFIÉ  
**Périmètre :** Core Files  
**Blocage Core 1.0 / première dérivation :** oui avant D-017 et avant toute première dérivation métier  
**Blocage production dérivée :** oui pour tout produit dérivé utilisant le sous-système Files  
**Déclencheur :** décision produit Core du 2026-09-08 — le cycle Files doit être complet avant première dérivation

Le cycle actuel permet la suppression logique puis la purge différée sécurisée via D-019, mais aucune route utilisateur de listing de corbeille ou de restauration n'est encore exposée.

Le bloc D-002 reste séparé de D-020 et ne doit pas être implémenté à l'intérieur du domaine CommercialInvitation.

La future restauration devra définir au minimum :

- permission dédiée de consultation/restauration ;
- listing de corbeille isolé par Workspace ;
- restauration d'un fichier et restauration multiple lorsque pertinente ;
- vérification de l'existence physique du contenu ;
- impossibilité de restaurer une ressource déjà revendiquée par le moteur de purge D-019 ;
- comportement vis-à-vis du Plan et du mode remédiation ;
- audit ;
- isolation multi-tenant ;
- UI dédiée `Ressources > Corbeille` réutilisant le `DataTable` partagé ;
- tests de sécurité et de concurrence.

Invariant de stockage issu du contrat D-019 :

```text
File soft-deleted + contenu physique encore présent
→ storage_bytes reste consommé
```

La restauration avant purge ne doit donc pas effectuer une seconde réservation de `storage_bytes`. Le stockage n'est libéré qu'après purge physique réussie.

La durée d'affichage/restauration doit être dérivée de la policy de rétention applicable ; aucune durée universelle ne doit être inventée par le frontend.

**Critère de clôture :** listing de corbeille et restauration sécurisés, coordination explicite avec D-019, quota cohérent sans double comptage, UI dédiée réutilisable et tests backend/frontend/sécurité/concurrence pertinents validés.

---

## D-003 — RGPD, cookies, confidentialité et obligations légales

**Statut :** À CADRER  
**Périmètre :** chaque application dérivée + mécanismes génériques du Core lorsqu'ils deviennent nécessaires  
**Blocage Core 1.0 :** non par défaut  
**Blocage production dérivée :** oui lorsque les obligations sont applicables

Références :

```text
docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md
```

Le Core n'impose pas une CMP ou une politique juridique fictive. Les traitements, bases légales, traceurs, sous-traitants, droits, durées et obligations doivent être alignés sur le produit réel.

**Critère de clôture :** conformité technique/documentaire alignée sur les traitements réels et gate pré-production validée.

---

## D-004 — Billing / Payment réel

**Statut :** À CADRER  
**Périmètre :** application dérivée commercialisée avec paiement réel  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** oui pour une commercialisation payante automatisée

Invariant :

```text
Subscription / entitlement
≠
encaissement / facture / autorité financière
```

À cadrer selon le produit : provider, identité facturée, événements/idempotence, échecs, remboursements, prorata/remises, fiscalité, factures et audit financier.

Les données de carte ne doivent jamais être saisies ou stockées par le Core.

**Critère de clôture :** domaine Billing/Payment sécurisé et testé, provider intégré si nécessaire et fiscalité/facturation validées pour le produit.

---

## D-005 — Observabilité technique de production

**Statut :** À CADRER  
**Périmètre :** chaque déploiement de production  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** oui pour une observabilité minimale adaptée au service

`AuditLog` est un journal fonctionnel et de sécurité ; il ne remplace pas le monitoring technique.

À prévoir selon l'infrastructure : erreurs 5xx, latence, MongoDB, SMTP, jobs, pipeline File/antivirus, erreurs frontend, corrélation `requestId`, métriques/alertes et politique de logs.

**Critère de clôture :** instrumentation, alertes et procédures adaptées au déploiement réel.

---

## D-006 — Rétention, anonymisation et suppression réglementaire

**Statut :** À CADRER  
**Périmètre :** application dérivée + points d'intégration génériques du Core  
**Blocage Core 1.0 :** non comme politique juridique universelle  
**Blocage production dérivée :** oui lorsque applicable

D-019 fournit désormais le moteur générique sécurisé. D-006 reste la définition produit/juridique de ce qui doit être conservé, anonymisé ou supprimé et pendant combien de temps.

```text
D-006 = politique
D-019 = moteur d'exécution générique validé
```

**Critère de clôture :** matrice de conservation documentée et mécanismes adaptés au produit configurés/testés.

---

## D-007 — Stockage et exploitation des fichiers en production

**Statut :** À CADRER  
**Périmètre :** Core Files + infrastructure du produit dérivé  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** oui si le produit utilise Files et que le stockage local n'est pas adapté

À valider selon le déploiement : provider distant ou volume persistant, sauvegarde/restauration, chiffrement, disponibilité, suppression physique, rétention, supervision antivirus, quotas/coûts et localisation des données.

**Critère de clôture :** provider et procédures d'exploitation validés pour l'environnement réel.

---

## D-008 — Notifications et communications transactionnelles étendues

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée  
**Blocage Core 1.0 :** non

À cadrer seulement lorsqu'un besoin produit dépasse les emails transactionnels déjà fournis par le Core.

**Critère de clôture :** `NON APPLICABLE` ou mécanismes nécessaires implémentés et testés.

---

## D-009 — API Keys et Webhooks

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée exposant des intégrations externes  
**Blocage Core 1.0 :** non

Exigences minimales si applicable : secrets jamais en clair, scopes, expiration/révocation, audit, rate limiting, signatures, retry, protection SSRF, validation stricte des URLs et idempotence.

**Critère de clôture :** `NON APPLICABLE` ou domaine dédié sécurisé et testé.

---

## D-010 — Authentification avancée

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée / évolution Core motivée par plusieurs produits  
**Blocage Core 1.0 :** non

MFA, passkeys, SSO entreprise ou nouveaux providers ne doivent pas être ajoutés uniquement par anticipation.

**Critère de clôture :** `NON APPLICABLE` ou mécanisme requis implémenté et testé.

---

## D-011 — Préférences d'affichage utilisateur avancées

**Statut :** CONDITIONNEL  
**Périmètre :** Core clonable / application dérivée  
**Blocage Core 1.0 :** non

Invariant :

```text
préférence d'affichage
≠ permission
≠ entitlement
≠ suppression de donnée
```

**Critère de clôture :** besoin réel confirmé puis contrat centralisé et testé, ou `NON APPLICABLE`.

---

## D-012 — Tests E2E de chaque application dérivée

**Statut :** À CADRER  
**Périmètre :** chaque application dérivée  
**Blocage Core 1.0 :** non — voir D-016 pour les E2E du Core  
**Blocage production dérivée :** oui

Chaque produit dérivé doit couvrir ses parcours métier et transversaux critiques au-delà des tests du Core.

**Critère de clôture :** E2E critiques verts sur une configuration représentative de production.

---

## D-013 — Configuration et déploiement de production

**Statut :** À CADRER  
**Périmètre :** chaque application dérivée  
**Blocage Core 1.0 :** non  
**Blocage production dérivée :** oui

À valider selon l'infrastructure : variables d'environnement/secrets, HTTPS, reverse proxy, CORS, cookies, MongoDB/backups, migrations/indexes, SMTP, stockage, antivirus, jobs, health/readiness, logs/monitoring et rollback.

Référence : `docs/operations/OPERATIONS.md`.

**Critère de clôture :** checklist de production spécifique validée, smoke tests et procédures de rollback/restauration testées lorsque nécessaires.

---

## D-015 — Versionnement, provenance, releases et discipline de migration du Core

**Statut :** PLANIFIÉ  
**Périmètre :** Core / distribution  
**Blocage Core 1.0 :** oui  
**Dépendances :** D-020 doit être clôturée ou reclassifiée avant ouverture de la release candidate

À finaliser avant `v1.0.0` : SemVer réellement appliqué, tags/releases, changelog/release notes, changements de contrats/configuration, migrations et ordre pre/post-deploy, reprise/rollback, provenance machine-readable du Core dans les dérivés et gate de release reproductible.

**Critère de clôture :** release candidate documentée et produit dérivé capable d'identifier de manière fiable la version/commit Core intégré.

---

## D-016 — E2E du Core avec Playwright

**Statut :** PLANIFIÉ  
**Périmètre :** Core  
**Blocage Core 1.0 :** oui  
**Dépendances :** finalisation fonctionnelle

Les E2E Core doivent couvrir les parcours transversaux critiques : auth/session/refresh/logout, lifecycle Account/Workspace, isolation tenant, RBAC, subscription/entitlement/quota, administration Platform, Files lorsque applicable et principaux états interdits.

**Critère de clôture :** Playwright installé/documenté, environnement reproductible et parcours Core critiques verts dans la gate de release.

---

## D-017 — Validation réelle de la dérivation et de l'upgrade du Core

**Statut :** PLANIFIÉ  
**Périmètre :** Core / stratégie de distribution  
**Blocage Core 1.0 :** oui pour déclarer la stratégie de distribution réellement validée  
**Dépendances :** D-014 validée, puis D-015, D-016 et D-002

Exercice obligatoire : release candidate Core → dépôt pilote dérivé → petit module métier représentatif → évolution Core compatible → upgrade réel → migrations/configuration si applicable → tests Core + métier + E2E → analyse des conflits et de la provenance.

D-002 doit être validée avant cet exercice : la dérivation pilote ne doit pas partir d'un sous-système Files dont le cycle utilisateur suppression/restauration est volontairement incomplet.

**Critère de clôture :** dérivation et upgrade réellement exécutés et documentés, tests verts et corrections génériques remontées au Core si nécessaire.

---

## D-020 — Invitation commerciale client et offres privées de découverte

**Statut :** EN COURS  
**Périmètre :** Core — onboarding commercial générique  
**Blocage Core 1.0 :** oui  
**Dépendances :** Plan / Subscription / EntitlementOverride / Workspace / User / RBAC Platform existants

Contrat canonique :

```text
docs/contracts/COMMERCIAL-INVITATIONS.md
```

Frontière obligatoire :

```text
PlatformInvitation
→ collaborateur interne de l'éditeur

CommercialInvitation
→ nouveau prospect / futur client / bêta-testeur
```

Le modèle ne réutilise jamais `PlatformInvitation` pour une finalité commerciale client.

Décisions figées :

- une invitation commerciale initiale ne cible pas un utilisateur déjà inscrit au moment de sa création ;
- aucun mode de rattachement à un workspace existant n'est prévu ;
- les workspaces existants utilisent `Subscription` / `EntitlementOverride` pour les exceptions commerciales ;
- offre privée via Plan `isPublic=false`, `status=active`, `systemRole=null` ;
- prix `0` possible sans devenir la baseline ;
- le Plan privé ne doit jamais apparaître dans le catalogue public ;
- capabilities et limites explicitement portées par le Plan ;
- aucune future capability accordée automatiquement ;
- une offre gratuite durable n'est pas un trial illimité ;
- vrai trial temporaire et soumis à `TrialEligibility` ;
- `termType=fixed|open_ended` explicite la sémantique temporelle ;
- une open-ended D-020 valide est gratuite, manuelle, sans périodicité et sans `currentPeriodEnd` ;
- aucun `2099-12-31` ou autre date artificielle pour simuler l'illimité ;
- snapshot serveur de l'offre ;
- dérive significative du Plan avant acceptation = refus et nouvelle invitation ;
- token aléatoire, hash SHA-256 seul persisté, resend avec rotation, revoke explicite ;
- permissions Platform dédiées ;
- acceptation authentifiée et atomique avec création du premier Workspace ;
- audit des transitions sensibles.

**Critère de clôture :** contrat d'onboarding commercial validé, permissions Platform dédiées, modèle distinct, acceptation atomique/auditée, sécurité des secrets validée, frontend réutilisable, tests backend/frontend et build réellement verts.

---

## 6. Éléments volontairement non intégrés comme dette active

Ne sont pas ajoutés par anticipation : packages `@saas-core/*`, provider de paiement imposé au Core, CMP fictive sans traceurs applicables, ou limite universelle du nombre de Workspaces.

Le Core reste techniquement multi-workspace. Un SaaS dérivé peut choisir une autre logique commerciale selon son métier.

---

## 7. Ordre de traitement recommandé

```text
D-001 fermeture Account / Workspace                         ✅ VALIDÉ
D-014 points d'extension métier                             ✅ VALIDÉ
D-018 Équipe de la Plateforme / RBAC / invitations          ✅ VALIDÉ
D-019 moteur sécurisé de rétention / purge Core             ✅ VALIDÉ
DOC-CODE-1 documentation source                             ✅ VALIDÉ
→ D-020 invitation commerciale / offre privée découverte    EN COURS
→ D-015 release/version/provenance/migrations               PLANIFIÉ
→ D-016 Playwright E2E Core                                 PLANIFIÉ
→ D-002 corbeille / restauration Files                      PLANIFIÉ — avant première dérivation
→ audit final architecture / sécurité / qualité
→ D-017 dérivation + upgrade pilote                         PLANIFIÉ
→ taguer uniquement ensuite la release Core stable
```

Aucune première dérivation métier ne doit commencer tant que D-002 n'est pas `VALIDÉ`.

Aucune release `v1.0.0` ne doit être déclarée avant clôture ou reclassification explicite de tous les blockers Core 1.0 applicables.

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