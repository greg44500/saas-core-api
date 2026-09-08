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

---

## 3. Gates

### 3.1 Core 1.0 finalisé

Le Core peut être considéré comme un socle générique stable lorsque ses responsabilités communes sont cohérentes, testées, documentées et suffisamment extensibles pour être dérivées puis mises à niveau.

### 3.2 SaaS dérivé prêt pour la production

Un produit dérivé doit en plus résoudre les dettes dépendant de son modèle commercial, de ses traitements, providers et infrastructure.

```text
Core 1.0 finalisé
≠
produit dérivé automatiquement production-ready
```

---

## 4. Synthèse des dettes

### 4.1 Blockers Core 1.0 / première dérivation

| ID | Dette | Statut |
|---|---|---|
| D-020 | Invitation commerciale client et offres privées de découverte | EN COURS |
| D-011 | Préférences utilisateur, apparence et affichage métier | PLANIFIÉ |
| D-021 | Gate sécurité Auth, invitations et tokens temporaires | PLANIFIÉ |
| D-015 | Versionnement, provenance, releases et discipline de migration du Core | PLANIFIÉ |
| D-016 | E2E Core avec Playwright | PLANIFIÉ |
| D-002 | Corbeille et restauration des fichiers | PLANIFIÉ |
| D-017 | Validation réelle création + upgrade d'un SaaS dérivé pilote | PLANIFIÉ |

D-001, D-014, D-018 et D-019 sont clôturées.

D-020, D-011 et D-021 doivent être clôturées ou explicitement reclassifiées avant D-015. D-002 doit être `VALIDÉ` avant D-017 et avant toute première dérivation métier.

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
D-010 authentification avancée — dont Google SSO
```

---

## 5. Règles de maintenance

Pour chaque dette active : conserver un identifiant stable, un statut autorisé, son périmètre, son caractère bloquant ou non, ses dépendances/déclencheurs et un critère de clôture vérifiable. Ne pas dupliquer son statut dans d'autres documents. L'historique détaillé reste dans Git.

---

## D-002 — Corbeille et restauration des fichiers

**Statut :** PLANIFIÉ  
**Périmètre :** Core Files  
**Blocage :** oui avant D-017 et première dérivation métier

Le cycle doit compléter le soft delete/purge D-019 par listing de corbeille et restauration sécurisés : permissions dédiées, isolation Workspace, restauration simple/multiple lorsque pertinente, existence physique, coordination avec purge, quotas, audit, UI `Ressources > Corbeille` avec `DataTable` partagé et tests sécurité/concurrence.

Invariant : un fichier soft-deleted dont le contenu physique existe consomme encore `storage_bytes`; une restauration avant purge ne réserve donc pas le stockage une seconde fois.

**Critère de clôture :** cycle utilisateur suppression/restauration cohérent avec D-019, sécurisé, testé et documenté.

---

## D-003 — RGPD, cookies, confidentialité et obligations légales

**Statut :** À CADRER  
**Périmètre :** application dérivée + mécanismes Core nécessaires  
**Blocage Core 1.0 :** non par défaut  
**Blocage production dérivée :** oui lorsque applicable

Références : `docs/compliance/COMPLIANCE.md` et `docs/compliance/rgpd-data-tracker-inventory.md`.

**Critère de clôture :** conformité technique/documentaire alignée sur les traitements réels.

---

## D-004 — Billing / Payment réel

**Statut :** À CADRER  
**Périmètre :** application dérivée payante  
**Blocage Core 1.0 :** non

`Subscription / entitlement ≠ encaissement / facture / autorité financière`. À cadrer selon le produit : provider, identité facturée, idempotence, échecs, remboursements, prorata/remises, fiscalité, factures et audit. Les données de carte ne sont jamais stockées par le Core.

---

## D-005 — Observabilité technique de production

**Statut :** À CADRER  
**Blocage Core 1.0 :** non

`AuditLog` ne remplace pas le monitoring technique. Prévoir selon l'infrastructure : erreurs 5xx, latence, MongoDB, SMTP, jobs, Files/antivirus, frontend, `requestId`, métriques et alertes.

---

## D-006 — Rétention, anonymisation et suppression réglementaire

**Statut :** À CADRER  
**Blocage Core 1.0 :** non comme politique juridique universelle

```text
D-006 = politique produit/juridique
D-019 = moteur d'exécution générique validé
```

---

## D-007 — Stockage et exploitation des fichiers en production

**Statut :** À CADRER  
**Blocage Core 1.0 :** non

À valider selon le déploiement : provider/volume persistant, sauvegarde/restauration, chiffrement, disponibilité, suppression physique, rétention, antivirus, quotas/coûts et localisation des données.

---

## D-008 — Notifications et communications transactionnelles étendues

**Statut :** CONDITIONNEL  
**Blocage Core 1.0 :** non

À traiter seulement si un produit dépasse les emails transactionnels déjà fournis.

---

## D-009 — API Keys et Webhooks

**Statut :** CONDITIONNEL  
**Blocage Core 1.0 :** non

Si applicable : secrets jamais en clair, scopes, expiration/révocation, audit, rate limiting, signatures, retry, SSRF, validation stricte des URLs et idempotence.

---

## D-010 — Authentification avancée

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée / évolution Core motivée  
**Blocage Core 1.0 :** non

Google SSO reste volontairement ici et ne bloque pas D-015/v1.0. Son ajout futur devra traiter correctement OpenID Connect/OAuth, liaison d'identité avec un compte local existant, collisions d'email, révocation, coexistence de plusieurs méthodes de connexion et séparation stricte entre identité externe et autorisations internes.

MFA, passkeys, SSO entreprise ou autres providers ne sont pas ajoutés uniquement par anticipation.

**Critère de clôture :** `NON APPLICABLE` ou mécanisme requis implémenté, sécurisé et testé.

---

## D-011 — Préférences utilisateur, apparence et affichage métier

**Statut :** PLANIFIÉ  
**Périmètre :** Core clonable + points d'extension des applications dérivées  
**Blocage Core 1.0 :** oui, avant D-015

Deux familles :

```text
Préférences de confort
→ thème clair/sombre/système, police contrôlée, palette fournie par le propriétaire du produit, futures options ergonomiques/accessibilité

Préférences d'affichage métier
→ sélection personnelle parmi widgets/cartes/KPI déjà accessibles
```

Invariant :

```text
Plan / entitlement effectif + permissions
→ ensemble accessible

ensemble accessible + préférences utilisateur
→ ensemble visible
```

Une préférence ne crée jamais un droit. Une feature/KPI non autorisée n'est pas proposée. Les modules métier doivent pouvoir enregistrer leurs widgets sans coupler le Core à un métier particulier. La persistance serveur/local, validation stricte, fallbacks et compatibilité ascendante doivent être cadrés. Pas de JSON libre non validé. UI réutilisable et design system centralisé.

**Critère de clôture :** contrat générique figé, séparation confort/métier, persistance/validation sécurisées, thèmes/polices/palettes contrôlés, registre dashboard extensible, filtrage entitlement+RBAC et tests pertinents validés avant D-015.

---

## D-012 — Tests E2E de chaque application dérivée

**Statut :** À CADRER  
**Blocage Core 1.0 :** non — voir D-016

Chaque dérivé doit couvrir ses parcours métier/transversaux critiques.

---

## D-013 — Configuration et déploiement de production

**Statut :** À CADRER  
**Blocage Core 1.0 :** non

Variables/secrets, HTTPS, reverse proxy, CORS, cookies, MongoDB/backups, migrations/indexes, SMTP, stockage, antivirus, jobs, health/readiness, monitoring et rollback. Référence : `docs/operations/OPERATIONS.md`.

---

## D-015 — Versionnement, provenance, releases et discipline de migration du Core

**Statut :** PLANIFIÉ  
**Périmètre :** Core / distribution  
**Blocage Core 1.0 :** oui  
**Dépendances :** D-020, D-011 et D-021 doivent être clôturées ou explicitement reclassifiées avant ouverture de la release candidate

À finaliser avant `v1.0.0` : SemVer, tags/releases, changelog/release notes, changements de contrats/configuration, migrations et ordre pre/post-deploy, reprise/rollback, provenance machine-readable et gate de release reproductible.

---

## D-016 — E2E du Core avec Playwright

**Statut :** PLANIFIÉ  
**Blocage Core 1.0 :** oui

Couvrir les parcours transversaux critiques : auth/session/refresh/logout, lifecycle Account/Workspace, isolation tenant, RBAC, subscription/entitlement/quota, administration Platform, Files et principaux états interdits.

---

## D-017 — Validation réelle de la dérivation et de l'upgrade du Core

**Statut :** PLANIFIÉ  
**Blocage Core 1.0 :** oui pour valider réellement la stratégie de distribution  
**Dépendances :** D-014 validée, puis D-015, D-016 et D-002

Exercice : release candidate Core → dépôt pilote dérivé → petit module métier → évolution Core compatible → upgrade réel → migrations/configuration → tests Core+métier+E2E → analyse des conflits/provenance.

---

## D-020 — Invitation commerciale client et offres privées de découverte

**Statut :** EN COURS  
**Périmètre :** Core — onboarding commercial générique  
**Blocage Core 1.0 :** oui

Contrat : `docs/contracts/COMMERCIAL-INVITATIONS.md`.

`PlatformInvitation` reste réservé aux collaborateurs internes ; `CommercialInvitation` aux prospects/futurs clients/bêta-testeurs. Offre privée via Plan non public, snapshot serveur, dérive significative refusée, token aléatoire/hash SHA-256, rotation au resend, révocation, permissions Platform dédiées, acceptation authentifiée et atomique, audit. Les règles trial/open-ended restent celles du contrat canonique.

**Critère de clôture :** validation fonctionnelle manuelle restante + contrat, sécurité, backend/frontend et tests validés.

---

## D-021 — Gate sécurité Auth, invitations et tokens temporaires

**Statut :** PLANIFIÉ  
**Périmètre :** Core Auth + WorkspaceInvitation + PlatformInvitation + CommercialInvitation et tout lien sensible temporaire  
**Blocage Core 1.0 :** oui, avant D-015  
**Dépendances :** Auth/session et domaines d'invitation existants  
**Déclencheur :** décision sécurité du 2026-09-08 — auditer et homogénéiser les secrets temporaires avant de figer le versionnement du Core

Cette dette est d'abord une **gate d'audit de l'existant**. Elle ne doit pas recréer ce qui est déjà correctement implémenté et testé. Chaque invariant doit être vérifié dans le code, les contraintes DB, les tests et les contrats avant modification.

### Invitations

Toutes les invitations sensibles doivent être temporaires, à usage unique et révocables. Politique cible Core à confirmer par audit :

```text
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
→ expiration par défaut : 7 jours
```

Le délai doit être défini côté serveur et configurable de manière contrôlée si un domaine a un besoin justifié. Un resend doit produire un nouveau secret et invalider/faire tourner l'ancien ; il ne doit pas simplement prolonger un secret déjà distribué.

Exigences : token cryptographiquement aléatoire, secret brut jamais persisté lorsque le modèle permet un hash, expiration vérifiée serveur, single-use atomique, révocation explicite, protection contre replay/concurrence, absence de fuite dans logs/URLs persistantes, audit des transitions sensibles et tests d'expiration.

### Forgot / reset password

Politique cible :

```text
reset password token
→ durée : 15 minutes
→ usage unique
→ nouvelle demande requise après expiration
```

À vérifier/garantir : token fort, stockage hashé, expiration serveur, consommation atomique, impossibilité de réutilisation, réponse de demande uniforme ne révélant pas l'existence d'un compte, rate limiting, notification après changement de mot de passe et politique explicite d'invalidation des sessions après reset.

### Rate limiting et anti-automation

Auditer séparément `register`, `login`, `forgot-password`, preview/acceptation d'invitations et autres endpoints Auth sensibles.

La première défense reste le rate limiting et les contrôles anti-abus adaptés, idéalement sans dépendre uniquement de l'IP lorsque le contexte permet également une limitation par identité/compte/email normalisé sans créer d'oracle d'énumération.

Un CAPTCHA/challenge anti-bot ne doit **pas** être imposé systématiquement au login par défaut. Il reste une défense complémentaire à déclencher selon le risque : abus automatisé, volume anormal, échecs répétés ou besoin produit démontré. L'intégration future d'un provider anti-bot doit préserver accessibilité, confidentialité et possibilité de remplacement.

Pour l'inscription publique, le besoin de challenge doit être évalué avec les protections existantes : rate limiting, vérification email, prévention des créations massives et protection de `TrialEligibility`. Pour `forgot-password`, empêcher le mail bombing fait partie de la gate.

### Google SSO hors D-021

Google SSO reste dans D-010 et **ne bloque pas** le versionnement Core 1.0. D-021 ne doit pas l'implémenter indirectement.

### Tests attendus

- expiration exacte et refus après expiration ;
- usage unique et replay refusé ;
- resend/rotation invalidant l'ancien secret ;
- révocation ;
- concurrence sur acceptation/consommation ;
- anti-enumeration ;
- rate limits des endpoints sensibles ;
- reset password expiré après 15 minutes ;
- comportement sessions après reset ;
- absence de persistance/log accidentel du secret ;
- tests backend d'intégration/sécurité et tests frontend pertinents.

**Critère de clôture :** audit documenté de tous les secrets temporaires Core, politique d'expiration homogène ou exceptions justifiées, invitations 7 jours par défaut, reset 15 minutes, single-use/rotation/révocation/replay/concurrence sécurisés, anti-enumeration et rate limiting vérifiés, stratégie anti-bot explicitement décidée, tests verts et documentation canonique synchronisée avant D-015.

---

## 6. Éléments volontairement non intégrés comme dette active

Ne sont pas ajoutés par anticipation : packages `@saas-core/*`, provider de paiement imposé au Core, CMP fictive sans traceurs applicables, limite universelle du nombre de Workspaces ou CAPTCHA/provider anti-bot imposé sans besoin démontré.

---

## 7. Ordre de traitement recommandé

```text
D-001 fermeture Account / Workspace                         VALIDÉ
D-014 points d'extension métier                             VALIDÉ
D-018 Équipe Platform / RBAC / invitations                  VALIDÉ
D-019 moteur sécurisé de rétention / purge Core             VALIDÉ
DOC-CODE-1 documentation source                             VALIDÉ
→ D-020 invitation commerciale / offre privée découverte    EN COURS
→ D-011 préférences utilisateur / apparence / dashboard     PLANIFIÉ
→ D-021 gate sécurité Auth / invitations / tokens           PLANIFIÉ
→ D-015 release/version/provenance/migrations               PLANIFIÉ
→ D-016 Playwright E2E Core                                 PLANIFIÉ
→ D-002 corbeille / restauration Files                      PLANIFIÉ — avant première dérivation
→ audit final architecture / sécurité / qualité
→ D-017 dérivation + upgrade pilote                         PLANIFIÉ
→ taguer uniquement ensuite la release Core stable
```

Aucune première dérivation métier avant D-002 `VALIDÉ`. Aucune release `v1.0.0` avant clôture/reclassification explicite de tous les blockers Core applicables, notamment D-020, D-011 et D-021 avant D-015.

---

## 8. Gate finale d'un SaaS dérivé

Un produit dérivé n'est pas production-ready sans version Core compatible, modules métier validés, dettes applicables traitées, configuration/infrastructure, conformité, Billing si payant, E2E produit et procédures sauvegarde/rollback/monitoring adaptées.
