# SAAS-CORE-API — Registre canonique des dettes actives

**Statut :** source de vérité documentaire pour les dettes non résolues  
**Dernière mise à jour :** 2026-09-16  
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

Les dettes clôturées sont conservées sous forme de synthèse ; leur historique détaillé reste dans Git et ne doit pas être recopié ici indéfiniment.

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

### 3.1 Blockers Core 1.0 / première dérivation

| ID | Dette | Statut |
|---|---|---|
| D-020 | Invitation commerciale client et offres privées de découverte | EN COURS |
| D-025 | Centre d’aide sécurisé Workspace / Platform | VALIDÉ — 2026-09-16 |
| D-011 | Design System Core, préférences utilisateur et affichage métier | VALIDÉ |
| D-021 | Gate sécurité Auth, invitations et tokens temporaires | VALIDÉ |
| D-022 | Intégrité des Entitlement Override Groups | VALIDÉ |
| D-015 | Versionnement, provenance, releases et discipline de migration du Core | PLANIFIÉ |
| D-016 | E2E Core avec Playwright | PLANIFIÉ |
| D-002 | Corbeille et restauration des fichiers | VALIDÉ |
| D-017 | Validation réelle création + upgrade d'un SaaS dérivé pilote | PLANIFIÉ |

D-001, D-002, D-011, D-014, D-018, D-019, D-021, D-022 et D-025 sont clôturées.

**Blocker applicatif immédiat restant avant D-015 : D-020**, qui doit encore être clôturée ou explicitement reclassifiée. Une fois ce point résolu, rejouer la gate globale pré-D-015 avant d’ouvrir la release candidate.

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

### D-015 — Versionnement, provenance, releases et discipline de migration du Core

**Statut :** PLANIFIÉ  
**Périmètre :** Core / distribution  
**Blocage Core 1.0 :** oui  
**Dépendances :** D-025 est validée ; D-020 doit encore être clôturée ou explicitement reclassifiée avant ouverture de la release candidate.

À finaliser avant `v1.0.0` : SemVer, tags/releases, changelog/release notes, changements de contrats/configuration, migrations et ordre pre/post-deploy, reprise/rollback, provenance machine-readable et gate de release reproductible.

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

**Statut :** EN COURS  
**Périmètre :** Core — onboarding commercial générique  
**Blocage Core 1.0 :** oui

Contrat : `docs/contracts/COMMERCIAL-INVITATIONS.md`.

`PlatformInvitation` reste réservé aux collaborateurs internes ; `CommercialInvitation` aux prospects/futurs clients/bêta-testeurs. Offre privée via Plan non public, snapshot serveur, dérive significative refusée, token aléatoire/hash SHA-256, rotation au resend, révocation, permissions Platform dédiées, acceptation authentifiée et atomique, audit. Les règles trial/open-ended restent celles du contrat canonique.

**Critère de clôture restant :** validation fonctionnelle manuelle finale ou reclassification explicite. Le code, les contrats et les tests déjà validés ne doivent pas être redéveloppés sans écart démontré.

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

## 5. Dette clôturée récemment — D-025

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
→ clôturer ou reclassifier explicitement D-020              EN COURS
→ gate globale pré-D-015 + revue finale pré-versionnement
→ D-015 release/version/provenance/migrations               PLANIFIÉ
→ D-016 Playwright E2E Core                                 PLANIFIÉ
→ audit final architecture / sécurité / qualité
→ D-017 dérivation + upgrade pilote                         PLANIFIÉ
→ taguer uniquement ensuite la release Core stable
--- évolution post-v1.0 ---
→ D-023 demande gouvernée de transfert de propriété         DIFFÉRÉ — cible Core 1.1
→ D-024 console Platform contextualisée du Workspace        DIFFÉRÉ — cible Core 1.1
```

Aucune release `v1.0.0` ni ouverture de D-015 avant résolution explicite de D-020 et nouvelle gate globale pré-D-015.

---

## 8. Gate globale pré-D-015

À rejouer après clôture/reclassification D-020 :

```text
backend npm run lint
backend npm test
frontend npm run lint
frontend npm test
frontend npm run build
validation manuelle des parcours critiques
```

Ne jamais présenter cette gate comme verte sans exécution réelle sur l’état de `main` concerné.
