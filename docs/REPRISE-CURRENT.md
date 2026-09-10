# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état validé de `main` au 2026-09-10 après D-011, l’intégration D-020, les KPI économiques Platform et les dernières conventions UI transversales. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
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

Checkpoint code avant synchronisation documentaire :

```text
981eabf4cca49df98a58d6dfdf0cb7261ae984b0
```

Les commits suivants de `main` sont documentaires et ne modifient pas le comportement applicatif.

Gates locales les plus récentes communiquées par l’utilisateur :

```text
tests ciblés              OK
tests globaux             OK
lint                      OK
build frontend            OK
validation UI courante    OK
```

Aucun compteur de tests n’est enregistré ici lorsque seul le statut final a été communiqué.

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

Les Dashboards Workspace et Platform utilisent maintenant la même logique partagée :

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

Le cockpit Platform distingue désormais les réalités économiques au lieu d’utiliser un compteur ambigu d’« abonnements actifs ».

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

D-020 comprend maintenant :

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

## 6. Conventions UI transversales ajoutées

Référence :

```text
docs/frontend/UI-SEMANTICS.md
```

### 6.1 Statuts

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

Workspace actuel :

```text
active     → success
suspended  → warning
archived   → neutral
closed     → destructive
```

Cette convention doit être réutilisée par les futurs modules métier au lieu de recopier des classes Tailwind.

### 6.2 Langue des saisies

Le document HTML est maintenant déclaré :

```text
lang="fr-FR"
```

Le `Textarea` partagé utilise par défaut :

```text
lang="fr-FR"
spellCheck=true
```

Le navigateur reste responsable du dictionnaire réellement installé/activé. Le frontend ne peut pas installer un dictionnaire français côté utilisateur.

---

## 7. Roadmap canonique avant Core 1.0

État actuel :

```text
D-001 fermeture Account / Workspace                         VALIDÉ
D-014 points d'extension métier                             VALIDÉ
D-018 Équipe Platform / RBAC / invitations                  VALIDÉ
D-019 moteur sécurisé de rétention / purge Core             VALIDÉ
DOC-CODE-1 documentation source                             VALIDÉ
D-011 Design System + préférences                           VALIDÉ
D-020 invitation commerciale / offre privée découverte      EN COURS — code intégré, clôture manuelle finale restante
→ D-021 gate sécurité Auth / invitations / tokens           PLANIFIÉ
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

## 8. Nettoyage de la base de développement

Un nettoyage des données de test est souhaité avant de poursuivre trop loin, en conservant explicitement le compte fondateur et ses données nécessaires.

Ce nettoyage n’est pas une suppression aveugle et ne doit jamais commencer par un `deleteMany({})` global.

Avant toute exécution :

1. inspecter les modèles et dépendances actuelles ;
2. définir l’identité fondateur à préserver sans l’exposer dans les scripts/logs ;
3. établir un dry-run listant ce qui serait supprimé ;
4. traiter les dépendances dans un ordre cohérent : invitations, sessions/tokens, memberships, workspaces, subscriptions, metrics, fichiers, trial eligibility et autres collections réellement liées ;
5. décider explicitement le traitement des AuditLogs de développement ;
6. exécuter seulement après validation du dry-run.

Cette opération de maintenance ne remplace aucune dette fonctionnelle.

---

## 9. Prochain bloc structurant : D-021

D-021 est la dernière gate de sécurité structurante avant D-015, mais elle doit commencer par un **audit sans modification**.

Périmètre :

```text
Auth
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
forgot/reset password
rate limiting / anti-automation
```

Cibles canoniques à vérifier, pas à supposer :

```text
invitations temporaires par défaut → 7 jours
reset password                     → 15 minutes
single-use / rotation / révocation / replay / concurrence
anti-enumeration
rate limiting adapté aux endpoints sensibles
stratégie anti-bot explicite
```

D-021 ne doit pas recréer les protections déjà correctes et testées.

---

## 10. Méthode de reprise obligatoire

Au début de la prochaine conversation :

1. partir de `main` synchronisé ;
2. lire `docs/REPRISE-CURRENT.md` ;
3. lire D-020 et D-021 dans `docs/DEBT.md` ;
4. lire `docs/contracts/COMMERCIAL-INVITATIONS.md` ;
5. inspecter le code et les tests réels concernés ;
6. ne modifier aucun fichier pendant l’audit initial ;
7. confirmer d’abord les scénarios manuels D-020 restant à clôturer ;
8. proposer ensuite le périmètre exact de D-021 avant création d’une branche ;
9. ne jamais mélanger plusieurs dettes dans un même lot sans décision explicite.

Les petits correctifs isolés et à faible risque peuvent rester sur `main`. Les fonctionnalités, refactors structurés, lots multi-fichiers significatifs, changements d’architecture ou travaux à risque utilisent une branche dédiée.

---

## 11. Références principales

```text
docs/DEBT.md
docs/contracts/COMMERCIAL-INVITATIONS.md
docs/platform-overview-dashboard-contract.md
docs/frontend/UI-SEMANTICS.md
docs/frontend/FRONTEND-GUIDELINES.md
docs/derived-saas/EXTENSION-POINTS.md
docs/derived-saas/DERIVED-SAAS.md
docs/contracts/CAPABILITIES.md
```
