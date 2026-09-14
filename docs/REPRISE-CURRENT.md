# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état réel du Core au **2026-09-14** après la fusion du lot Select/UX dans `main` et la validation complète du lot DLG-2 d’harmonisation des shells modaux.
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
a477a150fcbbcfcb56c35ed7c93fd7e9c2a2dfd0
Merge pull request #12 from greg44500/feature/select-base-ui-harmonization
```

Ce HEAD contient notamment :

- Design System / D-011 validé ;
- Sidebar/navigation et Topbars consolidées ;
- DataTable partagé ;
- DataPagination partagé ;
- DLG-1 : primitive `components/ui/dialog.jsx` Base UI ;
- migration de `ConfirmationDialog` ;
- verrouillage de fermeture du Dialog pendant `pending` ;
- Select Base UI harmonisé ;
- UX pédagogique Platform/Workspace harmonisée via `InfoTooltip` ;
- projection `featureAvailability` des fonctionnalités Workspace ;
- statuts de souscription Platform alignés sur les tons sémantiques.

Le lot Select/UX a été fusionné via la PR #12.

### Branche de travail courante

```text
feature/dialog-dlg2-harmonization
```

HEAD fonctionnel validé avant la présente mise à jour documentaire :

```text
4f5589638aed9f7b6ef87fce5e60ccf8ac96326c
test(platform): await portalled select options
```

La branche part de `main` à `a477a150...`.

Avant le commit documentaire courant, la comparaison était :

```text
feature/dialog-dlg2-harmonization
→ 3 commits devant main
→ 0 commit derrière main
→ merge-base = a477a150fcbbcfcb56c35ed7c93fd7e9c2a2dfd0
```

Aucune divergence Git n’était à résoudre.

Toute nouvelle conversation doit vérifier le HEAD réel de `main` et celui de la branche de travail avant toute conclusion.

---

## 3. Validations réellement constatées

### 3.1 DLG-1 — VALIDÉ et fusionné

Le lot Dialog DLG-1 a été validé localement par l’utilisateur puis fusionné dans `main`.

Ne pas rouvrir DLG-1 sans régression concrète.

### 3.2 Lot Select / UX — VALIDÉ et fusionné

Le lot Select a supprimé les derniers `<select>` natifs concernés et les usages de l’ancien wrapper.

La primitive canonique est désormais :

```text
frontend/src/components/ui/select.jsx
→ @base-ui/react/select
```

Le wrapper partagé canonique est :

```text
frontend/src/components/shared/select-field.jsx
```

L’ancien wrapper a été supprimé :

```text
frontend/src/components/forms/select-field.jsx
frontend/src/components/forms/select-field.test.jsx
```

ESLint interdit maintenant :

```text
<select> natif dans frontend/src
import depuis @/components/forms/select-field
```

Les tests Base UI utilisent une interaction accessible de type :

```text
combobox
→ ouverture / clavier
→ option
→ assertion métier
```

et non `user.selectOptions()`, réservé aux `<select>` natifs.

Surfaces migrées notamment :

```text
Platform Audit Logs
Commercial Invitations
Platform Invitations
Platform metric limits
Platform Plans / capabilities
Platform Subscriptions
Platform Team
Workspace Members
Files upload category
Retention target
WorkspaceSwitcher
```

Avant fusion, l’utilisateur a réellement exécuté et communiqué comme vertes les cinq gates suivantes :

```text
frontend npm run lint   → VERT
frontend npm test       → VERT
frontend npm run build  → VERT
backend npm run lint    → VERT
backend npm test        → VERT
```

La validation manuelle/visuelle a également été déclarée conforme.

Le lot a ensuite été fusionné dans `main` via la PR #12.

### 3.3 DLG-2 — VALIDÉ localement, prêt à fusionner

Audit effectué :

- les confirmations métier existantes passent déjà par `ConfirmationDialog` ;
- aucun wrapper métier déjà conforme n’a été réécrit inutilement ;
- le seul shell modal autonome comparable identifié dans ce lot était `FileUploadDialog`.

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

Le sélecteur de fichier a également été corrigé sur le plan sémantique : le contrôle visible `Choisir un fichier` est désormais un vrai bouton clavier déclenchant l’input fichier caché, et non un `<label>` simplement stylé comme un bouton.

Tests ajoutés/renforcés notamment :

```text
dialog accessible nommé "Ajouter un fichier"
focus initial sur "Choisir un fichier"
fermeture par Escape lorsque idle
fermeture bloquée pendant le téléversement
sélection du fichier et de la catégorie
validation client des types
messages backend
```

Une régression de test indépendante de DLG-2 a été révélée par la gate globale sur `PlatformSubscriptionsPage` : le helper cherchait une option Base UI portallée de façon synchrone. La correction a uniquement remplacé la recherche immédiate par une attente `findByRole('option')`, sans modifier le comportement applicatif.

L’utilisateur a ensuite réellement exécuté et communiqué comme vertes les gates DLG-2 suivantes :

```text
frontend npm run lint   → VERT
frontend npm test       → VERT
frontend npm run build  → VERT
```

Le backend n’a pas été relancé pour DLG-2 car aucun fichier backend n’a été modifié dans ce lot.

La validation manuelle/clavier a également été effectuée et déclarée conforme, notamment :

```text
ouverture et centrage
focus initial
Tab / Shift+Tab
Escape
blocage de fermeture pendant upload
Select Catégorie au-dessus de la modale
restauration du focus à la fermeture
```

DLG-2 est donc techniquement et visuellement validé sur le HEAD fonctionnel `4f558963...`.

### 3.4 Warnings React Hooks connus — hors périmètre

Les warnings `react-hooks/exhaustive-deps` déjà identifiés restent hors de ce lot sauf régression concrète :

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

Décision de travail :

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

Ne jamais annoncer une gate verte sans résultat réellement exécuté.

Pour les composants Base UI portallés, ne pas supposer que le contenu du popup est forcément disponible de façon synchrone juste après le clic : les tests doivent attendre l’élément accessible lorsque le montage peut être différé.

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

## 6. Dialog — DLG-1 et DLG-2 terminés côté branche

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

DLG-2 a audité les shells modaux custom restants et migré le seul cas autonome identifié dans ce périmètre : `FileUploadDialog`.

Les wrappers métier utilisant déjà `ConfirmationDialog` restent légitimes et ne doivent pas être aplatis simplement pour réduire le nombre de composants.

`use-dialog-focus.js` doit rester tant que `EntityDetailsDrawer` l’utilise. Les drawers/sheets constituent un chantier séparé et ne doivent pas être absorbés rétroactivement dans DLG-2.

---

## 7. Toast — audité, non migré

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

Variantes à préserver : success, error/destructive, warning, info.

Les erreurs de validation de champs restent inline.

Ne pas ajouter Sonner sans besoin concret.

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

Cette règle a été appliquée sur les zones Platform concernées, notamment :

```text
Plans
Abonnements
Invitations commerciales
Gestion client > Workspaces
Gestion client > Utilisateurs
Journaux d’audit
Équipe Platform et ses onglets
```

et sur les zones Workspace concernées, notamment :

```text
Tableau de bord
cartes de synthèse
activité récente
Historique d’activité
Membres
Rôles et permissions
```

Les vues déjà conformes n’ont pas été retouchées inutilement.

`FormField` et `SelectField` savent porter une aide `info` via `InfoTooltip`, tandis que `hint` reste réservé aux consignes qui doivent rester visibles.

---

## 9. Disponibilité temporelle des fonctionnalités d’un Workspace

Le bloc utilisateur des droits effectifs ne doit pas seulement indiquer qu’une fonctionnalité est disponible ; il doit aussi permettre de comprendre rapidement jusqu’à quand elle l’est lorsqu’une échéance réelle existe.

Le calcul est effectué côté backend.

Le DTO utilisateur expose une projection assainie :

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

Le terme `Sans échéance` est volontairement préféré à `Permanent`, car un plan ou une souscription peut évoluer ultérieurement.

La résolution tient compte notamment de :

```text
baseline
trial
subscription active
cancelAtPeriodEnd
scheduledChange / downgrade
EntitlementOverride temporaire ou sans fin
continuité éventuelle par la baseline
```

Lorsque plusieurs mécanismes accordent la même fonctionnalité, l’horizon affiché correspond à la continuité réelle la plus longue.

Le frontend ne reconstruit pas cette logique commercialement sensible.

Les métadonnées internes des overrides restent masquées :

```text
motif
origine
auteur
identifiant interne
```

Le contrat canonique `docs/contracts/COMMERCIAL.md` a été aligné avec cette projection.

---

## 10. Statuts de souscription Platform — contrat visuel

Le tableau Platform des souscriptions utilise le composant métier :

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

Les couleurs ne sont pas codées directement dans le tableau ; le domaine mappe ses états vers les tons du Design System partagé.

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

D-002 doit être `VALIDÉ` avant D-017 et la première dérivation métier.

---

## 13. Audit transversal UI — ordre après DLG-2

Lots déjà consolidés dans `main` :

```text
Design Tokens / D-011
Sidebar / navigation
Topbars
DataTable
DataPagination
Dialog DLG-1 / ConfirmationDialog
Select Base UI
```

Lot validé sur la branche courante et prêt pour intégration :

```text
DLG-2 / FileUploadDialog Base UI
```

Ordre recommandé après fusion de DLG-2 :

```text
1. Toast Base UI/shadcn en conservant useToast()
2. Drawer / Sheet / panneaux latéraux
3. formulaires partagés
4. Input / Textarea / Checkbox / Switch
5. Dropdown menus
6. Tooltip / Popover / Accordion / Tabs
7. Badge / StatusBadge
8. primitives HTML/React directes restantes
```

Pour chaque famille : inventorier, détecter les duplications, vérifier clavier/focus/ARIA, vérifier tokens, API et testabilité, puis classer avant toute migration.

---

## 14. Chantiers à garder séparés

Ne pas mélanger au chantier UI :

```text
D-023 workflow ownership Core 1.1
gouvernance juridique de conservation des données
reset reproductible de la base de développement
validation négative finale D-020
D-015 versionnement / provenance / releases
D-016 Playwright E2E Core
D-002 corbeille / restauration Files
D-017 dérivation + upgrade pilote
nettoyage des warnings React Hooks connus
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
- gate globale après un bloc transversal ;
- ne jamais annoncer une gate verte sans résultat réellement exécuté ;
- une information pédagogique secondaire va dans un `InfoTooltip`, pas une information critique.

---

## 16. Prochaine action exacte

DLG-2 a franchi :

```text
frontend lint → VERT
frontend tests → VERT
frontend build → VERT
validation visuelle/manuelle/clavier → VALIDÉE
```

La prochaine action n’est plus une correction DLG-2.

Séquence :

```text
1. vérifier le diff final main..feature/dialog-dlg2-harmonization ;
2. vérifier les HEAD distants ;
3. fusionner la branche dans main uniquement sur décision explicite ;
4. vérifier le nouveau HEAD de main ;
5. mettre à jour la reprise si la fusion change le contexte ;
6. seulement ensuite démarrer le lot Toast Base UI/shadcn.
```

Ne pas fusionner implicitement.

Le présent fichier est une synthèse de reprise et non une source supérieure au code, aux tests ou aux contrats canoniques.
