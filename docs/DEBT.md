# SAAS-CORE-API — Registre canonique des dettes actives

**Statut :** source de vérité documentaire pour les dettes non résolues  
**Dernière mise à jour :** 2026-09-10  
**Périmètre :** Core clonable et, lorsque précisé, applications dérivées

---

## 1. Objet

Ce document est le registre unique des dettes fonctionnelles, techniques, de conformité, de distribution et de préparation à la production encore actives.

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
| D-011 | Design System Core, préférences utilisateur et affichage métier | VALIDÉ |
| D-021 | Gate sécurité Auth, invitations et tokens temporaires | PLANIFIÉ |
| D-015 | Versionnement, provenance, releases et discipline de migration du Core | PLANIFIÉ |
| D-016 | E2E Core avec Playwright | PLANIFIÉ |
| D-002 | Corbeille et restauration des fichiers | PLANIFIÉ |
| D-017 | Validation réelle création + upgrade d'un SaaS dérivé pilote | PLANIFIÉ |

D-001, D-011, D-014, D-018 et D-019 sont clôturées.

D-020 et D-021 doivent être clôturées ou explicitement reclassifiées avant D-015. D-002 doit être `VALIDÉ` avant D-017 et avant toute première dérivation métier.

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

## D-011 — Design System Core, préférences utilisateur et affichage métier

**Statut :** VALIDÉ — 2026-09-10  
**Périmètre :** Core frontend clonable + préférences utilisateur + points d'extension des applications dérivées  
**Blocage Core 1.0 :** levé  
**Dépendances :** design system frontend existant, identité utilisateur, entitlement effectif et RBAC  
**Déclencheur :** décisions produit du 2026-09-08 — stabiliser avant versionnement le langage visuel du Core, son accessibilité et le mécanisme générique de préférences.

Ordre réalisé :

```text
D-011.A Design System Core                    VALIDÉ — 2026-09-09
D-011.B Préférences de confort                VALIDÉ — 2026-09-09
D-011.C Préférences d'affichage métier        VALIDÉ — 2026-09-10
```

Le système de préférences choisit uniquement parmi des possibilités autorisées par le Design System et les droits effectifs ; il ne crée ni styles arbitraires ni autorisations.

### D-011.A — Stabilisation du Design System Core

**Sous-phase : VALIDÉE le 2026-09-09.** Validation manuelle réalisée, puis gate frontend locale `npm run lint`, `npm test` (183 fichiers / 585 tests) et `npm run build` verte. Le lot n'a nécessité aucune modification backend ni nouvelle dépendance.

Le frontend possède une base Tailwind CSS v4 CSS-first avec `@theme inline`, variables CSS sémantiques, thèmes light/dark et composants shadcn/ui. Cette base a été consolidée plutôt que remplacée.

Le fichier global actuel (`frontend/src/index.css`) conserve son nom : son rôle importe davantage que le nom `global.css`. Il reste limité aux imports Tailwind, tokens/thèmes, styles HTML globaux, règles transversales d'accessibilité, typographie, `color-scheme` et resets réellement globaux. Il ne devient pas un stockage de styles métier ou de composants.

Le contrat de tokens distingue lorsque pertinent :

```text
tokens primitifs
→ valeurs physiques contrôlées : palettes, typographie, spacing, radius, shadows, motion...

tokens sémantiques
→ background, foreground, card/surface, primary, secondary, muted, accent,
  border, input, ring, destructive, success, warning, info, disabled...

composants UI
→ consomment les tokens sémantiques plutôt que des couleurs arbitraires
```

Les tokens spécifiques à un composant ne sont ajoutés que lorsqu'ils apportent une vraie valeur ; éviter une explosion de variables dupliquant les variants gérés proprement par shadcn/CVA/Tailwind.

Les couleurs, tailles, radius, ombres et autres valeurs codées en dur dans les composants ont été auditées avec le principe suivant : une valeur ponctuelle n'est pas automatiquement une dette ; la migration vers un token doit être justifiée par une responsabilité réellement transverse.

Architecture validée :

```text
Design tokens
→ components/ui : primitives du design system
→ components/shared : compositions réutilisables transversales
→ features/*/components : composants métier composés à partir des briques précédentes
```

Aucune page ou feature ne doit recréer localement une primitive générique déjà disponible.

### Accessibilité structurelle obligatoire

L'accessibilité de base n'est **pas une préférence désactivable** et ne dépend pas d'un thème. Le Core vise au minimum une conformité cohérente avec WCAG 2.2 AA pour ses composants et parcours concernés.

Doivent notamment rester garantis :

- HTML sémantique et accessible names ;
- navigation clavier ;
- focus visible et non masqué ;
- contrastes minimums texte/UI ;
- labels et descriptions de formulaires ;
- association des erreurs aux champs et annonces pertinentes ;
- gestion correcte du focus des Dialog/Drawer/menus ;
- icônes décoratives ignorées par les technologies d'assistance ;
- cibles interactives suffisamment utilisables ;
- zoom/taille de texte sans rupture majeure ;
- absence d'information portée uniquement par la couleur ;
- respect de `prefers-reduced-motion` et des préférences système pertinentes ;
- états loading/empty/error compréhensibles et non ambigus.

Une exigence d'accessibilité structurelle ne doit jamais être retirée pour préserver l'esthétique. L'objectif est un design normal professionnel **et** accessible.

### Mode accessibilité renforcée

D-011.B expose une préférence contrôlée `accessibilityMode`. Elle constitue une **surcouche optionnelle** et non l'activation de l'accessibilité elle-même.

Le profil renforcé peut augmenter de manière contrôlée le contraste de surfaces secondaires, la visibilité des bordures et du focus, et réduire certaines animations/transitions applicatives. Le respect global de `prefers-reduced-motion` reste toujours actif indépendamment de cette préférence.

Il se combine avec le thème/palette choisi lorsque cela reste cohérent :

```text
thème/palette
+
préférences de confort
+
profil accessibilité renforcée
```

Une préférence applicative ne doit pas neutraliser un besoin système important sans décision explicite et justifiée.

### États asynchrones et Skeletons

Le Design System normalise les états des composants alimentés par des données serveur :

```text
LOADING   → Skeleton adapté lorsque pertinent
SUCCESS   → contenu
EMPTY     → EmptyState
ERROR     → ErrorState + retry lorsque pertinent
FORBIDDEN / non-entitled → généralement composant absent selon RBAC/entitlement
```

Les Skeletons sont une brique de perception de performance et de stabilité visuelle, pas une décoration. Ils approximent la structure finale sans créer de faux contenu, limitent les changements de layout et respectent `prefers-reduced-motion`.

Règle RTK Query : un Skeleton est réservé au chargement initial lorsqu'aucune donnée n'est encore disponible. Lors d'un refetch avec donnée existante, le contenu réel reste affiché.

Le socle partagé comprend notamment la primitive `Skeleton`, `DataTableSkeleton`, `PageLoader`, `FormSectionSkeleton`, `EntityDetailsSkeleton` et les compositions Platform/Subscription nécessaires. Une future feature accessible par Plan/entitlement ou délégation doit réutiliser la composition correspondant à sa géométrie ; l'entitlement décide l'accès, pas le type de Skeleton.

`loading`, `empty`, `error`, `forbidden` et `disabled` restent des états distincts et ne doivent jamais être confondus.

### D-011.B — Préférences de confort

**Sous-phase : VALIDÉE le 2026-09-09.** Gate locale finale frontend et backend verte (`lint`, tests globaux et build frontend) et validation UI manuelle confirmée avant fusion fast-forward dans `main`.

Le Core fournit un mécanisme contrôlé pour les préférences transversales :

```text
theme             → system | light | dark
fontFamily        → inter | geist | manrope | system
paletteId         → palette enregistrée dans le registre Core
accessibilityMode → standard | enhanced
```

La persistance authentifiée repose sur `User.preferences.comfort`, avec endpoints `GET /api/users/me/preferences` et `PATCH /api/users/me/preferences`, validation Zod stricte, enums contrôlés, normalisation des comptes plus anciens et absence de migration destructive obligatoire.

Une préférence ne stocke jamais une valeur CSS libre, une URL de police arbitraire, une palette utilisateur non validée ou un JSON libre. Elle stocke uniquement des identifiants contrôlés.

Le frontend distingue :

```text
utilisateur anonyme     → stockage local contrôlé
utilisateur authentifié → préférences serveur du compte
```

Le stockage local courant utilise `saas-core:comfort:<scope>`. L'ancienne clé `saas-core:theme:<scope>` reste uniquement lisible pour compatibilité ascendante.

Polices intégrées : Inter par défaut, Geist, Manrope et System. Les dépendances Fontsource correspondantes sont verrouillées dans le lockfile.

Palettes Core intégrées :

```text
Core Atlantique
Refreshing Summer Fun
Leafy Green Garden
Golden Peachy Glow
```

Les mini-palettes utilisent des métadonnées frontend contrôlées. Les couleurs réelles restent traduites vers les tokens sémantiques du Design System. Les couleurs d'état restent indépendantes des palettes de marque.

La page `/account/preferences` propose thème, police, palette et accessibilité renforcée. Le clic sur une palette ou une police produit un aperçu immédiat, mais seule la sauvegarde explicite persiste le choix serveur ; quitter sans enregistrer restaure la préférence sauvegardée.

Les ajustements transversaux de shell réalisés dans le même lot sont factorisés : identité applicative `SaaS Core`, affichage statique du workspace lorsqu'un seul est accessible, bloc partagé d'identité authentifiée, qualité Platform issue du contexte réel, raccourci Déconnexion, tooltip `bottom-end`, sidebars Workspace/Platform liées au viewport avec scroll interne de navigation si nécessaire. Ces éléments ne créent aucune nouvelle source d'autorisation.

### D-011.C — Préférences d'affichage métier

**Sous-phase : VALIDÉE le 2026-09-10.** Validation fonctionnelle manuelle confirmée, tests ciblés et globaux locaux verts, lint vert et build frontend vert avant fusion fast-forward dans `main` au commit `084a0094dd5bdd16103476f9be67173e434faeb5`.

Le Core fournit désormais un registre extensible permettant aux futurs modules métier de déclarer des widgets, cartes, indicateurs ou KPI sans coupler le Core à un domaine métier.

Invariant de sécurité et d'UX :

```text
Plan / entitlement effectif
+
permissions utilisateur
→ ensemble réellement accessible

ensemble réellement accessible
+
préférences utilisateur
→ ensemble visible
```

Conséquences validées :

- une préférence ne crée jamais un droit ;
- un widget non autorisé n'est jamais proposé dans les préférences ;
- masquer un widget ne retire aucun droit ;
- afficher un widget ne crée aucun droit ;
- le frontend n'utilise jamais les préférences comme autorisation ;
- les composants non accessibles sont absents plutôt qu'affichés comme « indisponibles » lorsque la convention produit le prévoit ;
- les identifiants de widgets sont stables et strictement validés ;
- les identifiants inconnus ou retirés peuvent être préservés sans coupler le backend au registre frontend ;
- la prévisualisation des switches est immédiate mais la persistance n'a lieu qu'après `Enregistrer` ;
- `Annuler` restaure l'état enregistré ;
- les grilles rééquilibrent l'espace selon les widgets réellement visibles ;
- le contrôle de personnalisation est contextualisé au Dashboard Workspace et au Dashboard Platform ;
- les drawers partagés sont portallés dans `document.body` afin de rester attachés au viewport et indépendants des contextes de stacking du shell.

Persistance :

```text
User.preferences.dashboard.hiddenWidgetIds
```

La validation backend impose une liste bornée d'identifiants syntaxiquement contrôlés, sans JSON libre et sans dépendance au registre frontend.

Architecture Workspace :

```text
frontend/src/app/application-dashboard.js
→ widgets Core
→ modules Dashboard explicitement composés
→ filtre features + permissions
→ préférences utilisateur
→ composition du Dashboard
```

Les cartes Workspace actuellement fournies par le Core (`Statut du workspace`, `Votre rôle`, `Abonnement`, etc.) servent principalement de surface générique avant dérivation. Elles ne définissent pas le contenu métier futur. Dans un SaaS dérivé, le registre est destiné à recevoir les KPI et données métier déclarés par les modules applicatifs.

Le Dashboard Platform est différent : il constitue déjà une surface fonctionnelle d'administration de la plateforme. Ses domaines (`Utilisateurs`, `Workspaces`, `Plans`, `Abonnements`, `Dérogations`, `Usage/fichiers`, `Audit`, `Équipe Platform`) restent bornés par la projection backend des permissions Platform, puis éventuellement réduits par la préférence personnelle.

La V1 est volontairement limitée à **afficher / masquer**. Aucun constructeur libre, drag-and-drop arbitraire, redimensionnement, personnalisation visuelle par widget ou logique métier n'est ajouté par anticipation.

### Tests validés D-011

D-011.A, D-011.B et D-011.C sont validés par leurs gates locales respectives, tests ciblés/globaux, lint/build applicables et validation manuelle. D-011.C couvre notamment validation backend stricte, non-escalade, filtrage entitlement/RBAC, fallback d'identifiants inconnus, persistance, prévisualisation, absence de requête pour certains widgets masqués et comportements de shell/drawer associés.

**Critère de clôture atteint :** Design System Core stabilisé, accessibilité structurelle non désactivable intégrée, profil renforcé contrôlé, états asynchrones partagés, préférences de confort strictes, registre Dashboard extensible, filtrage entitlement+RBAC garanti, composants réutilisables et validation backend/frontend effectuée.

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
**Dépendances :** D-020 et D-021 doivent être clôturées ou explicitement reclassifiées avant ouverture de la release candidate

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

Cette dette est d'abord une **gate d'audit de l'existant**. Elle ne doit pas recréer ce qui est déjà correctement implémenté et testé.

### Invitations

Politique cible Core à confirmer par audit :

```text
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
→ expiration par défaut : 7 jours
```

Exigences : token cryptographiquement aléatoire, secret brut jamais persisté lorsque le modèle permet un hash, expiration serveur, single-use atomique, révocation, resend avec rotation, protection replay/concurrence, absence de fuite logs/URLs persistantes, audit et tests.

### Forgot / reset password

```text
reset password token
→ durée : 15 minutes
→ usage unique
→ nouvelle demande requise après expiration
```

À vérifier : token fort/hashé, expiration serveur, consommation atomique, anti-enumeration, rate limiting, notification après changement et politique explicite d'invalidation des sessions après reset.

### Rate limiting et anti-automation

Auditer séparément `register`, `login`, `forgot-password`, preview/acceptation d'invitations et endpoints Auth sensibles. Le CAPTCHA/challenge anti-bot n'est pas imposé systématiquement au login ; il reste une défense complémentaire/adaptative. L'inscription publique doit être protégée contre création massive de comptes/trials et `forgot-password` contre le mail bombing.

### Google SSO hors D-021

Google SSO reste dans D-010 et ne bloque pas Core 1.0.

**Critère de clôture :** audit documenté des secrets temporaires, invitations 7 jours par défaut ou exceptions justifiées, reset 15 minutes, single-use/rotation/révocation/replay/concurrence sécurisés, anti-enumeration/rate limiting vérifiés, stratégie anti-bot décidée, tests verts et documentation synchronisée avant D-015.

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
D-011.A stabilisation Design System Core                    VALIDÉ
D-011.B préférences de confort                              VALIDÉ
D-011.C préférences d'affichage métier                      VALIDÉ
→ D-021 gate sécurité Auth / invitations / tokens           PLANIFIÉ
→ D-015 release/version/provenance/migrations               PLANIFIÉ
→ D-016 Playwright E2E Core                                 PLANIFIÉ
→ D-002 corbeille / restauration Files                      PLANIFIÉ — avant première dérivation
→ audit final architecture / sécurité / qualité
→ D-017 dérivation + upgrade pilote                         PLANIFIÉ
→ taguer uniquement ensuite la release Core stable
```

Aucune première dérivation métier avant D-002 `VALIDÉ`. Aucune release `v1.0.0` avant clôture/reclassification explicite des blockers Core applicables, notamment D-020 et D-021 avant D-015.

---

## 8. Gate finale d'un SaaS dérivé

Un produit dérivé n'est pas production-ready sans version Core compatible, modules métier validés, dettes applicables traitées, configuration/infrastructure, conformité, Billing si payant, E2E produit et procédures sauvegarde/rollback/monitoring adaptées.
