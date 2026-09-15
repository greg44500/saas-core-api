# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état réel du Core au **2026-09-15** après la fusion de FORM-1 et pendant l’implémentation du lot FORM-2 — alignement des primitives de contrôles de formulaire.
>
> Le code actuel, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-15**

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

HEAD fonctionnel distant vérifié avant la création de FORM-2 :

```text
5cf9e9ea4237a987e06ac611000ef56574a365ef
merge(forms): harmonize shared field architecture
```

Parents du merge FORM-1 :

```text
d80d34b032c5177cda8e1c0e6c3552febfd0ab9f
059616cd86898a2d86bc310edfc5c7f1e962ea0a
```

Ce `main` contient notamment :

- Design System / D-011 validé ;
- Sidebar/navigation et Topbars existantes consolidées ;
- DataTable partagé ;
- DataPagination partagé ;
- DLG-1 : primitive `components/ui/dialog.jsx` Base UI ;
- `ConfirmationDialog` migré sur la primitive canonique ;
- DLG-2 : `FileUploadDialog` migré sur Dialog Base UI ;
- Select Base UI harmonisé ;
- Toast Base UI canonique avec maintien de l’API applicative `useToast()` ;
- Drawer / Sheet : `EntityDetailsDrawer` migré sur la primitive `components/ui/sheet.jsx` basée sur Base UI Dialog ;
- FORM-1 : architecture partagée de champs harmonisée autour de `Field`, `FormField`, `SelectField`, `Input` et `PasswordField` ;
- UX pédagogique Platform/Workspace harmonisée via `InfoTooltip` ;
- projection `featureAvailability` des fonctionnalités Workspace ;
- statuts de souscription Platform alignés sur les tons sémantiques.

### Branche de travail

Le lot actif est :

```text
feature/form-control-primitives-alignment
```

Base exacte de la branche :

```text
5cf9e9ea4237a987e06ac611000ef56574a365ef
```

FORM-2 est **EN COURS**. Le code de cette branche ne doit pas être fusionné dans `main` avant :

```text
tests ciblés réellement exécutés
→ frontend npm test
→ frontend npm run lint
→ frontend npm run build
→ validation visuelle / clavier
→ autorisation explicite de fusion
```

Toute nouvelle conversation doit commencer par vérifier le HEAD réel de `main` et celui de cette branche avant toute conclusion.

---

## 3. Validations réellement constatées

### 3.1 DLG-1 — VALIDÉ et fusionné

Le lot Dialog DLG-1 a été validé localement par l’utilisateur puis fusionné dans `main`.

Ne pas rouvrir DLG-1 sans régression concrète.

### 3.2 Lot Select / UX — VALIDÉ et fusionné

La primitive canonique est :

```text
frontend/src/components/ui/select.jsx
→ @base-ui/react/select
```

Le wrapper partagé canonique est :

```text
frontend/src/components/shared/select-field.jsx
```

L’ancien wrapper a été supprimé et ESLint interdit désormais les régressions principales :

```text
<select> natif dans frontend/src
import depuis @/components/forms/select-field
```

Les tests Base UI utilisent des interactions accessibles de type :

```text
combobox
→ ouverture
→ attente éventuelle du contenu portallé
→ option
→ assertion métier
```

Avant fusion, l’utilisateur a réellement exécuté et communiqué comme vertes les gates suivantes :

```text
frontend npm run lint   → VERT
frontend npm test       → VERT
frontend npm run build  → VERT
backend npm run lint    → VERT
backend npm test        → VERT
```

La validation manuelle/visuelle a également été déclarée conforme.

### 3.3 DLG-2 — VALIDÉ et fusionné

Migration réalisée :

```text
FileUploadDialog
→ components/ui/dialog.jsx
→ @base-ui/react/dialog
```

Base UI porte désormais pour cette modale :

```text
modalité
focus initial
boucle Tab / Shift+Tab
Escape
restauration du focus
verrouillage du scroll
portal / overlay
```

Le contrôle visible `Choisir un fichier` est un vrai bouton clavier déclenchant l’input fichier caché.

L’utilisateur a réellement exécuté et communiqué comme vertes les gates DLG-2 :

```text
frontend npm run lint   → VERT
frontend npm test       → VERT
frontend npm run build  → VERT
```

Aucun fichier backend n’avait été modifié dans ce lot ; le backend n’a donc pas été relancé pour cette gate.

La validation manuelle/clavier a été déclarée conforme : ouverture, focus initial, Tab / Shift+Tab, Escape, blocage de fermeture pendant upload, Select au-dessus de la modale et restauration du focus.

DLG-2 a ensuite été fusionné dans `main`.

### 3.4 Toast Base UI — VALIDÉ et fusionné

Architecture canonique :

```text
features
→ useToast()
→ components/shared/toast-provider.jsx
→ components/ui/toast.jsx
→ @base-ui/react/toast
```

L’API applicative reste :

```text
toast({ title, description, variant, duration })
dismissToast(id)
```

Contrat conservé :

```text
success
error / destructive
warning
info
```

`error` est normalisé vers le type Base UI `destructive`.

Comportements conservés : durée par défaut `5000 ms`, notification persistante pour `duration <= 0`, fermeture manuelle et programmatique, stack sans nouvelle limite produit implicite.

Helper de test partagé :

```text
frontend/src/test/toast-assertions.js
→ findToastByText(...)
→ cible la surface applicative [data-slot="toast"]
```

Après correction globale par cause racine, l’utilisateur a réellement exécuté et communiqué comme vertes les gates finales :

```text
frontend npm test       → VERT — 760 tests
frontend npm run lint   → VERT
frontend npm run build  → VERT
```

Le backend n’a pas été relancé car le lot Toast n’a modifié aucun fichier backend.

La validation manuelle/visuelle a également été déclarée conforme.

HEAD fonctionnel Toast validé avant fusion :

```text
1170b3027558bd5ae07646bc45d9453e118ed5c8
```

Merge dans `main` :

```text
7058d368fcb362267c9f6c8fc0cdb8f9ffe40e83
Merge branch 'feature/toast-base-ui-harmonization'
```

Ne pas rouvrir ce lot sans régression concrète.

### 3.5 Drawer / Sheet / panneaux latéraux — VALIDÉ et fusionné

Audit réalisé avant implémentation :

- `frontend/src/components/ui/sheet.jsx` existait déjà et reposait sur `@base-ui/react/dialog` ;
- `EntityDetailsDrawer` constituait un wrapper partagé légitime mais réimplémentait manuellement Portal, overlay, focus trap, Escape, verrouillage du scroll et restauration du focus ;
- les wrappers métier `MemberDetailsDrawer`, `RoleFormDrawer` et `RolePermissionsDrawer` conservaient une responsabilité métier réelle et ne devaient pas être aplatis ;
- la Sidebar a été explicitement maintenue hors périmètre.

Architecture désormais canonique :

```text
features/*/components
→ EntityDetailsDrawer
→ components/ui/sheet.jsx
→ @base-ui/react/dialog
```

Base UI porte désormais :

```text
Portal
modalité
focus initial
boucle Tab / Shift+Tab
Escape
restauration du focus
verrouillage du scroll
fermeture via Close / backdrop
sémantique dialog
```

Le contrat UI historique a été conservé :

```text
panneau sous la topbar : top-16
largeur : w-full / max-w-xl
transition : 300 ms
backdrop sous la topbar
contenu métier conservé pendant toute la transition de sortie
```

`EntityDetailsDrawer` conserve uniquement le cycle de présence nécessaire aux `300 ms` de fermeture. Il ne réimplémente plus Portal, focus trap, Escape ou restauration du focus.

`components/ui/sheet.jsx` accepte un `overlayClassName` optionnel et transmet la présence contrôlée au Portal afin de permettre au wrapper partagé de préserver ce contrat de sortie sans introduire de comportement métier dans la primitive générique.

Le bouton de fermeture compose `TooltipTrigger → SheetClose → Button` avec les primitives Base UI plutôt qu’un `onClick` modal custom.

Les tests métier ont été découplés des anciennes classes internes `translate-x-0` / `translate-x-full`. Ils vérifient désormais le contrat applicatif : données retenues pendant la fermeture puis démontage final.

La gate a également révélé un test `AuditLogFilters` déjà trop synchrone sur `main`. Le helper attend maintenant l’option portallée avec `findByRole` avant interaction.

L’utilisateur a réellement exécuté et communiqué comme vertes les validations finales :

```text
tests ciblés Drawer / Select   → VERT
frontend npm test              → VERT
frontend npm run lint          → VERT
frontend npm run build         → VERT
validation visuelle/manuelle   → CONFORME
```

Le backend n’a pas été relancé : le lot n’a modifié aucun fichier backend.

HEAD fonctionnel validé avant fusion :

```text
1ff5c4733e30c871ced18b329a95ae84901f69c9
```

Merge dans `main` :

```text
24eb5ae0c4d773fa370821746acef19fb2f9e31e
merge(ui): migrate entity details drawers to Base UI Sheet
```

Ne pas rouvrir ce lot sans régression concrète.

### 3.6 FORM-1 — VALIDÉ et fusionné

FORM-1 a consolidé l’architecture des champs partagés et a été fusionné dans `main` sous :

```text
5cf9e9ea4237a987e06ac611000ef56574a365ef
merge(forms): harmonize shared field architecture
```

Architecture à préserver :

```text
components/ui/field.jsx
→ primitives de structure Field / Label / Description / Error

components/forms/form-field.jsx
→ contrat applicatif label / erreur / hint / info / ARIA

components/shared/select-field.jsx
→ adaptation du Select partagé au même contrat de champ

components/forms/password-field.jsx
→ composant composite reposant sur Input et relayant les attributs ARIA standards
```

Les consommateurs directs de `FormField` ne doivent pas dupliquer manuellement `aria-describedby` et `aria-invalid` lorsque `FormField` peut les injecter. Un composant composite ou un wrapper intermédiaire reste toutefois responsable de relayer ces attributs vers le contrôle réellement interactif.

Ne pas rouvrir FORM-1 sans régression concrète.

### 3.7 FORM-2 — EN COURS, non validé

Périmètre validé avant implémentation :

```text
Input     → primitive native conservée
Textarea  → primitive native conservée
Checkbox  → primitive native conservée
Switch    → moteur migré vers @base-ui/react/switch
```

Décision d’architecture : ne pas migrer mécaniquement Input, Textarea ou Checkbox vers Base UI lorsqu’un contrôle HTML natif satisfait déjà le contrat et conserve une intégration directe avec React Hook Form / formulaires HTML.

Le Switch est différent : la primitive interactive manuelle est remplacée par Base UI tout en conservant l’API applicative `checked`, `disabled`, `id`, `onCheckedChange` et les attributs ARIA.

Travail déjà présent sur la branche FORM-2 :

- `Input`, `Textarea` et `Checkbox` harmonisés avec `data-slot` et états invalides Design System ;
- `Switch` basé sur `@base-ui/react/switch`, rendu comme bouton natif ;
- tests de contrat des quatre primitives ajoutés ;
- `DatePicker` et `DateTimePicker` réutilisent `Input` sans changer parsing ni conversion ISO ;
- contrôles directs remplacés par les primitives partagées dans les formulaires Platform audités ;
- `RoleFormDrawer` Workspace réutilise `Textarea` et `Checkbox` ;
- parcours d’acceptation d’invitations Workspace et Platform alignés sur le contrat ARIA standard de FORM-1 ;
- l’input fichier de `FileUploadDialog` reste volontairement natif et spécifique.

Aucune gate FORM-2 ne doit être considérée verte tant que l’utilisateur ne l’a pas réellement exécutée et communiquée.

### 3.8 Warnings React Hooks connus — hors périmètre

Les warnings `react-hooks/exhaustive-deps` déjà identifiés restent hors de ces migrations sauf régression concrète :

```text
platform-entitlement-override-form.jsx
platform-retention-policy-form.jsx
platform-role-form-drawer.jsx
platform-roles-section.jsx
workspace-ownership-section.jsx
```

Leur nettoyage ne doit pas être mélangé silencieusement à une autre migration UI.

---

## 4. Méthode de correction des tests — règle à conserver

Décision de travail confirmée pendant les migrations Base UI :

```text
plusieurs FAILS
→ récupérer la sortie complète
→ analyser toute la famille
→ regrouper par cause racine
→ corriger en un bloc cohérent
→ relancer une gate globale
```

À éviter :

```text
FAIL 1 → patch isolé
FAIL 2 → patch isolé
FAIL 3 → patch isolé
```

Ne jamais annoncer une gate verte sans résultat réellement exécuté.

Pour les composants Base UI portallés, ne pas supposer que le contenu du popup est disponible de façon synchrone immédiatement après le clic.

Règle de test :

```text
interaction d’ouverture
→ await findByRole(...) si contenu portallé
→ interaction
→ assertion métier
```

Les tests de features doivent viser le contrat applicatif stable et non les classes ou le DOM interne d’une primitive tierce.

Une différence de comportement JSDOM/CSS ne doit pas conduire à supprimer un invariant produit réel : le lot Drawer a confirmé que la rétention du contenu pendant la fermeture faisait partie du contrat partagé et devait rester garantie par le composant.

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
- shadcn/ui + Base UI pour les primitives génériques lorsque pertinent ;
- composants partagés pour les comportements transversaux ;
- composants feature pour le métier ;
- pages sans logique métier lourde ;
- RTK Query pour l’état serveur ;
- Redux Toolkit pour l’état global client ;
- `useState` pour l’état local ;
- composants réutilisables obligatoires ;
- aucune primitive générique concurrente recréée localement sans justification.

Le `DataTable` partagé reste l’abstraction unique pour les tableaux applicatifs génériques.

---

## 6. Dialog / Sheet — primitives canoniques fusionnées

### Dialog

Architecture validée :

```text
features
→ wrappers métier
→ ConfirmationDialog / dialog métier
→ components/ui/dialog.jsx
→ @base-ui/react/dialog
```

DLG-1 a migré `ConfirmationDialog`.

DLG-2 a migré `FileUploadDialog`.

Les wrappers métier utilisant déjà `ConfirmationDialog` restent légitimes lorsqu’ils apportent une responsabilité réelle.

### Sheet / Drawer

Architecture validée :

```text
features
→ wrappers métier Drawer
→ EntityDetailsDrawer
→ components/ui/sheet.jsx
→ @base-ui/react/dialog
```

`EntityDetailsDrawer` ne dépend plus de `use-dialog-focus.js`.

Le fichier `use-dialog-focus.js` ne doit toutefois pas être supprimé sans preuve qu’aucun autre consommateur ne subsiste. Faire un audit de consommateurs avant toute suppression.

La Sidebar reste un chantier distinct : aucune réécriture de Sidebar ne doit être introduite implicitement dans un autre lot.

---

## 7. Toast — architecture canonique fusionnée

Primitive générique :

```text
frontend/src/components/ui/toast.jsx
```

Adapter applicatif :

```text
frontend/src/components/shared/toast-provider.jsx
```

Helper de test partagé :

```text
frontend/src/test/toast-assertions.js
```

Règle : les features continuent d’appeler `useToast()` et ne doivent pas importer directement Base UI Toast.

Les erreurs de validation de champs restent inline.

Ne pas ajouter Sonner ou une seconde infrastructure de toast sans besoin produit démontré.

---

## 8. UX des informations pédagogiques — règle transversale validée

Règle à appliquer sur Platform comme dans les Workspaces :

```text
information secondaire / pédagogique
→ InfoTooltip `(i)`

conséquence importante d’une action
→ reste visible

information critique / erreur / blocage
→ reste visible

opération sensible / destructive
→ explication visible obligatoire
```

`FormField` et `SelectField` savent porter une aide `info` via `InfoTooltip`, tandis que `hint` reste réservé aux consignes qui doivent rester visibles.

---

## 9. Disponibilité temporelle des fonctionnalités d’un Workspace

Le DTO utilisateur expose la projection assainie :

```text
featureAvailability
```

Formes principales :

```text
open_ended
→ aucune extinction actuellement programmée
→ affichage utilisateur : "Sans échéance"

bounded
→ fin de droit réellement programmée
→ affichage utilisateur : "Jusqu’au <date> · <durée restante>"
```

La résolution est effectuée côté backend et tient compte notamment de la baseline, du trial, de la souscription active, de `cancelAtPeriodEnd`, des changements programmés et des overrides.

Lorsque plusieurs mécanismes accordent la même fonctionnalité, l’horizon affiché correspond à la continuité réelle la plus longue.

Le frontend ne reconstruit pas cette logique commercialement sensible.

Les métadonnées internes des overrides restent masquées.

Le contrat canonique `docs/contracts/COMMERCIAL.md` est aligné avec cette projection.

---

## 10. Statuts de souscription Platform — contrat visuel

Le tableau Platform des souscriptions utilise :

```text
PlatformSubscriptionStatusBadge
→ StatusBadge partagé
→ tokens sémantiques du Design System
```

Mapping actuel :

```text
active    → Actif                → success
trialing  → Trial                → warning
past_due  → Paiement en retard   → destructive
canceled  → Annulé               → neutral / archive
expired   → Expiré               → neutral / archive
```

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

D-023 reste :

```text
Statut : DIFFÉRÉ
Cible : Core 1.1
Blocage Core 1.0 : non
```

Ne pas ajouter d’UI de demande de transfert côté owner avant D-023.

---

## 12. Dettes et roadmap Core 1.0

État canonique vérifié dans `docs/DEBT.md` :

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

Roadmap Core :

```text
D-020 → clôturer ou reclassifier
D-015 → versionnement / provenance / releases / migrations
D-016 → Playwright E2E Core
D-002 → corbeille / restauration Files
→ audit final architecture / sécurité / qualité
D-017 → dérivation + upgrade pilote
→ tag Core stable

post-Core 1.0 :
D-023 → workflow gouverné de demande de transfert
```

D-002 doit être `VALIDÉ` avant D-017 et avant toute première dérivation métier.

---

## 13. Audit transversal UI — état et ordre de poursuite

Lots consolidés dans `main` :

```text
Design Tokens / D-011
Sidebar / navigation existante
Topbars
DataTable
DataPagination
Dialog DLG-1 / ConfirmationDialog
Dialog DLG-2 / FileUploadDialog
Select Base UI
Toast Base UI
Drawer / Sheet / EntityDetailsDrawer Base UI
FORM-1 / formulaires partagés
```

Lot actif :

```text
FORM-2 / Input / Textarea / Checkbox / Switch
```

Ordre recommandé après validation et fusion de FORM-2 :

```text
1. Dropdown menus
2. Tooltip / Popover / Accordion / Tabs
3. Badge / StatusBadge
4. primitives HTML/React directes restantes
```

Pour chaque famille : inventorier avant de coder, détecter les duplications, vérifier clavier/focus/ARIA, tokens, API, responsabilité du composant et testabilité, puis décider si une migration est réellement nécessaire.

### Sidebar

La Sidebar existante est fonctionnelle mais doit faire l’objet d’une revue dédiée d’alignement avec shadcn/ui avant de considérer son architecture définitivement stabilisée.

Ne pas lancer une réécriture de Sidebar implicitement dans un autre lot UI. Auditer d’abord l’existant et proposer une décision explicite avant toute implémentation.

---

## 14. Chantiers à garder séparés

Ne pas mélanger au chantier UI :

```text
D-023 workflow ownership Core 1.1
gouvernance juridique de conservation des données
reset reproductible de la base de développement
validation négative finale / clôture D-020
D-015 versionnement / provenance / releases
D-016 Playwright E2E Core
D-002 corbeille / restauration Files
D-017 dérivation + upgrade pilote
nettoyage des warnings React Hooks connus
```

---

## 15. Règles de travail à conserver

- vérifier branche et HEAD avant modification ;
- toujours repartir de `main` pour un nouveau lot, sauf décision explicite contraire ;
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
- gate globale après un bloc transversal ;
- ne jamais annoncer une gate verte sans résultat réellement exécuté ;
- une information pédagogique secondaire va dans un `InfoTooltip`, pas une information critique ;
- ne pas adapter le code de production uniquement pour satisfaire un test dépendant du DOM interne d’une primitive tierce ;
- ne pas supprimer un hook ou composant partagé sans audit de ses consommateurs.

---

## 16. Prochaine action exacte

FORM-2 est implémenté sur :

```text
feature/form-control-primitives-alignment
```

Il n’est pas encore validé ni fusionné.

Prochaine gate :

```text
1. mettre à jour la branche locale : git pull --ff-only ;
2. exécuter les tests ciblés des primitives et composants modifiés ;
3. si les tests ciblés sont verts, exécuter npm test ;
4. exécuter npm run lint ;
5. exécuter npm run build ;
6. valider visuellement et au clavier les contrôles principaux, notamment Switch, Checkbox, DatePicker, formulaires Platform et parcours d’invitation ;
7. analyser globalement toute famille de FAILS avant correction ;
8. ne fusionner dans main qu’après gate verte et autorisation explicite.
```

Le backend n’a pas été modifié par FORM-2 ; ne pas prétendre qu’une gate backend a été rejouée si elle ne l’a pas été.

Après FORM-2, le prochain audit UI recommandé est `Dropdown menus`.

Avant suppression éventuelle de `use-dialog-focus.js`, vérifier explicitement tous ses consommateurs réels.

En parallèle, la roadmap Core métier reste gouvernée par `docs/DEBT.md` et notamment par la nécessité de clôturer ou reclassifier D-020 avant D-015.

Ne pas fusionner implicitement la branche FORM-2.

Le présent fichier est une synthèse de reprise et non une source supérieure au code, aux tests ou aux contrats canoniques.
