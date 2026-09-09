# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état validé destiné à devenir la référence de `main` après fusion du lot en cours. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment.
>
> **Dernière mise à jour : 2026-09-09**

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

D-011.A est désormais techniquement validé sur la branche `d-011-a-design-system-core`. D-011 reste une dette active tant que D-011.B et D-011.C ne sont pas terminés.

```text
D-018 Équipe Platform / RBAC / invitations internes            VALIDÉ
D-019 moteur sécurisé de rétention / purge Core                VALIDÉ
DOC-CODE-1 normalisation documentation source                  VALIDÉ
HOME-CORE accès public login/register                          vérification manuelle à reconfirmer
D-020 invitation commerciale / offre privée découverte         INTÉGRÉ MAIN — MANUEL DIFFÉRÉ
D-011.A Design System Core                                     VALIDÉ — EN ATTENTE DE FUSION
→ D-011.B préférences de confort                               PROCHAIN BLOC
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

## 3. Gate D-011.A validée

### 3.1 Branche et périmètre

Branche : `d-011-a-design-system-core`.

La branche part exactement du `main` `6533c282a589bcc3f901e09ca17c41c5da71aed8` et ne diverge pas de celui-ci. L’audit final avant clôture confirme que les changements du lot sont limités à `frontend/src` : aucun backend, aucune dépendance, aucune variable d’environnement et aucune configuration hors périmètre n’ont été modifiés par D-011.A.

### 3.2 Validation locale du 2026-09-09

Validation manuelle : parcours Core et Platform contrôlés visuellement, notamment les états de chargement et les drawers de détail.

Gate locale confirmée :

```text
frontend npm run lint     OK
frontend npm test         OK — 183 fichiers / 585 tests
frontend npm run build    OK
```

Les derniers correctifs de gate ont uniquement concerné :

- JSDoc des propriétés ARIA de `DataTable` ;
- suppression d’une affectation inutile dans `DatePicker` sans changement de comportement ;
- assertions de tests Testing Library rendues sémantiquement correctes pour un drawer et un tooltip masqué.

---

## 4. D-011.A — contrat Design System validé

### 4.1 Architecture et tokens

Le Core conserve Tailwind CSS v4 CSS-first, `@theme inline`, `frontend/src/index.css`, les variables CSS sémantiques, les thèmes light/dark et les primitives shadcn/ui.

Architecture retenue :

```text
tokens globaux et sémantiques
→ components/ui
→ components/shared
→ features/*/components
```

`index.css` reste réservé aux responsabilités globales : tokens, thèmes, typographie, couleurs sémantiques, couches/z-index, overlays, règles transversales et accessibilité globale. Les styles métier restent dans les features.

La sur-tokenisation est explicitement évitée : les espacements Tailwind, radius, ombres ou valeurs ponctuelles ne deviennent pas automatiquement de nouveaux tokens.

Points d’extension préparés pour D-011.B :

- `--font-family-app` ;
- couleurs sémantiques light/dark ;
- palettes futures traduites vers des tokens sémantiques contrôlés ;
- couches partagées `dropdown`, `sidebar`, `flyout`, `drawer`, `modal`, `toast`, `tooltip`.

### 4.2 Accessibilité structurelle

L’accessibilité de base reste toujours active et non désactivable. Le futur mode renforcé de D-011.B sera une surcouche, jamais un interrupteur d’accessibilité.

D-011.A a consolidé notamment :

- accessible names des tableaux et composants concernés ;
- labels/descriptions/erreurs des formulaires ;
- navigation clavier du `DatePicker` ;
- gestion du focus et restauration du focus des Dialog/Drawer ;
- tooltips partagés accessibles au focus clavier ;
- correction des sémantiques ARIA inutiles du menu utilisateur ;
- règles globales `prefers-reduced-motion` ;
- états asynchrones annoncés sans multiplier les live regions imbriquées.

### 4.3 Contrat des états asynchrones

Invariant validé :

```text
LOADING   → Skeleton adapté lorsque pertinent
SUCCESS   → contenu réel
EMPTY     → EmptyState
ERROR     → ErrorState + retry lorsque pertinent
FORBIDDEN / non-entitled → composant généralement absent
```

Règle RTK Query importante : un Skeleton est réservé au chargement initial lorsqu’aucune donnée n’est encore disponible. Pendant un refetch avec donnée en cache, le contenu réel reste affiché afin d’éviter les clignotements et pertes de contexte.

L’entitlement et les permissions déterminent si un composant ou une requête sont accessibles. Ils ne choisissent pas automatiquement la géométrie de Skeleton. Chaque feature accessible utilise explicitement une composition partagée adaptée.

Vocabulaire partagé établi :

```text
App / guards               → PageLoader
Tables                      → DataTableSkeleton
Pages Platform tabulaires  → PlatformTablePageSkeleton
Dashboard                   → compositions dashboard/shell dédiées
Settings / formulaires      → FormSectionSkeleton
Drawer détail asynchrone    → EntityDetailsSkeleton
Abonnement                  → WorkspaceSubscriptionSkeleton / PlanCardsSkeleton
Cas métier réellement unique → composition spécifique basée sur Skeleton
```

Une future feature ne doit donc pas créer une nouvelle convention visuelle générique si une composition partagée correspond déjà à sa géométrie.

### 4.4 Skeletons et surfaces couvertes

Couverture D-011.A validée sur les principales surfaces :

- guards et chargements de page ;
- Dashboard Workspace ;
- Files ;
- Subscription et catalogue de plans ;
- Workspace Settings / transfert de propriété ;
- listes Platform Users, Workspaces, Plans, Subscriptions, Invitations, Overrides, Audit Logs et Retention ;
- sections Platform Team ;
- drawers asynchrones User, Workspace, Subscription, Entitlement Override et Role.

Un drawer recevant déjà un objet complet depuis une liste ne simule pas artificiellement un chargement réseau.

---

## 5. D-011.B — prochain bloc

D-011.B doit maintenant construire les préférences de confort au-dessus du Design System stabilisé.

Cibles :

```text
thème clair / sombre / système
police parmi une liste contrôlée
palette parmi les palettes fournies et validées par le produit
mode accessibilité renforcée
```

Règles :

- aucune valeur CSS libre ;
- aucun URL de police arbitraire ;
- aucun JSON libre non validé ;
- identifiants contrôlés et validation stricte ;
- stratégie de persistance explicitement choisie ;
- fallbacks si une option disparaît ;
- compatibilité avec les préférences système pertinentes ;
- aucune préférence ne crée de permission ou d’entitlement.

La préférence d’accessibilité renforcée pourra augmenter contraste, lisibilité, focus, zones interactives, réduction des animations/transparences et distinction des états, tout en conservant l’accessibilité structurelle de base toujours active.

---

## 6. D-011.C — affichage métier après D-011.B

Invariant :

```text
Plan / entitlement effectif + permissions
→ ensemble accessible

ensemble accessible + préférences utilisateur
→ ensemble visible
```

Une préférence ne crée jamais une permission, un entitlement ou une feature. Un KPI/widget inaccessible n’est pas proposé dans les préférences et ne doit pas polluer le Dashboard avec un faux état « indisponible ».

Le Core doit rester générique : les futurs modules métier enregistreront leurs widgets/KPI sans coupler le socle à un domaine particulier.

---

## 7. D-021 — gate sécurité avant versionnement

Après clôture de D-011.B puis D-011.C, ouvrir D-021 avant D-015.

Politique cible à confirmer par audit :

- `WorkspaceInvitation`, `PlatformInvitation`, `CommercialInvitation` : expiration par défaut 7 jours, côté serveur, single-use, révocation, resend avec rotation, replay/concurrence sécurisés ;
- reset password : 15 minutes, usage unique, nouvelle demande après expiration ;
- anti-enumeration, rate limiting et stratégie anti-bot auditée ;
- Google SSO reste D-010, hors D-021 et non bloquant Core 1.0.

---

## 8. Dettes et contrôles à conserver

- D-020 : validation fonctionnelle manuelle complète toujours différée.
- D-002 : corbeille/restauration Files obligatoire avant première dérivation métier.
- HOME-CORE : login/register public à reconfirmer manuellement.
- Prettier global : chantier séparé ; ne pas lancer `prettier --write .` global sans convention canonique.
- D-010 : Google SSO/MFA/passkeys/SSO avancé restent conditionnels et non blockers v1.0.

---

## 9. Prochaine reprise de travail

Après fusion de D-011.A dans `main`, le prochain bloc est :

```text
D-011.B — Préférences de confort
```

Méthode : cadrer d’abord le modèle de préférence, les identifiants autorisés, les valeurs par défaut, la persistance et les fallbacks ; vérifier ensuite si un backend est réellement nécessaire avant d’implémenter. Ne pas mélanger D-011.C, D-021 ou une fonctionnalité métier dans ce lot.
