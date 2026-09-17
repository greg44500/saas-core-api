# SAAS-CORE-API — Registre canonique des dettes actives

**Statut :** source de vérité documentaire pour les dettes non résolues  
**Dernière mise à jour :** 2026-09-17  
**Périmètre :** Core clonable et, lorsque précisé, applications dérivées

---

## 1. Objet et hiérarchie

Ce document est le registre unique des dettes fonctionnelles, techniques, de conformité, de distribution et de préparation à la production encore actives.

En cas de contradiction :

```text
code + contraintes DB
→ tests réellement exécutés et validés
→ contrats / architecture / sécurité canoniques
→ DEBT.md
→ documentation opérationnelle
→ REPRISE-CURRENT.md
```

Les dettes clôturées sont conservées sous forme de synthèse ; leur historique détaillé reste dans Git.

Statuts autorisés :

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

---

## 2. Gates

### 2.1 Core 1.0 finalisé

Le Core peut être considéré comme un socle générique stable lorsque ses responsabilités communes sont cohérentes, testées, documentées et suffisamment extensibles pour être dérivées puis mises à niveau.

### 2.2 SaaS dérivé prêt pour la production

Un produit dérivé doit en plus résoudre les dettes dépendant de son modèle commercial, de ses traitements, providers et infrastructure.

```text
Core 1.0 finalisé
≠
produit dérivé automatiquement production-ready
```

---

## 3. Synthèse des dettes

### 3.1 Blockers restant dans la trajectoire Core 1.0

| ID | Dette | Statut |
|---|---|---|
| D-016 | E2E Core avec Playwright | PLANIFIÉ |
| D-017 | Validation réelle création + upgrade d'un SaaS dérivé pilote | PLANIFIÉ |

D-015 — versionnement, provenance, releases et discipline de migration du Core — est **VALIDÉE le 2026-09-17**. Sa clôture ne crée ni tag RC ni tag stable : D-016 et D-017 restent nécessaires avant `v1.0.0` stable.

Les blockers applicatifs génériques décidés avant le gel sont levés : D-002, D-011, D-015, D-021, D-022 et D-025 sont validées.

**D-020 n’est plus bloquante pour Core 1.0.** Sa validation fonctionnelle terrain est explicitement différée au déploiement de l’application métier avec des bêta-testeurs réels.

### 3.2 Non-blockers Core 1.0 mais blockers possibles d'un produit réel

```text
D-003 conformité / RGPD
D-004 Billing / Payment
D-005 observabilité
D-006 rétention / anonymisation réglementaire
D-007 stockage fichiers production
D-012 E2E du produit dérivé
D-013 configuration / déploiement production
```

### 3.3 Dettes différées ou conditionnelles

```text
D-008 notifications étendues
D-009 API Keys / Webhooks
D-010 authentification avancée — dont Google SSO
D-020 validation terrain invitation commerciale / onboarding bêta
D-023 demande gouvernée de capacité exceptionnelle de transfert de propriété — cible Core 1.1
D-024 console d’administration Platform contextualisée du Workspace — cible Core 1.1
```

---

## 4. Dettes actives

### D-003 — RGPD, cookies, confidentialité et obligations légales

**Statut :** À CADRER  
**Périmètre :** application dérivée + mécanismes Core nécessaires  
**Blocage Core 1.0 :** non par défaut  
**Blocage production dérivée :** oui lorsque applicable

Références : `docs/compliance/COMPLIANCE.md` et `docs/compliance/rgpd-data-tracker-inventory.md`.

**Critère de clôture :** conformité technique/documentaire alignée sur les traitements réels.

### D-004 — Billing / Payment réel

**Statut :** À CADRER  
**Périmètre :** application dérivée payante  
**Blocage Core 1.0 :** non

`Subscription / entitlement ≠ encaissement / facture / autorité financière`. À cadrer selon le produit : provider, identité facturée, idempotence, échecs, remboursements, prorata/remises, fiscalité, factures et audit. Les données de carte ne sont jamais stockées par le Core.

### D-005 — Observabilité technique de production

**Statut :** À CADRER  
**Blocage Core 1.0 :** non

`AuditLog` ne remplace pas le monitoring technique. Prévoir selon l'infrastructure : erreurs 5xx, latence, MongoDB, SMTP, jobs, Files/antivirus, frontend, `requestId`, métriques et alertes.

### D-006 — Rétention, anonymisation et suppression réglementaire

**Statut :** À CADRER  
**Blocage Core 1.0 :** non comme politique juridique universelle

```text
D-006 = politique produit/juridique
D-019 = moteur d'exécution générique validé
```

### D-007 — Stockage et exploitation des fichiers en production

**Statut :** À CADRER  
**Blocage Core 1.0 :** non

À valider selon le déploiement : provider/volume persistant, sauvegarde/restauration, chiffrement, disponibilité, suppression physique, rétention, antivirus, quotas/coûts et localisation des données.

### D-008 — Notifications et communications transactionnelles étendues

**Statut :** CONDITIONNEL  
**Blocage Core 1.0 :** non

À traiter seulement si un produit dépasse les emails transactionnels déjà fournis.

### D-009 — API Keys et Webhooks

**Statut :** CONDITIONNEL  
**Blocage Core 1.0 :** non

Si applicable : secrets jamais en clair, scopes, expiration/révocation, audit, rate limiting, signatures, retry, SSRF, validation stricte des URLs et idempotence.

### D-010 — Authentification avancée

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée / évolution Core motivée  
**Blocage Core 1.0 :** non

Google SSO reste volontairement ici et ne bloque pas Core 1.0. Son ajout futur devra traiter OpenID Connect/OAuth, liaison d'identité avec un compte local existant, collisions d'email, révocation, coexistence de plusieurs méthodes de connexion et séparation stricte entre identité externe et autorisations internes.

MFA, passkeys, SSO entreprise ou autres providers ne sont pas ajoutés uniquement par anticipation.

### D-012 — Tests E2E de chaque application dérivée

**Statut :** À CADRER  
**Blocage Core 1.0 :** non — voir D-016

Chaque dérivé doit couvrir ses parcours métier/transversaux critiques.

### D-013 — Configuration et déploiement de production

**Statut :** À CADRER  
**Blocage Core 1.0 :** non

Variables/secrets, HTTPS, reverse proxy, CORS, cookies, MongoDB/backups, migrations/indexes, SMTP, stockage, antivirus, jobs, health/readiness, monitoring et rollback. Référence : `docs/operations/OPERATIONS.md`.

### D-016 — E2E du Core avec Playwright

**Statut :** PLANIFIÉ  
**Blocage Core 1.0 :** oui

Couvrir les parcours transversaux critiques : auth/session/refresh/logout, lifecycle Account/Workspace, isolation tenant, RBAC, subscription/entitlement/quota, administration Platform, Files, centre d’aide Workspace/Platform et principaux états interdits.

D-025 doit notamment être couvert par au moins une recherche + ouverture de fiche dans chaque contexte ainsi que par la séparation Workspace / Platform.

### D-017 — Validation réelle de la dérivation et de l'upgrade du Core

**Statut :** PLANIFIÉ  
**Blocage Core 1.0 :** oui pour valider réellement la stratégie de distribution  
**Dépendances :** D-014 et D-002 validées, puis D-015 et D-016.

Exercice : release candidate Core → dépôt pilote dérivé → petit module métier → évolution Core compatible → upgrade réel → migrations/configuration → tests Core+métier+E2E → analyse des conflits/provenance.

D-017 doit aussi vérifier que le mécanisme d’aide Core accepte un module d’aide métier additionnel sans modifier le corpus Core.

### D-020 — Invitation commerciale client et offres privées de découverte

**Statut :** DIFFÉRÉ — validation terrain sur application dérivée / bêta  
**Périmètre :** Core — onboarding commercial générique  
**Blocage Core 1.0 :** non

Contrat : `docs/contracts/COMMERCIAL-INVITATIONS.md`.

`PlatformInvitation` reste réservé aux collaborateurs internes ; `CommercialInvitation` aux prospects/futurs clients/bêta-testeurs. Offre privée via Plan non public, snapshot serveur, dérive significative refusée, token aléatoire/hash SHA-256, rotation au resend, révocation, permissions Platform dédiées, acceptation authentifiée et atomique, audit. Les règles trial/open-ended restent celles du contrat canonique.

Le code, les contrats et les tests automatisés déjà validés sont considérés suffisants pour ne plus bloquer le versionnement du Core. La validation fonctionnelle finale est volontairement reportée à des conditions réelles, lors du déploiement de l’application métier avec bêta-testeurs : un parcours d’intégration Platform et un parcours d’intégration Workspace/onboarding client seront alors vérifiés sur l’environnement réel applicable.

Cette reclassification ne transforme pas une validation non exécutée en validation réussie. Toute anomalie découverte pendant la bêta devra être corrigée et, si nécessaire, rouvrir D-020 ou créer une dette dédiée.

### D-023 — Demande gouvernée de capacité exceptionnelle de transfert de propriété

**Statut :** DIFFÉRÉ — cible Core 1.1  
**Blocage Core 1.0 :** non

Le mécanisme bas niveau v1 reste fermé par défaut, réservé à l’autorisation Platform prévue, borné dans le temps, révocable et single-use. Aucun bouton owner `Demander capacité de transfert` n’est ajouté avant D-023.

Cible Core 1.1 : demande owner persistée et auditée, file Platform bornée par permission, revalidation d’éligibilité à chaque étape, refus structurés, création de l’autorisation temporaire existante sans ressaisie d’identité/workspace, audit complet et tests concurrence/E2E.

### D-024 — Console d’administration Platform contextualisée du Workspace

**Statut :** DIFFÉRÉ — cible Core 1.1  
**Blocage Core 1.0 :** non

Spécification : `docs/debt/D-024-platform-workspace-control-center.md`.

Le drawer Workspace doit évoluer après Core 1.0 vers une console contextualisée : vue d’ensemble, abonnement, dérogations, administration et alertes/activité. Les pages Platform globales restent disponibles ; RTK Query, permissions et validations backend restent les autorités ; aucune logique métier ne doit être dupliquée.

---

## 5. Dettes clôturées récemment — D-015 / D-025

### D-015 — Versionnement, provenance, releases et discipline de migration du Core

**Statut :** VALIDÉ — 2026-09-17  
**Périmètre :** Core / distribution  
**Blocage Core 1.0 :** levé pour D-015

État validé :

- identité machine-readable `core-release.json` avec version `0.1.0` et canal `development` ;
- SemVer, canaux `development` / `rc` / `stable`, tags immuables et politique de release définis dans `docs/releases/RELEASE-POLICY.md` ;
- `CHANGELOG.md` initialisé sans inventer d’historique de releases antérieures ;
- contrat de provenance d’un dérivé défini via `core-origin.json`, à éprouver réellement dans D-017 ;
- inventaire machine-readable des migrations dans `docs/releases/migration-manifest.json` ;
- discipline des migrations définie dans `docs/releases/MIGRATION-POLICY.md` ;
- stricte cohérence vérifiée entre 16 scripts `migration:*`, 16 runners `run*Migration.js` et 16 entrées du manifest ;
- helper `backfillRegisteredSystemRolePermissions.migration.js` explicitement traité comme helper non autonome ;
- choix confirmé de ne pas introduire de registre Mongo persistant des migrations uniquement par convention ;
- `npm run release:verify` vérifie l’identité de release, les versions packages/locks et la cohérence des migrations ;
- `npm run release:check` constitue la gate canonique locale et CI ;
- workflow GitHub Actions `Core Gate` installé sur Pull Request et push vers `main` avec Node 24, ClamAV et MongoDB replica set ;
- défaut de synchronisation des tests Base UI identifié puis corrigé au niveau du test, sans modifier le comportement du drawer ;
- `Core Gate` confirmée verte sur le HEAD D-015 avant le commit documentaire de clôture ;
- ruleset GitHub `Main protection` actif sur la branche par défaut ;
- Pull Request obligatoire avant fusion ;
- status check `Core Gate` obligatoire ;
- bypass list vide ;
- suppression de `main` et force-push bloqués ;
- documentation racine, index, opérations et dérivation alignés sur cette gouvernance.

Aucun tag `v1.0.0`, aucune RC et aucune release stable ne sont créés par D-015. D-016 puis D-017 restent obligatoires avant la première release stable.

Le commit documentaire qui porte le présent statut doit lui-même obtenir une `Core Gate` verte avant fusion de la PR D-015. En cas d’échec, D-015 doit être considérée non fusionnable jusqu’à correction.

**Critère de clôture atteint sous réserve de la gate CI du commit de clôture.**

### D-025 — Centre d’aide sécurisé Workspace / Platform

**Statut :** VALIDÉ — 2026-09-16  
**Blocage Core 1.0 :** levé pour D-025  
**Spécification :** `docs/debt/D-025-secure-help-center.md`

État validé :

- centres d’aide Workspace et Platform distincts sur une infrastructure commune ;
- registres Core strictement validés et point d’extension `APPLICATION_HELP_MODULES` ;
- projection serveur obligatoire avant sérialisation ;
- filtrage Workspace par permissions effectives, owner, plan/features et mode d’accès/remédiation ;
- filtrage Platform à partir de l’autorisation Platform réelle ;
- fiche absente ou non autorisée exposée avec le même comportement générique afin de limiter la divulgation ;
- recherche frontend locale uniquement sur le catalogue déjà autorisé ;
- catégories bornées, recherche prédictive, navigation clavier, tooltips accessibles, deep links et fiches en drawer ;
- contenus versionnés avec le Core ; aucun CMS, LLM ou RAG ajouté ;
- mécanisme prévu pour être étendu par un SaaS dérivé sans modifier le corpus Core.

Les tests applicables, lint, build et validations fonctionnelles/visuelles ont été exécutés localement et confirmés verts le 2026-09-16. La couverture E2E de release reste volontairement portée par D-016.

**Critère de clôture atteint.**

---

## 6. Dettes clôturées — références

```text
D-001 fermeture Account / Workspace                         VALIDÉ
D-002 corbeille / restauration / suppression Files          VALIDÉ — 2026-09-15
D-011 Design System + préférences                           VALIDÉ — 2026-09-10
D-014 points d'extension métier                             VALIDÉ
D-015 versionnement / provenance / release / migrations     VALIDÉ — 2026-09-17
D-018 Équipe Platform / RBAC / invitations                  VALIDÉ
D-019 moteur sécurisé de rétention / purge Core             VALIDÉ
D-021 gate sécurité Auth / invitations / tokens             VALIDÉ — 2026-09-12
D-022 intégrité Entitlement Override Groups                 VALIDÉ — 2026-09-12
D-025 centre d’aide Workspace / Platform sécurisé           VALIDÉ — 2026-09-16
DOC-CODE-1 documentation source                             VALIDÉ
```

Le détail historique de ces lots reste consultable dans Git et dans leurs documents canoniques dédiés lorsqu’ils existent.

---

## 7. Ordre de traitement recommandé

```text
D-025 centre d’aide Workspace / Platform sécurisé           VALIDÉ — 2026-09-16
D-020 invitation commerciale / validation terrain           DIFFÉRÉ — non bloquant Core 1.0
→ gate globale pré-D-015                                    VALIDÉE — 2026-09-16
→ revue finale pré-versionnement + branches + documentation VALIDÉE — 2026-09-16
→ D-015 release governance / provenance / migrations        VALIDÉE — 2026-09-17
→ D-016 Playwright E2E Core                                 PROCHAINE ÉTAPE
→ audit final architecture / sécurité / qualité
→ D-017 dérivation + upgrade pilote
→ corrections éventuelles
→ nouvelle gate
→ tag/release Core stable lorsque la stratégie est réellement validée
--- évolution post-v1.0 ---
→ D-023 demande gouvernée de transfert de propriété         DIFFÉRÉ — cible Core 1.1
→ D-024 console Platform contextualisée du Workspace        DIFFÉRÉ — cible Core 1.1
--- validation terrain du produit dérivé ---
→ D-020 validation bêta des parcours d’invitation/onboarding dans l’environnement réel applicable
```

D-016 devient le blocker Core 1.0 actif suivant après fusion de D-015.

---

## 8. Gate globale pré-D-015 — VALIDÉE

Exécutée réellement par l’utilisateur sur `main` au HEAD applicatif :

```text
3f645b231ea6c80e77275dfd8b838d2ecba479fa
```

Résultats communiqués :

```text
backend npm run lint    → VERT
backend npm test        → VERT
frontend npm run lint   → VERT
frontend npm test       → VERT
frontend npm run build  → VERT
parcours critiques manuels → VALIDÉS
```

La revue finale a ensuite confirmé l’absence de branche isolée à fusionner ; les branches historiques distantes ont été supprimées et `main` est restée l’unique branche distante. Les écarts restants identifiés étaient documentaires et ont été synchronisés avant l’ouverture de D-015.

---

## 9. Gate D-015 — éléments vérifiés

Avant le commit documentaire de clôture :

```text
branche D-015 : feature/d-015-release-governance
HEAD validé par Core Gate : 759cb9589d31ad083d78fbf5a892d432718ad526
workflow : Core Gate
run : 35192502978
conclusion : success
```

La configuration GitHub vérifiée le 2026-09-17 est :

```text
ruleset : Main protection
enforcement : active
target : default branch (main)
PR obligatoire : oui
required status check : Core Gate
bypass : aucun
suppression : bloquée
force-push : bloqué
```

Le commit documentaire de clôture doit à son tour être validé par `Core Gate` avant fusion.
