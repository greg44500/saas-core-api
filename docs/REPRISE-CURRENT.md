# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état réel du Core au 2026-09-12 après la fusion du chantier tokens + Sidebar shadcn + Topbar Platform, et avant la poursuite de l’audit transversal des autres primitives UI.
>
> Le code actuel, les contraintes de base de données, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-12**

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

Les anciennes synthèses de reprise ne sont pas autoritatives lorsqu’elles sont dépassées.

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement prêt pour la production.

---

## 2. État Git de référence

Branche de référence :

```text
main
```

HEAD fonctionnel après fusion du chantier UI :

```text
9f6e45f42d2b02cc18bb822b924573abaaf2a06c
Merge shadcn sidebar and topbar alignment
```

PR correspondante :

```text
PR #11 — feat(frontend): align Core navigation with shadcn sidebar
```

Cette PR intègre également le lot tokens préparatoire, car la branche Sidebar descendait de `feature/ui-design-tokens`.

Toute nouvelle conversation doit relire le HEAD réel de `main` avant modification, car un commit documentaire peut avoir été ajouté après ce SHA.

---

## 3. Gates et validation du chantier UI fusionné

Le chantier a été développé sur branche isolée puis fusionné après validation locale.

Éléments réellement observés :

```text
frontend suite globale avant dernière correction : 717 / 718 tests verts
unique échec : platform-layout.test.jsx
→ cause identifiée : mock obsolète ne transmettant plus le slot `actions`
→ test corrigé puis relancé de manière ciblée : VERT

autres tests ciblés Sidebar / Router / Topbar : VERT
frontend lint : VERT
frontend build : VERT
validation visuelle manuelle : effectuée pendant le chantier
```

Ne pas transformer cette information en affirmation « 718/718 globaux réexécutés après la dernière correction » : la suite globale n’a pas été relancée inutilement après la correction ciblée.

Méthode à conserver pour les prochains lots :

- pendant les corrections, exécuter d’abord les tests strictement concernés ;
- regrouper les corrections par cause racine ;
- éviter les micro-corrections test par test ;
- n’exécuter une gate globale que lorsqu’elle apporte une vraie valeur de validation de fin de lot / release.

---

## 4. D-011 — Design System Core

`D-011` reste **VALIDÉ** dans `docs/DEBT.md` et ne doit pas être rouvert automatiquement.

Le chantier récent est un audit / alignement transversal post-D-011, pas une nouvelle sous-phase de D-011.

Architecture de référence :

```text
Design tokens
→ components/ui : primitives du Design System
→ components/shared : compositions réutilisables transversales
→ components/data-display : composants génériques de restitution
→ features/*/components : composants propres aux fonctionnalités
→ pages : assemblage uniquement
```

Le frontend reste Tailwind CSS v4 CSS-first, shadcn/ui + Base UI lorsque pertinent.

Principe : ne pas migrer « vers shadcn » par réflexe. Pour chaque famille de composants, classer :

```text
A. CONFORME
B. WRAPPER LÉGITIME
C. À MIGRER
D. À CONSERVER SPÉCIFIQUE
```

Critères : accessibilité, sécurité, réutilisabilité, maintenance, stabilité API, cohérence visuelle, coût et risque de migration.

---

## 5. Chantier tokens — terminé et fusionné

Le lot tokens n’a pas recréé un système parallèle. Il a industrialisé uniquement les écarts réellement utiles.

`frontend/src/index.css` fournit maintenant notamment :

```text
--radius
--radius-sm / md / lg / xl dérivés

--sidebar
--sidebar-foreground
--sidebar-primary
--sidebar-primary-foreground
--sidebar-accent
--sidebar-accent-foreground
--sidebar-border
--sidebar-ring
```

Les tokens Sidebar aliasent actuellement les tokens sémantiques existants afin de conserver l’identité visuelle du Core, tout en permettant une évolution future indépendante de la navigation.

Décisions à conserver :

- ne pas créer de `tailwind.config.js` pour contourner Tailwind v4 CSS-first ;
- ne pas tokeniser artificiellement chaque `p-5`, `gap-2`, `h-10`, etc. ;
- ne pas créer de nouveaux tokens de padding / spacing sans besoin réellement transverse ;
- ne pas ajouter `chart-1..5` tant qu’un besoin concret n’est pas démontré.

---

## 6. Sidebar / navigation — terminé et fusionné

### 6.1 Contrat de navigation conservé

Le registre n’a pas été reconstruit.

Architecture conservée :

```text
coreWorkspaceNavigation
+
APPLICATION_WORKSPACE_NAVIGATION_MODULES
↓
composeWorkspaceNavigation()
↓
navigation filtrée permissions/features
↓
AppSidebar
```

Le Core reste métier-neutre. Les futurs modules métier déclareront leur navigation au niveau application sans importer leur logique dans le Core.

### 6.2 Renderer partagé

Nouvelle structure :

```text
components/ui/sidebar.jsx
components/ui/collapsible.jsx
components/ui/popover.jsx
components/ui/sheet.jsx
components/shared/app-sidebar.jsx
↓
WorkspaceSidebar
PlatformSidebar
```

Les sidebars Workspace et Platform ne dupliquent plus la mécanique de rendu.

Comportements couverts :

- desktop ouvert ;
- mode réduit en icônes ;
- mobile via Sheet ;
- groupes repliables ;
- route active ;
- tooltips ;
- popovers pour les groupes en mode icône ;
- filtrage permissions / features ;
- fermeture après navigation mobile/flyout ;
- navigation accessible via landmark `<nav>` ;
- comportement clavier et `Escape` selon les primitives utilisées.

Les groupes réduits utilisent le même Tooltip que les liens simples. Le `title` natif du navigateur a été supprimé afin d’éviter un rendu divergent.

Les icônes Platform ont été différenciées pour éviter les doublons sémantiques visibles en mode icône.

Le bug de première lettre de tooltip masquée a été corrigé dans `components/ui/tooltip.jsx` en positionnant correctement la flèche Base UI hors du contenu selon le côté d’affichage.

Ne pas recréer une seconde Sidebar maison lors des prochaines features.

---

## 7. Topbar Platform — état fusionné

L’ancien bouton texte `Personnaliser le tableau de bord` n’occupe plus la zone centrale de la topbar.

Comportement actuel :

```text
[ Recherche globale extensible ] [ Identité utilisateur ] [ Préférences d’affichage ] [ Déconnexion ]
```

### 7.1 Préférences d’affichage

Le contrôle Dashboard reste le composant partagé `DashboardDisplayPreferences`.

Il accepte désormais une variante icône utilisée dans la topbar Platform :

```text
icône SlidersHorizontal
Tooltip : « Préférences d’affichage »
```

La logique de persistance, de preview et de filtrage des widgets n’a pas été dupliquée.

`AuthenticatedUserIdentity` possède un slot `actions` permettant d’insérer proprement les actions contextuelles juste avant `LogoutShortcut`.

### 7.2 Recherche globale extensible

Nouveau composant partagé :

```text
frontend/src/components/shared/expandable-search.jsx
```

Responsabilité actuelle : UI uniquement.

- loupe visible au repos ;
- clic → champ qui s’élargit avec transition fluide ;
- focus automatique ;
- `Escape` peut replier le champ lorsque son état le permet ;
- contrat `onSearch` optionnel pour permettre plus tard le branchement de moteurs métier.

Le Core **ne doit pas inventer aujourd’hui de recherche métier**. Quand les modules métier existeront, ils pourront fournir leurs sources / providers de recherche sans rendre la topbar dépendante d’un domaine précis.

État local : `useState`, car l’ouverture du champ n’est ni une donnée serveur ni un état global applicatif.

---

## 8. D-020 — Invitation commerciale

D-020 reste **EN COURS** dans `docs/DEBT.md`.

Le parcours nominal est déjà intégré et validé jusqu’à :

```text
invitation
→ preview
→ inscription / connexion
→ acceptation
→ premier workspace
→ Owner
→ Plan privé effectif
```

Contrôles manuels négatifs restant à confirmer avant passage à `VALIDÉ` :

```text
mauvaise identité
→ aucune création/acceptation indue

refus bénéficiaire
→ invitation declined
→ acceptation ultérieure impossible
→ secret runtime nettoyé
→ session courante fermée comme prévu
```

D-020 doit être clôturée ou explicitement reclassifiée avant D-015.

---

## 9. Blocs validés à ne pas rouvrir sans écart démontré

```text
D-001 fermeture Account / Workspace                    VALIDÉ
D-011 Design System + préférences                      VALIDÉ
D-014 points d’extension métier                        VALIDÉ
D-018 Équipe Platform / RBAC / invitations             VALIDÉ
D-019 moteur sécurisé de rétention / purge Core        VALIDÉ
DOC-CODE-1 documentation source                        VALIDÉ
D-021 sécurité Auth / invitations / tokens temporaires VALIDÉ
D-022 intégrité Entitlement Override Groups            VALIDÉ
```

Google SSO reste volontairement dans D-010 et ne bloque pas Core 1.0.

---

## 10. Audit transversal shadcn/ui / Base UI — reste à faire

Le chantier n’est **pas terminé globalement** : seule la partie tokens + Sidebar/navigation + ajustements de shell/topbar a été traitée.

Ne pas réauditer immédiatement Sidebar/tokens sauf régression concrète.

La prochaine conversation doit poursuivre l’audit **sans modification dans un premier temps** sur les familles restantes.

Priorité recommandée :

```text
1. DataTable partagé + primitive table
2. DataPagination
3. Dialog / modal / confirmations
4. Drawer / Sheet / panneaux latéraux
5. formulaires partagés
6. Input / Textarea / Select / Checkbox / Switch
7. Dropdown menus
8. Tooltip / Popover / Accordion / Tabs restants
9. Badge / StatusBadge
10. inventaire des primitives HTML/React directes dans pages/features
```

Pour chaque famille :

- identifier le composant réel ;
- repérer les duplications ;
- vérifier si une primitive shadcn/Base UI existe déjà ;
- vérifier accessibilité clavier/ARIA/focus ;
- vérifier Design Tokens ;
- classer `CONFORME / WRAPPER LÉGITIME / À MIGRER / À CONSERVER SPÉCIFIQUE` ;
- justifier objectivement ;
- attendre validation utilisateur avant d’écrire du code.

Point particulièrement important : le `DataTable` partagé est obligatoire pour les tableaux applicatifs. L’audit doit chercher à consolider sa primitive et sa maintenance, pas créer plusieurs tables concurrentes.

---

## 11. Autres chantiers à garder séparés

Ne pas mélanger ces sujets à l’audit UI restant :

```text
A. gouvernance de conservation des données / suppression contrôlée d’historiques
B. reset reproductible de la base de développement
C. clôture manuelle négative D-020
D. D-015 versionnement / provenance / releases / migrations
E. D-016 Playwright E2E Core
F. D-002 corbeille / restauration Files
G. D-017 dérivation + upgrade pilote
```

Roadmap canonique active selon `docs/DEBT.md` :

```text
D-020 → à clôturer/reclassifier
D-015 → PLANIFIÉ
D-016 → PLANIFIÉ
D-002 → PLANIFIÉ
D-017 → PLANIFIÉ
```

D-002 doit être VALIDÉ avant D-017 et avant la première dérivation métier.

---

## 12. Règles de travail pour la prochaine conversation

Conserver impérativement :

- travailler à partir de `main` ;
- vérifier HEAD avant toute conclusion ;
- code + DB + tests réellement exécutés priment sur les synthèses ;
- ne pas générer de snippets sauvages ;
- réutilisabilité frontend obligatoire ;
- shadcn/ui est la base du Design System lorsqu’une primitive générique adaptée existe ;
- un wrapper custom est acceptable s’il apporte une vraie valeur ;
- ne pas modifier hors périmètre ;
- ne pas transformer un audit en migration massive automatique ;
- expliquer avant d’implémenter ;
- regrouper les corrections par cause racine ;
- éviter les mini-lots intempestifs ;
- pendant une correction, exécuter les tests ciblés concernés plutôt que toute la suite ;
- gate globale uniquement au moment utile de validation finale du lot.

Gestion d’état :

```text
useState        → état UI local
Redux Toolkit   → état client global
RTK Query       → état serveur
```

---

## 13. Amorçage recommandé du prochain chantier

La prochaine conversation doit reprendre **le reste de l’audit transversal UI**, pas recommencer Sidebar/tokens.

Premières actions :

```text
1. se connecter au dépôt greg44500/saas-core-api ;
2. travailler à partir de main ;
3. vérifier le HEAD réel de main ;
4. lire docs/REPRISE-CURRENT.md ;
5. lire docs/DEBT.md, en particulier D-011 et l’ordre D-020 → D-015 → D-016 → D-002 → D-017 ;
6. constater que PR #11 a déjà traité tokens + Sidebar + Topbar ;
7. auditer sans modification les primitives restantes ;
8. commencer par DataTable/DataPagination car leur réutilisabilité est structurante ;
9. produire une matrice de conformité complète et priorisée ;
10. attendre validation utilisateur avant toute nouvelle branche d’implémentation.
```

Le présent document est une synthèse de reprise et non une source supérieure au code, aux tests ou aux contrats canoniques.
