# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état courant du Core au 2026-09-11, avec D-011 validée, D-020 intégrée, D-021 en cours sur une branche dédiée, les évolutions récentes du système d’entitlements Platform et les conventions UI transversales désormais formalisées. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-11**

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

## 2. État courant de développement

Branche de travail active :

```text
feature/d-021-auth-hardening-registration-security
```

`main` reste la branche de référence validée. Les travaux D-021 et les correctifs associés ne doivent pas être considérés comme validés tant que les gates locales complètes n’ont pas été réellement exécutées et confirmées.

Dernier incident connu avant la présente mise à jour :

```text
frontend build
→ échec sur un import résiduel vers components/shared/tooltip
```

Correction intégrée sur la branche :

```text
LogoutShortcut
→ migré vers components/ui/tooltip.jsx

test associé
→ aligné sur le comportement réel Base UI

ESLint
→ interdit désormais tout import vers l’ancien components/shared/tooltip
```

La validation locale finale reste à exécuter dans cet ordre :

```text
frontend lint
→ frontend tests
→ frontend build
```

Ne pas déclarer ce lot validé avant retour réel de ces trois gates.

---

## 3. Blocs validés avant versionnement

### 3.1 D-011 — Design System et préférences

D-011 est entièrement clôturée :

```text
D-011.A Design System Core                    VALIDÉ — 2026-09-09
D-011.B Préférences de confort                VALIDÉ — 2026-09-09
D-011.C Préférences d'affichage métier        VALIDÉ — 2026-09-10
```

Contrats essentiels :

```text
Plan / entitlement effectif
+
permissions utilisateur
→ ensemble réellement accessible

ensemble réellement accessible
+
préférences utilisateur
→ ensemble visible
```

Une préférence ne crée jamais une permission ou une feature.

Le Dashboard Workspace reste extensible par registres explicites. Les widgets Core servent de contenu générique avant dérivation ; les KPI métier seront ajoutés par les modules dérivés via les points d’extension prévus.

### 3.2 Convention d’équilibrage des KPI

Les Dashboards Workspace et Platform utilisent la logique partagée :

```text
frontend/src/components/shared/balanced-six-column-grid.js
```

Convention large écran :

```text
1 → 1
2 → 2
3 → 3
4 → 2 + 2
5 → 3 + 2
6 → 3 + 3
7 → 3 + 2 + 2
8 → 3 + 3 + 2
```

La composition dépend du nombre réellement rendu après permissions, entitlement et préférences.

---

## 4. Dashboard Platform — KPI économiques

Le cockpit Platform distingue les réalités économiques au lieu d’utiliser un compteur ambigu d’« abonnements actifs ».

KPI principaux lorsque les permissions correspondantes sont disponibles :

```text
Utilisateurs
Espaces de travail
Abonnements payants actifs
Accès gratuits actifs
Valeur mensuelle contractuelle estimée
```

Le backend résout une seule Subscription effective par workspace avec la priorité :

```text
commercial active valide
> trialing valide
> baseline active
```

Conséquences :

- un workspace payant n’est pas compté également comme Free à cause de sa baseline ;
- une offre commerciale privée gratuite `open_ended` est comptée dans les accès gratuits actifs ;
- les trials sont distincts des accès gratuits ;
- `freeActiveAccesses.viaCommercialInvitation` indique la provenance d’une invitation commerciale acceptée sans faire de l’invitation l’autorité des droits ;
- la Subscription effective reste l’autorité runtime.

Référence canonique :

```text
docs/platform-overview-dashboard-contract.md
```

---

## 5. D-020 — Invitation commerciale

### 5.1 État

D-020 est **intégré dans `main`** et ses gates automatisées applicables sont vertes.

Le parcours nominal a été validé manuellement jusqu’à :

```text
lien d’invitation
→ preview
→ inscription / connexion
→ acceptation
→ création du premier workspace
→ rôle Owner
→ Plan privé effectif
```

D-020 reste cependant `EN COURS` dans `docs/DEBT.md` tant que les contrôles manuels négatifs/restants n’ont pas été explicitement clôturés après les derniers correctifs.

### 5.2 Évolutions intégrées

D-020 comprend notamment :

- garde d’identité avant création du compte via le register commercial dédié ;
- vérification recipient authentifiée ;
- impossibilité d’accepter/refuser depuis un mauvais compte ;
- changement de compte sans persistance du secret ;
- refus explicite `pending → declined` ;
- audit `COMMERCIAL_INVITATION_DECLINED` ;
- logout de la session courante après refus, pas de logout-all ;
- stepper `Création du compte → Connexion → Acceptation de l’offre` ;
- statuts sémantiques colorés ;
- invalidation RTK Query après mutations pertinentes ;
- Dashboard Platform capable de compter les accès gratuits D-020 via la Subscription effective.

### 5.3 Secret

Le secret D-020 reste :

```text
32 octets cryptographiquement aléatoires
→ 64 caractères hexadécimaux
→ hash SHA-256 persisté uniquement
```

Le lien utilise `#token=<secret>`. Le frontend place le secret uniquement dans un vault runtime en mémoire et nettoie immédiatement le fragment. Aucun secret dans Redux, `localStorage`, `sessionStorage`, `history.state`, query string ou logs.

Référence canonique :

```text
docs/contracts/COMMERCIAL-INVITATIONS.md
```

### 5.4 Contrôles manuels restant à clôturer explicitement

Avant de passer D-020 à `VALIDÉ`, confirmer manuellement au minimum :

```text
mauvaise identité après correctif
→ aucune création/acceptation indue

refus bénéficiaire
→ invitation declined
→ acceptation ultérieure impossible
→ secret runtime nettoyé
→ session courante fermée comme prévu
```

Ne pas déclarer D-020 validée sur la seule base des tests automatisés.

---

## 6. Conventions UI et composants transverses

Références canoniques :

```text
docs/frontend/FRONTEND-GUIDELINES.md
docs/frontend/UI-SEMANTICS.md
docs/frontend/COMPONENTS-POLICY.md
```

### 6.1 Règle obligatoire de réutilisabilité

Toute mécanique UI générique ou récurrente doit être construite à partir d’un **composant réutilisable**.

La base UI de référence est :

```text
JavaScript uniquement
+
shadcn/ui
+
primitives Base UI utilisées par les composants shadcn du dépôt
+
Tailwind CSS / tokens du Design System
```

Ordre obligatoire avant toute création :

```text
1. components/ui
2. components/shared
3. components/forms
4. components/data-display
5. feature locale seulement si le besoin est réellement spécifique
```

Lorsqu’une primitive shadcn/Base UI adaptée existe, elle doit être utilisée ou composée. Une feature ne recrée pas localement la mécanique d’un Button, Select, Tooltip, Dialog, Drawer/Sheet, Slider, Tabs, Accordion, Skeleton, etc.

Un wrapper partagé n’est acceptable que s’il apporte une abstraction transverse réelle : sémantique produit, accessibilité, assemblage réutilisable ou convention du Design System. Il ne doit jamais simplement recopier la mécanique de la primitive shadcn/Base UI.

Exemple validé :

```text
components/shared/info-tooltip.jsx
→ composition métier/accessibilité
→ s’appuie sur components/ui/tooltip.jsx
```

Exemple désormais interdit :

```text
components/shared/tooltip.jsx
→ second moteur de tooltip maison
```

Cette règle vaut pour le Core et pour tous les futurs SaaS/modules dérivés.

### 6.2 Garde d’architecture

Les règles doivent être protégées par le lint ou les tests lorsqu’elles peuvent l’être de manière fiable.

Le frontend contient maintenant une garde ESLint interdisant toute réintroduction de l’ancien `components/shared/tooltip`.

Toute migration ou suppression d’un composant transverse doit suivre :

```text
inventaire exhaustif des imports/usages
→ migration complète
→ lint
→ tests
→ build
```

Le build ne doit plus être utilisé comme moyen principal pour découvrir successivement des imports cassés.

### 6.3 Statuts

Composant partagé :

```text
frontend/src/components/shared/status-badge.jsx
```

Convention sémantique :

```text
success      → vert    → normal / validé / opérationnel
warning      → orange  → attente / attention / blocage réversible
destructive  → rouge   → échec / révocation critique / état terminal
neutral      → gris    → archivé / inactif sans anomalie
```

Chaque domaine définit explicitement son mapping métier. Le composant générique ne devine jamais la couleur depuis la chaîne du statut.

### 6.4 Langue des saisies

Le document HTML est déclaré :

```text
lang="fr-FR"
```

Le `Textarea` partagé utilise par défaut :

```text
lang="fr-FR"
spellCheck=true
```

Le navigateur reste responsable du dictionnaire réellement installé/activé.

---

## 7. Entitlement Overrides Platform — direction courante

Le modèle produit doit rester **feature-centric** :

```text
Décision commerciale
├── feature
├── limites associées
├── période
├── origine
└── lifecycle
```

Les limites sont des paramètres opérationnels de la feature lorsqu’elles lui sont liées. Elles ne doivent pas être exposées comme plusieurs décisions commerciales indépendantes dans la vue principale.

Exemples de relations actuellement définies :

```text
team_management
→ members

file_upload
→ storage_bytes
→ file_uploads_monthly
```

Les grouped overrides conservent leurs enfants techniques en persistance pour audit/résolution, mais la vue commerciale principale doit agréger la décision par fonctionnalité.

Le backend de liste a été adapté pour exclure les LIMIT enfants groupés de la pagination commerciale principale tout en conservant les overrides LIMIT autonomes legacy.

Points encore à sécuriser avant de considérer ce sous-système finalisé :

```text
révocation atomique d’un groupe
protection contre update/revoke direct d’un enfant groupé
couverture dédiée du service de groupe
cohérence lifecycle complète
validation resolver / precedence
```

Ne pas traiter ces points comme clôturés tant que le code et les tests correspondants ne sont pas validés.

---

## 8. Roadmap canonique avant Core 1.0

État actuel :

```text
D-001 fermeture Account / Workspace                         VALIDÉ
D-014 points d'extension métier                             VALIDÉ
D-018 Équipe Platform / RBAC / invitations                  VALIDÉ
D-019 moteur sécurisé de rétention / purge Core             VALIDÉ
DOC-CODE-1 documentation source                             VALIDÉ
D-011 Design System + préférences                           VALIDÉ
D-020 invitation commerciale / offre privée découverte      EN COURS — code intégré, clôture manuelle finale restante
→ D-021 gate sécurité Auth / invitations / tokens           EN COURS — branche dédiée active
→ D-015 release/version/provenance/migrations               PLANIFIÉ
→ D-016 Playwright E2E Core                                 PLANIFIÉ
→ D-002 corbeille / restauration Files                      PLANIFIÉ — avant première dérivation
→ audit final architecture / sécurité / qualité
→ D-017 dérivation + upgrade pilote                         PLANIFIÉ
→ taguer ensuite seulement la release Core stable
```

D-015 ne doit pas être ouvert tant que D-020 et D-021 ne sont pas clôturées ou explicitement reclassifiées.

D-002 doit être `VALIDÉ` avant D-017 et avant la première dérivation métier réelle.

Google SSO reste dans D-010 et ne bloque pas Core 1.0 selon le cadrage canonique courant.

---

## 9. D-021 — Gate sécurité Auth / invitations / tokens

D-021 est en cours sur :

```text
feature/d-021-auth-hardening-registration-security
```

Premier bloc déjà travaillé :

```text
politique mot de passe
endpoint public de politique
séparation credential / new-password
rate limiting login / forgot password
reset password <= 15 minutes
UX frontend mot de passe
acceptation légale des flows de création de compte
parcours invitation workspace / nouveau compte
```

D-021 ne doit cependant pas être clôturée avant audit et validation du reste :

```text
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
single-use / rotation / révocation / replay / concurrence
anti-enumeration
rate limiting des endpoints publics sensibles
stratégie anti-bot explicite
protection de /invitations/accept-new
secrets / URLs / logs
```

La migration UI récente autour des composants shadcn/Base UI est un travail de qualité frontend associé à la branche, pas une preuve que la gate de sécurité D-021 est terminée.

---

## 10. Nettoyage de la base de développement

Un nettoyage des données de test reste souhaité avant de poursuivre trop loin, en conservant explicitement le compte fondateur et ses données nécessaires.

Ce nettoyage n’est pas une suppression aveugle et ne doit jamais commencer par un `deleteMany({})` global.

Avant toute exécution :

1. inspecter les modèles et dépendances actuelles ;
2. définir l’identité fondateur à préserver sans l’exposer dans les scripts/logs ;
3. établir un dry-run listant ce qui serait supprimé ;
4. traiter les dépendances dans un ordre cohérent ;
5. décider explicitement le traitement des AuditLogs de développement ;
6. exécuter seulement après validation du dry-run.

Cette opération de maintenance ne remplace aucune dette fonctionnelle.

---

## 11. Méthode de reprise obligatoire

Au début de la prochaine conversation :

1. vérifier la branche courante et synchroniser le dépôt ;
2. lire `docs/REPRISE-CURRENT.md` ;
3. lire D-020 et D-021 dans `docs/DEBT.md` ;
4. lire `docs/frontend/COMPONENTS-POLICY.md` avant toute modification UI ;
5. lire les contrats canoniques concernés par le lot ;
6. inspecter le code et les tests réels avant toute modification ;
7. ne jamais déclarer une gate verte sans exécution réellement communiquée ;
8. ne jamais remplacer une primitive shadcn/Base UI par un composant maison équivalent ;
9. ne jamais dupliquer une mécanique UI réutilisable dans une feature ;
10. ne jamais mélanger plusieurs dettes dans un même lot sans décision explicite.

Les petits correctifs isolés et à faible risque peuvent rester sur `main`. Les fonctionnalités, refactors structurés, lots multi-fichiers significatifs, changements d’architecture ou travaux à risque utilisent une branche dédiée.

---

## 12. Références principales

```text
docs/DEBT.md
docs/contracts/COMMERCIAL-INVITATIONS.md
docs/platform-overview-dashboard-contract.md
docs/frontend/UI-SEMANTICS.md
docs/frontend/FRONTEND-GUIDELINES.md
docs/frontend/COMPONENTS-POLICY.md
docs/derived-saas/EXTENSION-POINTS.md
docs/derived-saas/DERIVED-SAAS.md
docs/contracts/CAPABILITIES.md
```
