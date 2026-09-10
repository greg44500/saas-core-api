# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état validé de `main` après clôture de D-011. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-10**

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

D-011 est entièrement clôturée et fusionnée dans `main`.

Sous-phases :

```text
D-011.A Design System Core                    VALIDÉ — 2026-09-09
D-011.B Préférences de confort                VALIDÉ — 2026-09-09
D-011.C Préférences d'affichage métier        VALIDÉ — 2026-09-10
```

La branche D-011.C a été fusionnée en fast-forward dans `main` au commit :

```text
084a0094dd5bdd16103476f9be67173e434faeb5
```

La gate locale finale communiquée par l’utilisateur est verte :

```text
tests ciblés              OK
tests globaux             OK
lint                      OK
build frontend            OK
validation UI manuelle    OK
```

Aucun compteur de tests supplémentaire n’est enregistré ici car seuls les statuts finaux ont été communiqués après le dernier correctif.

---

## 3. D-011 — Contrat désormais validé

### 3.1 Design System

Le Core conserve une architecture Tailwind CSS v4 CSS-first avec tokens sémantiques, thèmes light/dark, primitives shadcn/ui et composants partagés.

Contrat :

```text
Design tokens
→ components/ui
→ components/shared
→ features/*/components
```

L’accessibilité structurelle reste toujours active. `accessibilityMode = enhanced` n’est qu’une surcouche optionnelle. `prefers-reduced-motion` reste respecté indépendamment de cette préférence.

Les états asynchrones sont distingués : loading, success, empty, error, forbidden/non-entitled et disabled. Les Skeletons sont réservés au chargement initial sans donnée lorsqu’ils sont pertinents.

### 3.2 Préférences de confort

Persistance authentifiée :

```text
User.preferences.comfort
```

Contrat contrôlé :

```text
theme             → system | light | dark
fontFamily        → inter | geist | manrope | system
paletteId         → identifiant de palette contrôlé
accessibilityMode → standard | enhanced
```

La page `/account/preferences` permet l’aperçu avant sauvegarde pour les choix visuels concernés. Aucune valeur CSS libre, URL de police arbitraire ou JSON libre n’est persisté.

### 3.3 Préférences d’affichage Dashboard

Persistance :

```text
User.preferences.dashboard.hiddenWidgetIds
```

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

Une préférence n’est jamais une autorisation. Un widget inaccessible n’est pas proposé, une demande d’affichage ne crée aucun droit et les composants non accessibles restent absents lorsque la convention produit le prévoit.

Le registre Workspace est explicite et extensible :

```text
frontend/src/app/application-dashboard.js
→ widgets Core
→ futurs widgets de modules métier explicitement composés
→ filtre features + permissions
→ préférences utilisateur
→ composition Dashboard
```

La V1 reste volontairement limitée à afficher/masquer. Pas de dashboard builder, drag-and-drop arbitraire, resize complexe ou personnalisation visuelle par widget sans besoin métier démontré.

### 3.4 Sens des widgets Workspace actuels

Les cartes actuellement présentes dans le Core Workspace — par exemple statut du workspace, rôle ou abonnement — servent surtout de contenu générique avant dérivation.

Elles ne définissent pas le futur Dashboard métier. Dans une application dérivée, les modules métier pourront déclarer leurs KPI et données opérationnelles via le point d’extension prévu.

### 3.5 Dashboard Platform

Le Dashboard Platform constitue déjà une surface fonctionnelle d’administration SaaS. Les domaines utilisateurs, workspaces, plans, abonnements, dérogations, usage/fichiers, audit et équipe Platform sont d’abord bornés par les permissions/projections backend puis éventuellement réduits par les préférences d’affichage.

### 3.6 UX validée

Le comportement final comprend :

- preview immédiate des switches avant sauvegarde ;
- `Annuler` restaure l’état persisté ;
- `Enregistrer` persiste l’affichage ;
- rééquilibrage automatique des grilles selon le nombre réel de widgets visibles ;
- bouton de personnalisation contextualisé dans les topbars Dashboard Workspace et Platform ;
- drawers partagés portallés au `document.body` pour rester attachés au viewport ;
- absence de requête pour certains widgets masqués lorsque le composant n’est pas monté ou que la requête est explicitement `skip`.

---

## 4. Roadmap immédiate

État canonique actuel :

```text
D-001 fermeture Account / Workspace                         VALIDÉ
D-014 points d'extension métier                             VALIDÉ
D-018 Équipe Platform / RBAC / invitations                  VALIDÉ
D-019 moteur sécurisé de rétention / purge Core             VALIDÉ
DOC-CODE-1 documentation source                             VALIDÉ
D-011 Design System + préférences                           VALIDÉ
D-020 invitation commerciale / offre privée découverte      EN COURS — validation manuelle finale différée
→ D-021 gate sécurité Auth / invitations / tokens           PLANIFIÉ
→ D-015 release/version/provenance/migrations               PLANIFIÉ
→ D-016 Playwright E2E Core                                 PLANIFIÉ
→ D-002 corbeille / restauration Files                      PLANIFIÉ — avant première dérivation
→ audit final architecture / sécurité / qualité
→ D-017 dérivation + upgrade pilote                         PLANIFIÉ
→ taguer ensuite seulement la release Core stable
```

D-011 n’est plus un blocker.

D-015 ne doit pas être ouvert tant que D-020 et D-021 ne sont pas clôturées ou explicitement reclassifiées.

D-002 doit être validée avant D-017 et avant la première dérivation métier réelle.

---

## 5. Prochain bloc à choisir

Le prochain bloc naturel est D-021, car il constitue la dernière gate de sécurité structurante avant le chantier de versionnement D-015, sous réserve de la validation manuelle finale restante de D-020.

D-021 doit commencer par un audit de l’existant et non par du code automatique.

Périmètre :

```text
Auth
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
reset password
rate limiting / anti-automation
```

Cibles documentées dans `docs/DEBT.md` :

```text
invitations temporaires par défaut → 7 jours
reset password                     → 15 minutes
single-use / rotation / révocation / replay / concurrence
anti-enumeration et rate limiting
stratégie anti-bot explicite
```

Google SSO reste actuellement dans D-010 et ne bloque pas Core 1.0 ; toute décision contraire doit d’abord modifier le cadrage canonique avant implémentation.

---

## 6. Méthode de reprise obligatoire

Avant tout nouveau code :

1. partir de `main` synchronisé ;
2. relire `docs/REPRISE-CURRENT.md` ;
3. relire la dette concernée dans `docs/DEBT.md` ;
4. inspecter le code et les tests réels ;
5. ne rien modifier pendant l’audit initial ;
6. proposer le périmètre exact et les écarts avant création d’une branche de travail ;
7. ne jamais mélanger plusieurs dettes dans le même lot sans décision explicite.

---

## 7. Rappel sur les applications dérivées

Le Core reste un socle générique clonable/évolutif. Les fonctionnalités métier doivent être ajoutées après dérivation via les points d’extension prévus.

Les préférences Dashboard validées dans D-011.C sont donc une infrastructure de composition, pas un métier en elles-mêmes.

Références principales :

```text
docs/DEBT.md
docs/derived-saas/EXTENSION-POINTS.md
docs/derived-saas/DERIVED-SAAS.md
docs/contracts/CAPABILITIES.md
```
