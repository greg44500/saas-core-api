# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état validé de `main` après clôture de D-011.B. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
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

## 2. État courant de `main`

D-011.A et D-011.B sont désormais fusionnés et validés dans `main`.

La fusion D-011.B a été réalisée en fast-forward depuis `d-011-b-user-preferences` vers le commit validé :

```text
0555364fc95c8e2361df1b0cccbcd348ddb21762
```

Avant fusion, la branche était :

```text
112 commits devant main
0 commit derrière main
```

La gate locale finale communiquée par l’utilisateur est verte :

```text
frontend npm run lint     OK
frontend npm test         OK
frontend npm run build    OK
backend  npm run lint     OK
backend  npm test         OK
validation UI manuelle    OK
```

Les contrôles visuels finaux ont inclus notamment :

- absence de scroll horizontal parasite ;
- tooltip Déconnexion entièrement visible sous le bouton ;
- sidebars Workspace et Platform restant accessibles pendant le scroll du contenu ;
- identité utilisateur cohérente dans Workspace, Account et Platform ;
- préférences thème / police / palette / accessibilité ;
- persistance des préférences authentifiées ;
- palettes contrôlées et aperçu visuel avant sauvegarde.

---

## 3. Roadmap immédiate

```text
D-018 Équipe Platform / RBAC / invitations internes            VALIDÉ
D-019 moteur sécurisé de rétention / purge Core                VALIDÉ
DOC-CODE-1 normalisation documentation source                  VALIDÉ
D-020 invitation commerciale / offre privée découverte         INTÉGRÉ MAIN — MANUEL DIFFÉRÉ
D-011.A Design System Core                                     VALIDÉ — FUSIONNÉ MAIN
D-011.B préférences de confort                                 VALIDÉ — FUSIONNÉ MAIN
→ D-011.C préférences d'affichage métier                       PROCHAIN BLOC
→ D-021 gate sécurité Auth / invitations / tokens              PLANIFIÉ
→ D-015 versionnement / provenance / migrations / release      PLANIFIÉ
→ D-016 Playwright / E2E Core                                  PLANIFIÉ
→ D-002 corbeille / restauration Files                         OBLIGATOIRE AVANT PREMIÈRE DÉRIVATION
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
→ release v1.0.0
→ première dérivation métier
```

D-011 reste une dette globale active tant que D-011.C n’est pas clôturé.

D-015 ne doit pas être ouvert avant clôture ou reclassification explicite de D-011 et D-021.

---

## 4. D-011.A — Design System Core validé

D-011.A a stabilisé le langage visuel et les responsabilités transversales avant l’introduction des préférences utilisateur.

Contrat validé :

```text
Design tokens
→ components/ui
→ components/shared
→ features/*/components
```

Le Core conserve :

- Tailwind CSS v4 CSS-first ;
- `@theme inline` ;
- `frontend/src/index.css` comme fichier global ;
- variables CSS sémantiques ;
- thèmes light/dark ;
- primitives shadcn/ui ;
- accessibilité structurelle toujours active ;
- `prefers-reduced-motion` global ;
- états asynchrones partagés.

Invariant async :

```text
LOADING   → Skeleton adapté lorsque pertinent
SUCCESS   → contenu réel
EMPTY     → EmptyState
ERROR     → ErrorState + retry lorsque pertinent
FORBIDDEN / non-entitled → composant généralement absent
```

Règle RTK Query : un Skeleton est utilisé au chargement initial sans donnée. Lors d’un refetch avec donnée existante, le contenu réel reste affiché.

Vocabulaire partagé :

```text
App / guards               → PageLoader
Tables                      → DataTableSkeleton
Pages Platform tabulaires  → PlatformTablePageSkeleton
Dashboard                   → compositions dashboard/shell dédiées
Settings / formulaires      → FormSectionSkeleton
Drawer détail asynchrone    → EntityDetailsSkeleton
Abonnement                  → WorkspaceSubscriptionSkeleton / PlanCardsSkeleton
Cas réellement spécifique  → composition dédiée basée sur Skeleton
```

---

## 5. D-011.B — Préférences de confort validées

### 5.1 Modèle et sécurité backend

Les préférences de confort sont persistées sur `User.preferences.comfort`.

Contrat contrôlé :

```text
theme             → system | light | dark
fontFamily        → inter | geist | manrope | system
paletteId         → identifiant de palette enregistré dans le registre Core
accessibilityMode → standard | enhanced
```

Règles de sécurité :

- validation Zod stricte ;
- aucune valeur CSS libre ;
- aucune URL de police arbitraire ;
- aucun JSON libre ;
- palettes déclarées par registre ;
- update partiel uniquement sur clés connues ;
- utilisateur authentifié et actif requis ;
- les préférences de confort ne sont ni un entitlement ni une permission ;
- aucune préférence ne peut élargir RBAC ou Plan.

Endpoints :

```text
GET   /api/users/me/preferences
PATCH /api/users/me/preferences
```

Les anciens comptes sans structure de préférences reçoivent les valeurs par défaut via normalisation sans migration destructive obligatoire.

### 5.2 Persistance frontend

Deux comportements sont volontairement séparés :

```text
utilisateur non authentifié
→ préférences locales contrôlées

utilisateur authentifié
→ préférences serveur du compte
```

Le stockage local actuel utilise :

```text
saas-core:comfort:<scope>
```

L’ancienne clé :

```text
saas-core:theme:<scope>
```

reste uniquement lisible pour compatibilité ascendante. Elle n’est plus la cible d’écriture.

Un échec de sauvegarde serveur ne doit jamais créer une divergence locale silencieuse pour un utilisateur authentifié.

### 5.3 Polices

Liste contrôlée retenue :

```text
Inter      → défaut
Geist
Manrope
System
```

Dépendances intégrées et lockfile synchronisé :

```text
@fontsource-variable/inter
@fontsource-variable/geist
@fontsource-variable/manrope
```

DM Sans et Plus Jakarta Sans ne sont pas intégrées par anticipation. Elles pourront être ajoutées plus tard si une décision produit réelle le justifie.

### 5.4 Palettes Core

Quatre palettes contrôlées sont intégrées :

```text
Core Atlantique
Refreshing Summer Fun
Leafy Green Garden
Golden Peachy Glow
```

Le sélecteur de palettes utilise des mini-cartes compactes avec aperçu des cinq couleurs.

Le clic sur une palette produit un aperçu immédiat local de la page de préférences. La persistance serveur n’a lieu qu’après validation explicite via Enregistrer.

Si l’utilisateur quitte la page sans sauvegarder, la palette serveur précédemment enregistrée est restaurée.

Les couleurs d’aperçu ne constituent pas un mécanisme de CSS libre : elles sont des métadonnées frontend contrôlées. Les styles réels restent traduits en tokens sémantiques dans le Design System.

Les couleurs sémantiques d’état — erreur, succès, alerte — restent indépendantes de la palette de marque.

### 5.5 Accessibilité renforcée

`accessibilityMode = enhanced` est une surcouche optionnelle.

Elle ne désactive jamais l’accessibilité structurelle du Core.

Le mode renforcé augmente notamment, selon les règles intégrées :

- contraste des surfaces secondaires ;
- visibilité des bordures ;
- visibilité du focus ;
- réduction de certaines animations/transitions applicatives.

Le respect global de `prefers-reduced-motion` reste toujours actif indépendamment de cette préférence.

### 5.6 Page Préférences et navigation compte

Route :

```text
/account/preferences
```

Navigation Account :

```text
Profil
Préférences
Sécurité
```

Le `UserMenu` expose également :

```text
Profil
Préférences
Sécurité
[Console d’administration si autorisée]
Déconnexion
```

La page Préférences utilise RHF + Zod, Skeleton au cold load, ErrorState avec retry et toast de confirmation.

---

## 6. Shell authentifié et identité utilisateur

Les derniers ajustements UI de D-011.B ont été traités comme responsabilités transversales du shell, pas comme snippets locaux.

### 6.1 Identité applicative

L’identité produit est centralisée via :

```text
frontend/src/app/application-identity.js
```

Le Workspace n’est plus utilisé comme identité de l’application.

Dans le Core :

```text
Application
SaaS Core
```

Ce point permet à une future application dérivée de remplacer proprement l’identité produit sans modifier plusieurs composants.

### 6.2 Workspace courant

Si un seul workspace est accessible :

```text
Espace de travail : <nom>
```

Aucun faux `<select>` désactivé n’est affiché.

Si plusieurs workspaces sont accessibles, le `WorkspaceSwitcher` redevient un vrai sélecteur.

### 6.3 Bloc d’identité authentifiée

Composant partagé :

```text
AuthenticatedUserIdentity
```

Composition selon contexte :

```text
Workspace
→ Avatar + Nom Prénom
→ Plan <plan effectif du workspace>
→ bouton Déconnexion séparé

Account
→ Avatar + Nom Prénom
→ email
→ bouton Déconnexion séparé

Platform
→ Avatar + Nom Prénom
→ qualité Platform réelle
→ bouton Déconnexion séparé
```

Le plan n’est jamais traité comme une propriété du `User` : il provient de la Subscription/entitlement du workspace courant.

La qualité Platform provient de `/platform/me` et de `role.name`. Pour le fondateur, l’UI peut composer :

```text
Fondateur · <nom du rôle>
```

Aucun rôle Platform n’est inventé côté frontend.

La photo de profil personnalisable n’est pas implémentée dans D-011.B. Les initiales restent le fallback actuel. Un futur upload d’avatar devra être traité comme une fonctionnalité backend sécurisée distincte.

### 6.4 Déconnexion et Tooltip

Le raccourci Déconnexion utilise le composant partagé de Tooltip.

Un positionnement `bottom-end` a été ajouté pour les actions situées en haut à droite :

```text
bouton
↓
tooltip sous le bouton, aligné sur son bord droit
```

Objectifs validés :

- pas de tooltip coupé par le haut du viewport ;
- pas de débordement horizontal parasite ;
- pas de scrollbar horizontale créée par le tooltip.

### 6.5 Sidebars Workspace et Platform

Le problème de sidebar suivant la hauteur du document a été corrigé au niveau du shell.

Contrat :

```text
sidebar
→ sticky top-0
→ hauteur 100svh
→ self-start

navigation déployée trop haute
→ scroll interne vertical

navigation réduite
→ overflow visible pour flyouts / tooltips

contenu principal
→ scroll normal du document
```

Aucun `position: fixed` avec compensation artificielle de largeur n’a été introduit.

Le menu latéral reste donc accessible lorsque l’utilisateur descend dans une page longue.

---

## 7. Prochain bloc — D-011.C préférences d’affichage métier

D-011.C doit préparer un mécanisme générique permettant aux futurs modules métier de déclarer des widgets, cartes, indicateurs ou KPI pouvant être affichés/masqués par l’utilisateur.

Invariant fondamental :

```text
Plan / entitlement effectif
+
permissions utilisateur
→ ensemble réellement accessible

ensemble réellement accessible
+
préférences d’affichage utilisateur
→ ensemble visible
```

Conséquences obligatoires :

- une préférence ne crée jamais un droit ;
- un widget inaccessible n’est jamais proposé dans les préférences ;
- masquer un widget ne retire aucune permission ;
- demander l’affichage d’un widget n’élargit aucun entitlement ;
- le backend reste autoritaire pour les données ;
- le frontend filtre d’abord selon l’accès effectif puis selon la préférence ;
- un composant non accessible ne doit pas polluer le Dashboard par un faux état `indisponible` si la convention produit prévoit son absence.

Le Core doit rester indépendant du domaine métier.

Architecture cible à cadrer avant code :

```text
registre générique de widgets/KPI
→ déclarations Core + futures déclarations de modules dérivés
→ filtre entitlement / permissions
→ préférences utilisateur
→ composition Dashboard
```

La V1 doit rester simple :

```text
afficher / masquer
```

Le réordonnancement ne doit être ajouté que si son intérêt produit est confirmé pendant le cadrage.

Ne pas introduire :

- constructeur de Dashboard libre ;
- grille drag-and-drop arbitraire ;
- resize complexe ;
- styles personnalisables par widget ;
- logique métier dans le Core.

---

## 8. Méthode obligatoire pour D-011.C

Créer une branche dédiée depuis `main` après confirmation que le dépôt local est synchronisé.

Ordre de travail :

1. audit de l’existant Dashboard / entitlement / permissions ;
2. cadrage du registre d’affichage ;
3. définition du modèle de préférence et des valeurs par défaut ;
4. décider si la persistance existante `User.preferences` doit être étendue ou si une structure distincte est préférable ;
5. validation backend stricte avant UI si persistance serveur ;
6. intégration frontend par composants réutilisables ;
7. tests unitaires et intégration ciblés ;
8. validation manuelle ;
9. gate globale ;
10. audit du diff ;
11. mise à jour documentaire ;
12. fusion explicite.

Ne pas mélanger D-011.C avec D-021, D-015, D-002 ou un module métier concret.

---

## 9. Après D-011.C

Ordre prévu :

```text
D-011.C
→ D-021 gate sécurité Auth / invitations / tokens temporaires
→ D-015 versionnement / provenance / migrations / release
→ D-016 Playwright E2E Core
→ D-002 corbeille / restauration Files
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
```

Google SSO reste dans D-010, conditionnel et non bloquant Core 1.0 à ce stade.

D-020 reste intégré à `main`, avec validation fonctionnelle manuelle complète encore différée.

---

## 10. Amorçage de la prochaine conversation

La prochaine conversation doit commencer par D-011.C et non reprendre D-011.B.

Objectif initial : **auditer puis cadrer le registre générique de préférences d’affichage métier avant toute implémentation.**
