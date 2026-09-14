# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état réel du Core au **2026-09-14**, après la consolidation DataTable/DataPagination, la migration DLG-1 de `ConfirmationDialog` vers Base UI et le lot transversal d’harmonisation des `Select`, actuellement **en validation finale**.
>
> Le code actuel, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-14**

---

## 1. Hiérarchie d’autorité

En cas de contradiction :

1. code actuel et contraintes DB ;
2. tests automatisés réellement exécutés et validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. présent fichier de reprise.

Les anciennes synthèses ne sont pas autoritatives lorsqu’elles sont dépassées.

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement prêt pour la production.

---

## 2. État Git de référence

### `main`

Branche de référence :

```text
main
```

HEAD distant vérifié avant la présente mise à jour :

```text
b7a89d088738d087874ec2e1f9496f9ed80bfd7d
test(frontend): cover pending dialog closure lock
```

Ce HEAD contient notamment :

- Design System / D-011 validé ;
- Sidebar/navigation et Topbars consolidées ;
- DataTable partagé ;
- DataPagination partagé ;
- correctif du mock backend `workspaceOwnership.security.integration.test.js` ;
- DLG-1 : primitive `components/ui/dialog.jsx` Base UI ;
- migration de `ConfirmationDialog` ;
- verrouillage de fermeture du Dialog pendant `pending`.

### Branche de travail courante

```text
feature/select-base-ui-harmonization
```

HEAD fonctionnel juste avant cette mise à jour documentaire :

```text
93fda262ed0da03d41eab497cb5d3a2ac004a023
test(frontend): align remaining select tests with Base UI
```

Cette branche part de `main` à `b7a89d...` et ne doit pas être fusionnée tant que la gate frontend globale n’est pas réellement verte.

Toute nouvelle conversation doit vérifier le HEAD réel de `main` et celui de la branche de travail avant toute conclusion.

---

## 3. Validations réellement constatées

### 3.1 DLG-1 — VALIDÉ et fusionné

Le lot Dialog DLG-1 a été validé localement par l’utilisateur puis fusionné dans `main`.

Résultat frontend global communiqué :

```text
Test Files  221 passed (221)
Tests       741 passed (741)
```

Gates communiquées comme vertes :

```text
frontend npm run lint   → VERT
frontend npm test       → VERT
frontend npm run build  → VERT
backend npm run lint    → VERT
backend npm test        → VERT
```

Ne pas rouvrir DLG-1 sans régression concrète.

### 3.2 Lot Select — EN COURS, non encore validé

Le premier lint global du lot Select avait produit :

```text
5 errors
9 warnings
```

Les 5 erreurs correspondaient aux derniers `<select>` natifs ou à l’ancien import `components/forms/select-field` dans :

```text
features/files/components/file-upload-dialog.jsx
features/platform/pages/platform-retention-page.jsx
features/platform/pages/platform-subscriptions-page.jsx
features/workspace/components/workspace-switcher.jsx
```

Ces erreurs ont été corrigées dans un bloc cohérent.

Une suite frontend globale a ensuite réellement été exécutée et a produit :

```text
Test Files  3 failed | 219 passed (222)
Tests       3 failed | 744 passed (747)
```

Les trois échecs n’étaient pas trois régressions métier indépendantes : ils provenaient de la même transition structurelle des contrôles HTML natifs vers Base UI Select.

Fichiers concernés :

```text
platform-audit-logs-page.test.jsx
platform-plan-form-capabilities.test.jsx
workspace-switcher.test.jsx
```

Causes :

```text
1. Audit Logs
   le test cherchait directement un role="option" alors que le popup Base UI
   n’est exposé qu’après ouverture du combobox.

2. Plan capabilities
   le test utilisait encore user.selectOptions(), API adaptée aux <select>
   natifs mais pas au Select Base UI.

3. WorkspaceSwitcher
   le test dépendait d’une interaction popup/portal fragile sous jsdom ;
   le composant était bien migré mais le scénario de test devait adopter
   une interaction Base UI accessible.
```

Correction effectuée **en un seul bloc** dans :

```text
93fda262ed0da03d41eab497cb5d3a2ac004a023
test(frontend): align remaining select tests with Base UI
```

Aucun test individuel ne doit être utilisé pour valider ce bloc. La prochaine validation doit être la gate frontend globale.

**Important : aucune gate globale verte postérieure au commit `93fda262...` n’a encore été communiquée.**

Le lot Select ne doit donc pas être déclaré validé ou fusionnable à ce stade.

### 3.3 Warnings React Hooks connus — hors périmètre Select

Les 9 warnings observés précédemment sont des `react-hooks/exhaustive-deps` dans :

```text
platform-entitlement-override-form.jsx     3
platform-retention-policy-form.jsx         1
platform-role-form-drawer.jsx              2
platform-roles-section.jsx                 1
workspace-ownership-section.jsx            2
```

Ils doivent rester hors du lot Select sauf s’ils deviennent réellement bloquants.

Un nettoyage dédié pourra être planifié ensuite ; ne pas mélanger silencieusement refactorisation de hooks et migration UI.

---

## 4. Méthode de correction des tests — règle explicite

Décision de travail à conserver :

```text
plusieurs FAILS
→ analyser toute la sortie
→ regrouper par cause racine
→ corriger la famille complète en un bloc
→ relancer une gate globale cohérente
```

À éviter :

```text
FAIL 1 → correction → test individuel
FAIL 2 → correction → test individuel
FAIL 3 → correction → test individuel
```

Lorsque plusieurs tests échouent à cause d’une migration structurelle commune, les traiter un par un masque la cohérence du problème et augmente le risque d’oublier des usages.

Pour le lot Select actuel, la validation demandée est donc :

```bash
cd frontend
npm run lint
npm test
npm run build
```

Si `npm test` remonte encore plusieurs FAILS, récupérer la sortie complète et traiter toutes les causes communes en un nouveau bloc avant toute nouvelle exécution globale.

---

## 5. Architecture frontend à préserver

Architecture de référence :

```text
Design tokens
→ components/ui
→ components/shared
→ components/forms / components/data-display
→ features/*/components
→ pages = assemblage
```

Principes obligatoires :

- JavaScript uniquement ;
- Tailwind CSS v4 CSS-first ;
- shadcn/ui + Base UI pour les primitives génériques lorsqu’ils sont pertinents ;
- composants partagés pour les comportements transversaux ;
- composants feature pour le métier ;
- pages sans logique métier lourde ;
- RTK Query pour l’état serveur ;
- Redux Toolkit pour l’état global client ;
- `useState` pour l’état local ;
- composants réutilisables obligatoires ;
- aucune primitive générique concurrente recréée localement sans justification.

Classification de l’audit transversal :

```text
A. CONFORME
B. WRAPPER LÉGITIME
C. À MIGRER
D. À CONSERVER SPÉCIFIQUE
```

Une migration shadcn/Base UI doit résoudre un problème réel de cohérence, accessibilité ou maintenance, pas seulement uniformiser les noms de fichiers.

---

## 6. DataTable / DataPagination — consolidés

### DataTable

Le `DataTable` partagé reste l’abstraction unique de table applicative générique.

```text
components/data-display/data-table.jsx
→ table sémantique centralisée
→ pas de wrapper ui/table concurrent inutile
```

Les états RTK Query, erreurs serveur et chargements restent dans les features/pages ; `DataTable` reste structurel et présentatif.

### DataPagination

Affichage harmonisé :

```text
Afficher [10] par page
Page x sur y · n résultats
Précédent / Suivant
```

Tailles autorisées :

```text
10 / 20 / 50 / 100
```

Le hook partagé `useDataPagination()` gère `page/pageSize` localement et remet la page à 1 lors d’un changement de taille.

Les pages réellement URL-backed conservent `page/limit` dans l’URL.

---

## 7. Dialog — DLG-1 terminé, DLG-2 à faire

Architecture validée :

```text
features
→ wrappers métier
→ ConfirmationDialog
→ components/ui/dialog.jsx
→ @base-ui/react/dialog
```

Base UI porte maintenant :

- focus initial ;
- boucle Tab ;
- restauration du focus ;
- Escape ;
- modalité ;
- verrouillage du scroll.

Contrat `ConfirmationDialog` :

- clic backdrop ne ferme pas ;
- Escape ferme lorsque idle ;
- `pending === true` bloque fermeture et double action ;
- Annuler reçoit le focus initial.

`use-dialog-focus.js` doit rester tant que `EntityDetailsDrawer` l’utilise.

DLG-2 doit ensuite inventorier les shells modaux custom restants. Exemple déjà identifié : `FileUploadDialog` possède encore son propre shell de modale ; le lot Select n’a migré que son champ Catégorie.

---

## 8. Toast — audité, non migré

État actuel :

```text
components/shared/toast-provider.jsx
```

Cible validée :

```text
features
→ useToast() / adapter
→ components/ui/toast.jsx
→ Base UI Toast
```

Conserver autant que possible :

```text
toast({ title, description, variant })
```

Variantes fonctionnelles à préserver : success, error/destructive, warning, info.

Les erreurs de validation de champs restent inline.

Ne pas ajouter Sonner sans besoin concret : Base UI est déjà présent et la primitive shadcn/Base UI est adaptée au projet.

---

## 9. Select — architecture canonique et état du lot

### 9.1 Architecture

Primitive :

```text
frontend/src/components/ui/select.jsx
→ @base-ui/react/select
```

Wrapper partagé des listes simples :

```text
frontend/src/components/shared/select-field.jsx
```

Flux habituel :

```text
features
→ SelectField
→ ui/select.jsx
→ Base UI Select
```

Pour un composant transversal qui n’est pas un champ de formulaire classique :

```text
feature/shared component
→ ui/select.jsx directement
```

Les gros catalogues avec recherche/groupes peuvent conserver une abstraction spécialisée telle que `GroupedSearchSelect`, à condition qu’elle n’introduise pas un `<select>` natif concurrent.

### 9.2 Ancien composant supprimé

Ancien wrapper natif supprimé :

```text
components/forms/select-field.jsx
components/forms/select-field.test.jsx
```

Wrapper canonique :

```text
@/components/shared/select-field
```

### 9.3 Garde ESLint

Le frontend possède maintenant des règles interdisant :

```text
<select> natif dans src
import depuis @/components/forms/select-field
```

L’objectif est d’éviter la réintroduction silencieuse d’une seconde génération de Select lors des futures dérivations du Core.

### 9.4 Surfaces migrées

Le lot couvre notamment :

```text
Audit Logs Platform
- Action
- Ressource
- Statut

Commercial invitations
Platform invitations
Platform metric limits
Platform plans / capabilities
Platform subscriptions
- édition commerciale
- attribution trial
- mode d’annulation
Platform team
Workspace members
Files
- catégorie d’upload
Retention
- cible de rétention
WorkspaceSwitcher
- workspace actif
```

### 9.5 Règle de test Base UI

Un Select Base UI n’est pas un `<select>` natif.

Ne pas supposer que :

```text
user.selectOptions(...)
```

fonctionnera.

Scénarios préférés :

```text
combobox
→ ouverture / clavier accessible
→ choix d’une option
→ assertion métier
```

Sous jsdom, ne pas écrire un test qui dépend inutilement du positionnement visuel d’un Portal Base UI.

---

## 10. UX des textes pédagogiques

Règle validée :

```text
information secondaire / pédagogique
→ InfoTooltip

conséquence importante d’une action
→ reste visible

opération sensible / destructive
→ explication visible obligatoire
```

Ne pas transformer toutes les descriptions en tooltips.

---

## 11. Ownership transfer et D-023

Le transfert de propriété reste une capacité exceptionnelle gouvernée.

Mécanisme actuel :

```text
Super administrateur Platform
→ permission réservée
→ autorisation temporaire d’un workspace
→ TTL serveur
→ révocation possible

owner courant
→ workflow disponible uniquement si autorisation active
→ cible + rôle de remplacement
→ confirmation + mot de passe
→ validation backend
→ transfert transactionnel
→ single-use
→ audit
```

TTL :

```text
WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_TTL_HOURS
```

Défaut 24 h, maximum absolu 24 h, calculé côté backend.

D-023 :

```text
Demande gouvernée de capacité exceptionnelle de transfert
Statut : DIFFÉRÉ
Cible : Core 1.1
Blocage Core 1.0 : non
```

Ne pas implémenter D-023 pendant l’audit UI actuel sauf décision explicite de changement de roadmap.

---

## 12. Dettes et roadmap Core 1.0

État canonique selon `docs/DEBT.md` :

```text
D-020  EN COURS
D-011  VALIDÉ
D-021  VALIDÉ
D-022  VALIDÉ
D-015  PLANIFIÉ
D-016  PLANIFIÉ
D-002  PLANIFIÉ
D-017  PLANIFIÉ
D-023  DIFFÉRÉ — Core 1.1
```

D-020 doit être clôturée ou explicitement reclassifiée avant D-015.

Roadmap :

```text
D-020 → clôturer ou reclassifier
D-015 → versionnement / provenance / releases / migrations
D-016 → Playwright E2E Core
D-002 → corbeille / restauration Files
→ audit final architecture / sécurité / qualité
D-017 → dérivation + upgrade pilote
→ tag Core stable

post-v1.0 :
D-023 → workflow gouverné de transfert
```

D-002 doit être VALIDÉ avant D-017 et la première dérivation métier.

---

## 13. Audit transversal UI — ordre après le lot Select

Lots consolidés :

```text
Design Tokens / D-011
Sidebar / navigation
Topbars
DataTable
DataPagination
Dialog DLG-1 / ConfirmationDialog
```

Lot courant :

```text
Select — EN COURS DE VALIDATION
```

Ordre recommandé après validation et fusion Select :

```text
1. DLG-2 : shells modaux custom restants
2. Toast Base UI/shadcn en conservant useToast()
3. Drawer / Sheet / panneaux latéraux
4. formulaires partagés
5. Input / Textarea / Checkbox / Switch
6. Dropdown menus
7. Tooltip / Popover / Accordion / Tabs
8. Badge / StatusBadge
9. primitives HTML/React directes restantes
```

Pour chaque famille : inventorier, détecter les duplications, vérifier clavier/focus/ARIA, vérifier tokens, API et testabilité, puis classer avant toute migration.

---

## 14. Chantiers à garder séparés

Ne pas mélanger au chantier UI :

```text
A. D-023 workflow ownership Core 1.1
B. gouvernance juridique de conservation des données
C. reset reproductible de la base de développement
D. validation négative finale D-020
E. D-015 versionnement / provenance / releases
F. D-016 Playwright E2E Core
G. D-002 corbeille / restauration Files
H. D-017 dérivation + upgrade pilote
I. nettoyage des warnings React Hooks connus
```

---

## 15. Règles de travail à conserver

- vérifier branche et HEAD avant modification ;
- code + DB + tests réellement exécutés priment sur la synthèse ;
- JavaScript uniquement ;
- validation stricte des données ;
- composants réutilisables obligatoires ;
- DataTable partagé obligatoire pour les tableaux applicatifs ;
- shadcn/ui/Base UI comme primitives génériques lorsque pertinent ;
- wrappers applicatifs conservés lorsqu’ils apportent une responsabilité réelle ;
- aucune primitive concurrente sans justification ;
- aucun changement hors périmètre ;
- expliquer avant d’implémenter ;
- plusieurs FAILS d’une même famille = analyse globale + correction en bloc ;
- ne pas enchaîner les tests individuels fail par fail ;
- gate globale après un bloc de correction transversal ;
- ne jamais annoncer une gate verte sans résultat réellement exécuté.

---

## 16. Prochaine action exacte

La prochaine conversation doit reprendre :

```text
feature/select-base-ui-harmonization
```

et **ne pas démarrer DLG-2 avant d’avoir clôturé le lot Select**.

Séquence obligatoire :

```text
1. vérifier le HEAD réel de main ;
2. vérifier le HEAD réel de feature/select-base-ui-harmonization ;
3. lire intégralement docs/REPRISE-CURRENT.md ;
4. lire docs/DEBT.md au minimum pour D-020, D-015, D-016, D-002, D-017, D-023 ;
5. inspecter le diff réel main..feature/select-base-ui-harmonization ;
6. ne rien modifier avant de connaître le résultat de la gate globale ;
7. lancer dans frontend : npm run lint ; npm test ; npm run build ;
8. si plusieurs FAILS apparaissent, collecter toute la sortie et regrouper les causes racines ;
9. effectuer un seul bloc de correction cohérent ;
10. relancer ensuite la gate frontend globale, pas des tests fail par fail ;
11. quand tout est réellement vert : validation visuelle des Select ;
12. revue finale du diff ;
13. fusion dans main ;
14. seulement ensuite reprendre DLG-2 puis Toast.
```

Validation visuelle prioritaire après gate verte :

```text
Platform > Journaux d’audit
WorkspaceSwitcher
Files > catégorie d’upload
Platform Plans / capabilities
Platform Subscriptions
Retention
```

Le présent fichier est une synthèse de reprise et non une source supérieure au code, aux tests ou aux contrats canoniques.
