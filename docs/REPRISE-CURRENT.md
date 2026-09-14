# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état du Core au **2026-09-14** après la consolidation DataTable/DataPagination, la migration DLG-1 de `ConfirmationDialog` vers Base UI et le lancement du lot transversal d’harmonisation des `Select`.
>
> Le code actuel, les contraintes de base de données, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
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

HEAD distant vérifié au moment de cette mise à jour :

```text
b7a89d088738d087874ec2e1f9496f9ed80bfd7d
test(frontend): cover pending dialog closure lock
```

Ce HEAD contient notamment :

- l’harmonisation DataTable/DataPagination ;
- le correctif du mock backend `workspaceOwnership.security.integration.test.js` ;
- DLG-1 : primitive Dialog Base UI + migration de `ConfirmationDialog` ;
- le verrouillage de fermeture du Dialog pendant `pending`.

### Branche de travail courante

```text
feature/select-base-ui-harmonization
```

HEAD fonctionnel avant la présente mise à jour documentaire :

```text
06fce40f967994e5d094ae6d4ecc6bb2d12b37b5
test(frontend): adapt subscription page Base UI selects
```

Cette branche a été créée depuis `main` à `b7a89d...`.

Toute nouvelle conversation doit vérifier le HEAD réel de `main` **et** le HEAD réel de la branche de travail avant toute conclusion.

---

## 3. Validations réellement constatées

### 3.1 DLG-1 — validé puis fusionné dans `main`

Le lot Dialog DLG-1 a été validé localement par l’utilisateur avant fusion.

Résultat frontend global communiqué :

```text
Test Files  221 passed (221)
Tests       741 passed (741)
```

Les gates finales communiquées comme vertes :

```text
frontend npm run lint   → VERT
frontend npm test       → VERT
frontend npm run build  → VERT
backend npm run lint    → VERT
backend npm test        → VERT
```

La migration DLG-1 a ensuite été fusionnée dans `main`.

### 3.2 Lot Select — validation EN COURS

Après le premier bloc de migration Select, le lint global a réellement été exécuté et a remonté :

```text
5 errors
9 warnings
```

Les 5 erreurs avaient une même catégorie : derniers usages de `<select>` natifs ou ancien import `components/forms/select-field`.

Ils concernaient :

```text
features/files/components/file-upload-dialog.jsx
features/platform/pages/platform-retention-page.jsx
features/platform/pages/platform-subscriptions-page.jsx
features/workspace/components/workspace-switcher.jsx
```

Ces erreurs ont ensuite été corrigées sur la branche distante.

**Important : la relance du lint après ces corrections n’a pas encore été communiquée.**

Le résultat attendu, mais non encore validé localement, est :

```text
0 error
9 warnings
```

Ne pas déclarer le lot Select validé tant que les relances ci-dessous ne sont pas réellement vertes.

### 3.3 Warnings actuellement connus et hors périmètre Select

Les 9 warnings observés sont des warnings `react-hooks/exhaustive-deps`, actuellement dans :

```text
platform-entitlement-override-form.jsx     3 warnings
platform-retention-policy-form.jsx         1 warning
platform-role-form-drawer.jsx              2 warnings
platform-roles-section.jsx                 1 warning
workspace-ownership-section.jsx            2 warnings
```

Ils ne sont pas à corriger opportunément dans le lot Select. Ils doivent faire l’objet d’un nettoyage dédié afin de ne pas mélanger une refactorisation de dépendances React avec l’harmonisation des composants UI.

---

## 4. Architecture frontend à préserver

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
- pas de primitive générique dupliquée localement dans une feature.

Classification utilisée pendant l’audit transversal :

```text
A. CONFORME
B. WRAPPER LÉGITIME
C. À MIGRER
D. À CONSERVER SPÉCIFIQUE
```

Une migration vers shadcn/Base UI doit résoudre un problème réel de cohérence, accessibilité ou maintenance ; elle ne doit pas être faite uniquement pour uniformiser le nom des fichiers.

---

## 5. DataTable / DataPagination — consolidés

Le lot transversal DataTable/DataPagination a été terminé et fusionné avant DLG-1.

### DataTable

Le `DataTable` partagé reste la seule abstraction de table applicative générique.

Décision maintenue :

```text
components/data-display/data-table.jsx
→ table sémantique centralisée
→ pas de duplication d’un wrapper ui/table inutile
```

Les états serveur, RTK Query, erreurs et chargements ne doivent pas être injectés dans `DataTable`. Le composant reste structurel et présentatif.

### DataPagination

Le composant partagé fournit l’affichage harmonisé :

```text
Afficher [10] par page
Page x sur y · n résultats
Précédent / Suivant
```

Configuration frontend canonique :

```text
10 / 20 / 50 / 100
```

Elle reste compatible avec la validation backend `limit <= 100`.

Le hook partagé :

```text
useDataPagination()
```

porte l’état local `page/pageSize` et remet la page à 1 lorsqu’on change la taille de page.

Les pages URL-backed continuent à encoder `page/limit` dans l’URL lorsqu’il s’agit d’un vrai état de navigation.

Exception documentée : certains catalogues complets réutilisés par des sélecteurs peuvent rester client-side lorsqu’une pagination serveur casserait leur contrat fonctionnel.

---

## 6. Dialog — DLG-1 terminé, suite encore à faire

### 6.1 Architecture validée

La cible est :

```text
features
→ wrappers de confirmation métier
→ ConfirmationDialog
→ components/ui/dialog.jsx
→ @base-ui/react/dialog
```

`ConfirmationDialog` reste un wrapper partagé légitime : il porte la sémantique d’une confirmation applicative, mais ne réimplémente plus la mécanique bas niveau d’une modale.

### 6.2 DLG-1 livré

Nouveau composant :

```text
frontend/src/components/ui/dialog.jsx
```

Il encapsule les primitives Base UI :

```text
Dialog.Root
Dialog.Trigger
Dialog.Portal
Dialog.Backdrop
Dialog.Popup
Dialog.Title
Dialog.Description
Dialog.Close
```

`ConfirmationDialog` utilise désormais cette primitive partagée.

Base UI porte maintenant :

- focus initial ;
- boucle Tab ;
- restauration du focus ;
- Escape ;
- modalité ;
- verrouillage du scroll.

Contrat UX conservé :

- clic backdrop ne ferme pas la confirmation ;
- Escape ferme lorsque l’action est idle ;
- `pending === true` bloque fermeture et double action ;
- le bouton Annuler reçoit le focus initial.

### 6.3 `use-dialog-focus.js`

Le hook manuel n’a **pas** été supprimé du dépôt.

Il n’est plus utilisé par `ConfirmationDialog`, mais il reste requis par :

```text
components/shared/entity-details-drawer.jsx
```

Sa suppression appartient au futur chantier Drawer/Sheet, pas à DLG-1.

### 6.4 DLG-2 reste à faire

DLG-1 ne signifie pas que tous les dialogs du frontend ont été migrés.

Il reste à inventorier les shells modaux custom et à les classer :

```text
CONFORME
WRAPPER LÉGITIME
À MIGRER
À CONSERVER SPÉCIFIQUE
```

Exemple déjà visible : `FileUploadDialog` possède encore son propre shell de modale. Le lot Select a uniquement migré son champ Catégorie ; il n’a volontairement pas refactoré son Dialog.

---

## 7. Toast — audité, pas encore migré

Le frontend possède actuellement :

```text
components/shared/toast-provider.jsx
```

avec un moteur maison basé sur contexte React, tableau de notifications et timers.

Décision d’architecture validée :

```text
features
→ useToast() / adapter applicatif
→ components/ui/toast.jsx
→ Base UI Toast
```

La migration doit préserver l’API applicative autant que possible :

```text
toast({
  title,
  description,
  variant,
})
```

Variantes à conserver :

```text
success
error
a.k.a destructive selon adaptation interne
warning
info
```

Ne pas remplacer les erreurs de validation de champs par des toasts : elles restent inline.

Ne pas ajouter Sonner sans besoin concret. Le projet possède déjà Base UI et shadcn fournit désormais un Toast Base UI natif adapté à cette architecture.

Le lot Toast doit être traité séparément après la consolidation Dialog restante.

---

## 8. Select — lot transversal actuellement EN COURS

### 8.1 Problème identifié

Une inspection visuelle des journaux d’audit Platform a révélé que les filtres :

```text
Action
Ressource
Statut
```

utilisaient encore des `<select>` HTML natifs, visuellement et comportementalement différents des Select Base UI déjà utilisés ailleurs.

Le problème était plus large : plusieurs générations de Select coexistaient dans le frontend.

### 8.2 Architecture canonique retenue

Primitive bas niveau :

```text
frontend/src/components/ui/select.jsx
→ @base-ui/react/select
```

Wrapper partagé pour les listes simples avec label, hint et erreur :

```text
frontend/src/components/shared/select-field.jsx
```

Architecture :

```text
features
→ SelectField partagé
→ components/ui/select.jsx
→ Base UI Select
```

ou, pour un composant transversal qui ne correspond pas à un champ de formulaire classique :

```text
feature/shared component
→ components/ui/select.jsx directement
```

Les catalogues volumineux avec recherche/groupes peuvent utiliser une abstraction spécialisée telle que `GroupedSearchSelect`, à condition de rester fondés sur les primitives canoniques et de ne pas réintroduire un `<select>` natif concurrent.

### 8.3 Ancien composant supprimé

L’ancien :

```text
frontend/src/components/forms/select-field.jsx
```

était encore un wrapper de `<select>` natif.

Il a été supprimé avec son test afin d’éviter deux `SelectField` concurrents.

Le wrapper canonique est désormais :

```text
@/components/shared/select-field
```

### 8.4 Protection ESLint ajoutée

Le lint frontend contient maintenant une règle qui interdit les `<select>` natifs dans `src` et une règle qui interdit l’ancien import `@/components/forms/select-field`.

Objectif : empêcher le retour silencieux de Select HTML natifs à mesure que le Core est dérivé.

### 8.5 Surfaces migrées dans le lot courant

Le lot courant couvre notamment :

```text
Audit logs Platform
- filtres Action / Ressource / Statut

Commercial invitations
- formulaire de création

Platform invitations
- formulaire d’invitation

Platform metric limits
- sélection du mode limité / illimité

Platform plans
- capabilities / formulaires de plan

Platform subscriptions
- édition commerciale
- attribution d’un trial
- mode d’annulation

Platform team
- rôles / membres selon usages concernés

Workspace members
- rôle / filtres concernés

Files
- catégorie du fichier dans FileUploadDialog

Retention
- cible de rétention

WorkspaceSwitcher
- sélection du workspace actif
```

### 8.6 Tests Base UI

Les Select Base UI ne sont pas des `<select>` HTML.

Dans les tests React Testing Library, éviter :

```text
user.selectOptions(...)
```

pour ces composants.

Pattern attendu :

```text
click combobox
→ click option
→ assertion sur le résultat métier
```

Des tests concernés ont déjà été adaptés dans la branche.

### 8.7 État exact avant reprise

Dernier lint réellement exécuté avant les toutes dernières corrections :

```text
5 errors
9 warnings
```

Les 5 errors ont été corrigées ensuite, mais la relance n’a pas encore été fournie.

Première action obligatoire de la prochaine conversation :

```bash
cd frontend
npm run lint
```

Si le résultat est :

```text
0 error
9 warnings
```

alors le scan global prouve qu’aucun `<select>` natif interdit et aucun ancien import `components/forms/select-field` ne subsiste dans le frontend.

Ensuite seulement : tests ciblés, suite frontend globale, build et validation visuelle.

---

## 9. UX des textes pédagogiques

Règle validée :

```text
information secondaire / pédagogique
→ InfoTooltip `(i)`

conséquence importante d’une action
→ reste visible

opération sensible / destructive
→ explication visible obligatoire
```

Cette règle reste active pendant l’audit transversal UI.

Ne pas transformer systématiquement toutes les descriptions en tooltips.

---

## 10. Transfert de propriété et D-023

Le transfert de propriété demeure une capacité exceptionnelle gouvernée.

Mécanisme actuel :

```text
Super administrateur Platform
→ permission réservée
→ autorisation temporaire d’un workspace
→ TTL serveur
→ révocation possible

owner courant
→ workflow visible uniquement si autorisation active
→ choix de la cible
→ choix du rôle de remplacement
→ confirmation
→ mot de passe courant
→ validation backend
→ transfert transactionnel
→ autorisation single-use consommée
→ audit
```

TTL serveur :

```text
WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_TTL_HOURS
```

Défaut 24 h, maximum absolu 24 h, calculé par le backend.

### D-023

```text
D-023 — Demande gouvernée de capacité exceptionnelle de transfert de propriété
Statut : DIFFÉRÉ
Cible : Core 1.1
Blocage Core 1.0 : non
```

D-023 ne doit pas être implémentée pendant l’audit UI actuel sauf décision explicite de changement de roadmap.

---

## 11. Dettes et roadmap Core 1.0

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

Roadmap canonique :

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

D-002 doit être VALIDÉ avant D-017 et avant la première dérivation métier.

---

## 12. Audit transversal UI — état et ordre de reprise

Lots désormais consolidés :

```text
Design Tokens / D-011
Sidebar / navigation
Topbars
DataTable
DataPagination
Dialog DLG-1 / ConfirmationDialog
Select : EN COURS, à valider avant fusion
```

Ordre recommandé après validation du lot Select :

```text
1. terminer Dialog DLG-2 : inventaire des shells modaux custom restants
2. migrer Toast vers la primitive Base UI/shadcn en conservant useToast()
3. auditer Drawer / Sheet / panneaux latéraux
4. auditer formulaires partagés
5. auditer Input / Textarea / Checkbox / Switch
6. auditer Dropdown menus
7. auditer Tooltip / Popover / Accordion / Tabs restants
8. auditer Badge / StatusBadge
9. auditer les primitives HTML/React directes restantes dans pages/features
```

Le chantier Select a été traité avant DLG-2 parce qu’une incohérence visuelle concrète a été découverte dans Platform > Journaux d’audit. Ce changement d’ordre ne modifie pas la roadmap globale.

Pour chaque famille :

- inventorier les usages réels ;
- détecter les duplications ;
- vérifier clavier, focus, ARIA ;
- vérifier les Design Tokens ;
- vérifier API, composition et testabilité ;
- classer `CONFORME / WRAPPER LÉGITIME / À MIGRER / À CONSERVER SPÉCIFIQUE` ;
- distinguer problème réel et préférence stylistique ;
- proposer un lot cohérent ;
- ne pas mélanger plusieurs familles dans une même migration sauf dépendance réelle.

---

## 13. Chantiers à garder séparés

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
I. nettoyage des 9 warnings React Hooks connus
```

Le nettoyage des warnings React Hooks peut devenir un lot technique dédié, mais ne doit pas être glissé silencieusement dans une migration Select/Dialog/Drawer.

---

## 14. Règles de travail à conserver

- vérifier branche et HEAD avant toute modification ;
- code + DB + tests réellement exécutés priment sur la synthèse ;
- JavaScript uniquement ;
- validation stricte des données ;
- composants réutilisables obligatoires ;
- DataTable partagé obligatoire pour les tableaux applicatifs ;
- shadcn/ui/Base UI comme primitives génériques lorsque pertinent ;
- wrappers applicatifs conservés lorsqu’ils apportent une responsabilité réelle ;
- ne jamais créer une seconde primitive concurrente sans justification ;
- aucun snippet sauvage ;
- aucun changement hors périmètre ;
- expliquer avant d’implémenter ;
- corrections regroupées par cause racine ;
- si plusieurs tests échouent sur la même erreur structurelle, traiter la cause commune en bloc avant de corriger fichier par fichier ;
- tests ciblés pendant la correction ;
- gate globale seulement au moment utile de validation finale ;
- ne jamais annoncer une gate verte sur la base d’un résultat non exécuté.

---

## 15. Prochaine action exacte

La prochaine conversation doit **reprendre la branche `feature/select-base-ui-harmonization`**, et non démarrer un nouveau lot immédiatement.

Séquence :

```text
1. vérifier main et son HEAD ;
2. vérifier feature/select-base-ui-harmonization et son HEAD réel ;
3. lire docs/REPRISE-CURRENT.md ;
4. lire docs/DEBT.md au minimum pour D-020, D-015, D-016, D-002, D-017, D-023 ;
5. ne modifier aucun fichier avant de connaître le résultat des validations ;
6. demander / exécuter npm run lint dans frontend ;
7. si 0 error, exécuter les tests ciblés du lot Select ;
8. corriger les éventuels échecs par cause racine, en bloc ;
9. une fois ciblés verts : npm test puis npm run build ;
10. validation visuelle des Select, notamment Platform > Journaux d’audit ;
11. revue finale du diff ;
12. seulement après validation : fusion du lot Select dans main ;
13. ensuite reprendre DLG-2 puis Toast.
```

Le présent fichier est une synthèse de reprise et non une source supérieure au code, aux tests ou aux contrats canoniques.
