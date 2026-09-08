# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse reflète l’état connu de `main`. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment.
>
> **Dernière mise à jour : 2026-09-08**

---

## 1. Hiérarchie d’autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés réellement exécutés et validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. présent fichier de reprise.

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement prêt pour la production.

---

## 2. État courant et roadmap

D-020 a été développé puis intégré dans `main` après gate automatisée verte. Sa validation fonctionnelle manuelle complète reste différée.

Avant D-015, deux blockers restent à traiter : D-011 puis D-021. D-011 a été précisée : la stabilisation du Design System Core est désormais sa première phase obligatoire.

```text
D-018 Équipe Platform / RBAC / invitations internes            VALIDÉ
D-019 moteur sécurisé de rétention / purge Core                VALIDÉ
DOC-CODE-1 normalisation documentation source                  VALIDÉ
HOME-CORE accès public login/register                          vérification manuelle à reconfirmer
D-020 invitation commerciale / offre privée découverte         INTÉGRÉ MAIN — MANUEL DIFFÉRÉ
→ D-011.A Design System Core                                   PLANIFIÉ
→ D-011.B préférences de confort                               PLANIFIÉ
→ D-011.C préférences d'affichage métier                       PLANIFIÉ
→ D-021 gate sécurité Auth / invitations / tokens              PLANIFIÉ
→ D-015 versionnement / provenance / migrations / release      PLANIFIÉ
→ D-016 Playwright / E2E Core                                  PLANIFIÉ
→ D-002 corbeille / restauration Files                         OBLIGATOIRE AVANT PREMIÈRE DÉRIVATION
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
→ release v1.0.0
→ première dérivation métier
```

D-015 ne doit pas être ouvert avant clôture/reclassification explicite de D-011 et D-021.

---

## 3. D-020 — état intégré à conserver

Contrat canonique : `docs/contracts/COMMERCIAL-INVITATIONS.md`.

```text
PlatformInvitation  → collaborateur interne de l’éditeur
CommercialInvitation → acquisition initiale / futur client / bêta-testeur
WorkspaceInvitation → membre d’un workspace existant
```

D-020 ne rattache jamais une invitation commerciale à un workspace existant. Les offres privées restent séparées du catalogue public. Les règles `fixed`/trial et `open_ended` gratuit durable restent celles du contrat canonique.

Sécurité déjà implémentée : token aléatoire, SHA-256 persisté, URL fragment, vault JavaScript runtime, aucune persistance du secret dans Redux/localStorage/sessionStorage/history.state/query string, acceptation authentifiée et atomique.

Patterns frontend : RTK Query, `DataTable` partagé, `EntityDetailsDrawer` partagé, confirmations partagées, React Hook Form + Zod, actions selon permissions.

Gate locale D-020 confirmée verte le 2026-09-08 : backend lint/tests, frontend lint/tests/build. Le `format:check` Prettier global reste un chantier séparé ; ne pas lancer `prettier --write .` sans convention canonique.

---

## 4. D-011 — prochain bloc avant versionnement

**Statut : PLANIFIÉ — blocker Core 1.0 avant D-015.**

Ordre obligatoire :

```text
D-011.A Design System Core
→ D-011.B Préférences de confort
→ D-011.C Préférences d'affichage métier
```

### 4.1 D-011.A — Design System Core

Le frontend possède déjà une base saine à auditer, pas à reconstruire aveuglément : Tailwind CSS v4 CSS-first, `@theme inline`, variables CSS sémantiques dans `frontend/src/index.css`, light/dark et shadcn/ui.

Le nom `index.css` n'a pas besoin d'être changé en `global.css`. Son rôle doit rester global : Tailwind, tokens, thèmes, styles HTML transversaux, typographie, accessibilité globale, `color-scheme` et resets nécessaires. Aucun style métier spécifique ne doit y être accumulé.

Le contrat cible distingue :

```text
tokens primitifs contrôlés
→ tokens sémantiques
→ components/ui
→ components/shared
→ features/*/components
```

Les composants doivent préférer les tokens sémantiques aux couleurs arbitraires. L'audit doit toutefois éviter la sur-tokenisation : une valeur ponctuelle n'impose pas automatiquement un nouveau token.

À auditer avant modification : couleurs/radius/ombres/tailles codés en dur, variants shadcn/CVA, typographie, états interactifs, focus, formulaires, Dialog/Drawer/menus, responsive et composants qui contournent les primitives partagées.

### 4.2 Accessibilité : deux niveaux distincts

**Accessibilité structurelle : toujours active et non désactivable.**

Le Core vise une base cohérente avec WCAG 2.2 AA pour les composants/parcours concernés : HTML sémantique, clavier, focus visible/non masqué, contrastes, labels/erreurs, focus des overlays, accessible names, cibles interactives, zoom/texte, information non portée uniquement par la couleur, `prefers-reduced-motion` et préférences système pertinentes.

Le design normal doit rester professionnel tout en respectant ces exigences ; l'accessibilité structurelle ne doit jamais être supprimée pour préserver l'esthétique.

**Mode accessibilité renforcée : préférence optionnelle.**

Il pourra renforcer contraste, lisibilité/taille de texte, zones interactives, focus, espacements, réduction des animations/transparences et distinction des états. Il doit être conçu comme une surcouche combinable avec thème/palette, pas comme un interrupteur qui rendrait l'application accessible ou inaccessible.

### 4.3 États asynchrones et Skeletons

Le Design System doit normaliser :

```text
LOADING   → Skeleton lorsque pertinent
SUCCESS   → contenu
EMPTY     → EmptyState
ERROR     → ErrorState + retry si pertinent
FORBIDDEN / non-entitled → généralement composant absent
```

Les Skeletons doivent favoriser perception de performance et stabilité du layout, approximer la structure finale, éviter le faux contenu et respecter `prefers-reduced-motion`/le profil d'accessibilité.

Prévoir une primitive générique et seulement les compositions partagées utiles (`KpiCardSkeleton`, `DataTableSkeleton`, `CardSkeleton`, `DashboardSectionSkeleton` ou équivalents après audit). Les modules métier futurs ne doivent pas recréer la mécanique générique.

### 4.4 D-011.B — Préférences de confort

Cibles : thème clair/sombre/système, police contrôlée, palette fournie/intégrée par le propriétaire du produit et mode accessibilité renforcée.

Une préférence stocke des identifiants contrôlés, jamais une couleur CSS libre, une URL de police arbitraire ou du JSON non validé. Les palettes devront être traduites en tokens sémantiques et respecter les exigences d'accessibilité applicables.

Le cadrage doit décider persistance serveur/local, valeurs par défaut, multi-appareils, validation Zod stricte, fallbacks et compatibilité ascendante.

### 4.5 D-011.C — Préférences d'affichage métier

Invariant :

```text
Plan / entitlement effectif + permissions
→ ensemble accessible

ensemble accessible + préférences utilisateur
→ ensemble visible
```

Une préférence ne crée jamais une permission, un entitlement ou une feature. Un KPI/widget inaccessible n'est pas proposé. Les modules métier futurs doivent pouvoir enregistrer leurs widgets/KPI sans coupler le Core à un métier.

V1 : afficher/masquer et éventuellement ordonner uniquement si le cadrage le justifie. Pas de constructeur libre de dashboard.

---

## 5. D-021 — gate sécurité Auth / invitations / tokens

**Statut : PLANIFIÉ — blocker Core 1.0 avant D-015.**

Commencer par un audit de l'existant. Ne pas recréer les mécanismes déjà corrects.

Politique cible invitations : `WorkspaceInvitation`, `PlatformInvitation`, `CommercialInvitation` expirent par défaut après 7 jours, côté serveur, single-use, révocables, resend avec rotation, replay refusé et consommation atomique.

Reset password cible : 15 minutes, usage unique, nouvelle demande après expiration, token fort/hashé, anti-enumeration, rate limiting, notification et politique d'invalidation des sessions.

Auditer `register`, `login`, `forgot-password`, preview/acceptation d'invitations et endpoints Auth sensibles. CAPTCHA non systématique au login ; défense adaptative seulement si justifiée. Protéger l'inscription contre création massive/trial abuse et forgot-password contre mail bombing.

Google SSO reste D-010, non bloquant Core 1.0.

---

## 6. D-002 — gate avant première dérivation

Aucune première dérivation métier avant validation D-002.

Invariant D-019 : un fichier soft-deleted continue à consommer `storage_bytes` tant que son contenu physique existe ; une restauration avant purge ne réserve pas ce stockage une seconde fois.

---

## 7. Dettes/contrôles différés à conserver

- UI navigation : différencier les icônes répétitives sans modifier permissions/routes/API.
- Prettier global : chantier séparé ; pas de `prettier --write .` global avant convention canonique.
- D-020 : validation fonctionnelle manuelle complète.
- HOME-CORE : login/register public à reconfirmer manuellement.
- D-010 : Google SSO/MFA/passkeys/SSO avancé restent conditionnels et non blockers v1.0.

---

## 8. Prochaine reprise de travail

Le prochain bloc est :

```text
D-011.A — Audit et stabilisation du Design System Core
```

### Méthode obligatoire

1. relire `docs/REPRISE-CURRENT.md` et D-011 dans `docs/DEBT.md` ;
2. inspecter le frontend réel avant toute modification ;
3. inventorier tokens, `index.css`, shadcn/ui, CVA, composants partagés, couleurs/styles arbitraires, typographie et états UI ;
4. auditer l'accessibilité structurelle et distinguer celle-ci du mode renforcé optionnel ;
5. auditer les états loading/success/empty/error/forbidden et les besoins Skeleton ;
6. proposer le contrat Design System et les mini-lots avant de coder ;
7. ne pas sur-tokeniser ni créer de composants dupliqués ;
8. seulement après validation D-011.A, implémenter D-011.B puis D-011.C ;
9. après D-011, ouvrir D-021 ;
10. seulement après D-021, reprendre D-015 versionnement.

Aucune nouvelle fonctionnalité métier ne doit être mélangée à D-011 ou D-021.
