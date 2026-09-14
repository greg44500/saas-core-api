# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état réel du Core au **2026-09-14** après la fusion et la validation complète des lots DLG-2 et Toast Base UI.
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

HEAD fonctionnel distant vérifié après fusion du lot Toast et avant la présente mise à jour documentaire :

```text
7058d368fcb362267c9f6c8fc0cdb8f9ffe40e83
Merge branch 'feature/toast-base-ui-harmonization'
```

Parents du merge :

```text
fccc121a7c841b1fb1a66e62c3660d87246c66d1
1170b3027558bd5ae07646bc45d9453e118ed5c8
```

Le second parent correspond au HEAD fonctionnel Toast entièrement validé avant fusion.

Ce `main` contient notamment :

- Design System / D-011 validé ;
- Sidebar/navigation et Topbars existantes consolidées ;
- DataTable partagé ;
- DataPagination partagé ;
- DLG-1 : primitive `components/ui/dialog.jsx` Base UI ;
- `ConfirmationDialog` migré sur la primitive canonique ;
- DLG-2 : `FileUploadDialog` migré sur Dialog Base UI ;
- Select Base UI harmonisé ;
- UX pédagogique Platform/Workspace harmonisée via `InfoTooltip` ;
- projection `featureAvailability` des fonctionnalités Workspace ;
- statuts de souscription Platform alignés sur les tons sémantiques ;
- Toast Base UI canonique avec maintien de l’API applicative `useToast()`.

### Branche de travail

Le lot Toast est fusionné. Il n’existe plus de branche fonctionnelle active à considérer comme source de vérité supérieure à `main`.

La branche historique :

```text
feature/toast-base-ui-harmonization
```

peut rester temporairement présente jusqu’à nettoyage Git, mais elle ne doit plus servir de base à un nouveau chantier.

Toute nouvelle conversation doit commencer par vérifier le HEAD réel de `main` avant toute conclusion ou création de branche.

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

Audit réalisé : les confirmations métier existantes passaient déjà par `ConfirmationDialog`; le seul shell modal autonome comparable identifié dans le périmètre était `FileUploadDialog`.

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

DLG-2 a ensuite été fusionné dans `main`. Ne plus le présenter comme « prêt à fusionner ».

### 3.4 Toast Base UI — VALIDÉ et fusionné

Architecture désormais canonique :

```text
features
→ useToast()
→ components/shared/toast-provider.jsx
→ components/ui/toast.jsx
→ @base-ui/react/toast
```

La migration a volontairement conservé l’API applicative existante afin d’éviter de coupler les features à Base UI :

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

Comportements conservés :

```text
durée par défaut : 5000 ms
duration <= 0 : notification persistante
fermeture manuelle
fermeture programmatique
stack de notifications sans nouvelle limite produit implicite
```

Base UI porte désormais la file de notifications, les timers, les annonces accessibles, les transitions et les comportements propres à la primitive.

Les tests métier ne dépendent plus des anciennes implémentations DOM `role="status"` / `role="alert"` du toast visible. Le helper partagé canonique est :

```text
frontend/src/test/toast-assertions.js
→ findToastByText(...)
→ cible la surface applicative [data-slot="toast"]
```

Les `role="status"` et `role="alert"` qui appartiennent réellement à des skeletons, erreurs inline ou dialogues de confirmation restent inchangés.

La migration a également révélé des tests Select Base UI trop synchrones. Lorsqu’une option est rendue dans un Portal, les tests doivent utiliser une attente accessible (`findByRole`) lorsque le montage peut être différé.

Après correction globale par cause racine, l’utilisateur a réellement exécuté et communiqué comme vertes les gates finales :

```text
frontend npm test       → VERT — 760 tests
frontend npm run lint   → VERT
frontend npm run build  → VERT
```

Le backend n’a pas été relancé car le lot Toast n’a modifié aucun fichier backend.

La validation manuelle/visuelle a également été déclarée conforme par l’utilisateur.

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

### 3.5 Warnings React Hooks connus — hors périmètre

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

Décision de travail confirmée pendant la migration Toast :

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

Les tests doivent viser le contrat applicatif stable plutôt que le DOM interne d’une primitive tierce.

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

## 6. Dialog — DLG-1 et DLG-2 terminés et fusionnés

Architecture validée :

```text
features
→ wrappers métier
→ ConfirmationDialog / dialog métier
→ components/ui/dialog.jsx
→ @base-ui/react/dialog
```

Base UI porte notamment : focus initial, boucle Tab, restauration du focus, Escape, modalité et verrouillage du scroll.

DLG-1 a migré `ConfirmationDialog`.

DLG-2 a audité les shells modaux custom restants et migré `FileUploadDialog`.

Les wrappers métier utilisant déjà `ConfirmationDialog` restent légitimes et ne doivent pas être aplatis simplement pour réduire le nombre de composants.

`use-dialog-focus.js` doit rester tant que `EntityDetailsDrawer` l’utilise. Les drawers/sheets constituent un chantier séparé.

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
```

Ordre recommandé pour poursuivre l’audit UI :

```text
1. Drawer / Sheet / panneaux latéraux
2. formulaires partagés
3. Input / Textarea / Checkbox / Switch
4. Dropdown menus
5. Tooltip / Popover / Accordion / Tabs
6. Badge / StatusBadge
7. primitives HTML/React directes restantes
```

Pour chaque famille : inventorier avant de coder, détecter les duplications, vérifier clavier/focus/ARIA, tokens, API, responsabilité du composant et testabilité, puis décider si une migration est réellement nécessaire.

### Sidebar

La Sidebar existante est fonctionnelle mais doit faire l’objet d’une revue dédiée d’alignement avec shadcn/ui avant de considérer son architecture définitivement stabilisée.

Ne pas lancer une réécriture de Sidebar implicitement dans le lot Drawer/Sheet. Auditer d’abord l’existant et proposer une décision explicite avant toute implémentation.

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
- ne pas adapter le code de production uniquement pour satisfaire un test dépendant du DOM interne d’une primitive tierce.

---

## 16. Prochaine action exacte

Les lots suivants sont maintenant fusionnés et validés :

```text
DLG-1
Select Base UI / UX
DLG-2
Toast Base UI
```

Le prochain lot UI recommandé est :

```text
Drawer / Sheet / panneaux latéraux
```

Avant tout code :

```text
1. vérifier le HEAD réel de main ;
2. lire docs/REPRISE-CURRENT.md ;
3. vérifier l’état canonique utile dans docs/DEBT.md ;
4. inspecter l’ensemble des drawers / sheets / panneaux latéraux existants ;
5. identifier les primitives shadcn/Base UI déjà présentes ;
6. distinguer les wrappers métier légitimes des shells custom dupliqués ;
7. vérifier notamment EntityDetailsDrawer et l’usage résiduel de use-dialog-focus.js ;
8. auditer le lien éventuel avec la Sidebar sans modifier la Sidebar ;
9. proposer un périmètre précis et un plan de migration ;
10. ne modifier aucun fichier avant validation du périmètre.
```

En parallèle, la roadmap Core métier reste gouvernée par `docs/DEBT.md` et notamment par la nécessité de clôturer ou reclassifier D-020 avant D-015.

Ne pas fusionner implicitement une future branche.

Le présent fichier est une synthèse de reprise et non une source supérieure au code, aux tests ou aux contrats canoniques.
