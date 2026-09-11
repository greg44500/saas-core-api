# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état courant du Core au 2026-09-11, avec D-011 validée, D-020 intégrée mais encore en clôture manuelle, D-021 en cours sur une branche dédiée, les évolutions récentes du système d’entitlements Platform et les conventions UI transversales désormais formalisées. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
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

HEAD distant confirmé au terme du dernier lot :

```text
8209dd8fdc41b1edca353f0984c2c97239ffadc9
```

Derniers commits structurants du lot de stabilisation :

```text
9164db75e49f15cc1066fb5e19a11ee7996ac4ba
fix(frontend): load feature override groups in entitlement drilldown

8209dd8fdc41b1edca353f0984c2c97239ffadc9
test(frontend): align Base UI and entitlement contracts
```

Lors du dernier contrôle, la branche était :

```text
246 commits devant main
0 commit derrière main
```

Cette comparaison doit être revérifiée à chaque reprise ; elle n’est pas une donnée permanente.

`main` reste la branche de référence validée. La branche D-021 contient désormais un volume important de travaux cohérents et validés localement, mais **elle ne doit pas être fusionnée tant que D-021 n’est pas clôturée**. Ne pas interpréter la réussite des gates frontend comme une validation de la gate sécurité complète.

Dernières gates réellement exécutées et confirmées après les correctifs du lot :

```text
frontend npm test      → VERT
frontend npm run lint  → VERT
frontend npm run build → VERT
git diff --check       → PROPRE
```

Le diff a également été inspecté avant commit. Cette inspection a permis de détecter et restaurer un test Sidebar supprimé accidentellement alors que la suite Vitest restait verte. L’inspection du diff fait donc désormais partie de la gate qualité obligatoire.

Les migrations UI récentes ont notamment stabilisé :

```text
Tooltip → components/ui/tooltip.jsx, basé sur la primitive shadcn/Base UI du dépôt
Select  → composant partagé basé sur la primitive UI canonique
ancien components/shared/tooltip → supprimé et interdit par ESLint
```

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

Le projet ne mélange pas arbitrairement plusieurs familles de primitives. Lorsqu’un composant shadcn du dépôt repose sur Base UI, cette convention doit être conservée ; une feature ne réintroduit pas localement une variante Radix ou un moteur maison équivalent sans décision d’architecture explicite.

Ordre obligatoire avant toute création :

```text
1. components/ui
2. components/shared
3. components/forms
4. components/data-display
5. feature locale seulement si le besoin est réellement spécifique
```

Lorsqu’une primitive shadcn/Base UI adaptée existe, elle doit être utilisée ou composée. Une feature ne recrée pas localement la mécanique d’un Button, Select, Tooltip, Dialog, Drawer/Sheet, Slider, Tabs, Accordion, Skeleton, Sidebar, etc.

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
→ tests ciblés
→ tests globaux applicables
→ lint
→ build
→ inspection du diff
```

Le build ne doit plus être utilisé comme moyen principal pour découvrir successivement des imports cassés.

### 6.3 Convention de tests shadcn/Base UI

Les tests doivent privilégier :

```text
sémantique accessible
+
interaction utilisateur
+
résultat fonctionnel/métier
```

et éviter de figer un détail interne spécifique à une ancienne primitive UI.

Tooltip : ne pas supposer `role="tooltip"` si la primitive Base UI réellement utilisée ne l’expose pas dans le DOM de test. Vérifier le trigger accessible puis l’apparition du contenu après hover/focus.

Select : avec Base UI/JSDOM, utiliser un comportement utilisateur fiable. Pattern actuellement validé lorsque nécessaire :

```js
const trigger = screen.getByRole('combobox', { name: label });

trigger.focus();
await user.keyboard('{ArrowDown}');

await user.click(
  await screen.findByRole('option', { name: optionName }),
);
```

Un test ne doit pas être affaibli pour « faire passer » une migration de primitive : il doit conserver l’invariant utilisateur ou métier qu’il protégeait.

### 6.4 Statuts

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

### 6.5 Langue des saisies

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

### 7.1 Correctif drilldown validé le 2026-09-11

Une régression frontend a été corrigée dans le drilldown des dérogations :

```text
override targetType=feature
→ chargement du FeatureOverrideGroup associé
→ transmission featureGroup / loading / error au détail
→ bouton Modifier de nouveau disponible lorsque le groupe est chargé
```

Le correctif est porté par le commit `9164db75e49f15cc1066fb5e19a11ee7996ac4ba` et ses tests ont été intégrés au passage des gates globales frontend.

Ce correctif ne clôt **pas** les risques backend/lifecycle du sous-système.

Points encore à sécuriser avant de considérer ce sous-système finalisé :

```text
révocation atomique d’un groupe
protection contre update/revoke direct d’un enfant groupé
couverture dédiée du service de groupe
cohérence lifecycle complète
validation resolver / precedence
```

Ne pas traiter ces points comme clôturés tant que le code et les tests correspondants ne sont pas validés. Ils restent distincts de D-021 sauf interaction sécurité démontrée.

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

D-021 est **EN COURS** sur :

```text
feature/d-021-auth-hardening-registration-security
```

Le statut de `docs/DEBT.md` a été synchronisé le 2026-09-11 : D-021 n’est plus `PLANIFIÉ`, mais il n’est pas `VALIDÉ`.

### 9.1 Bloc déjà travaillé et validé localement

```text
politique centralisée de mot de passe
endpoint public de politique
séparation credential / new-password
validation backend stricte associée
rate limiting login / forgot-password
reset password <= 15 minutes
UX frontend de politique de mot de passe
acceptation légale des flows de création de compte concernés
parcours WorkspaceInvitation / nouveau compte
premières adaptations PlatformInvitation / CommercialInvitation présentes sur la branche
```

La qualité frontend associée au lot comprend également la migration vers les primitives shadcn/Base UI canoniques, la suppression du moteur Tooltip maison, la stabilisation des tests Base UI et le correctif du drilldown Entitlement Override. Ces éléments ne constituent pas, à eux seuls, la clôture de D-021.

### 9.2 Audit sécurité restant obligatoire

D-021 est d’abord une **gate d’audit de l’existant**. La prochaine conversation doit commencer par inspecter les modèles, services, routes, validations, middlewares et tests réels sans modifier le dépôt.

Pour chacun des flows suivants :

```text
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
forgot-password
reset-password
register
login
preview d’invitation
acceptation d’invitation
/invitations/accept-new et autres endpoints publics sensibles
```

établir une matrice :

```text
source du secret
entropie
stockage brut ou hashé
TTL
expiration serveur
single-use
atomicité
révocation
resend
rotation du secret
invalidation de l’ancien secret
replay
double consommation concurrente
identité bénéficiaire
anti-enumeration
rate limiting
audit log
fuite URL
fuite logs
fuite erreurs
couverture unitaire
couverture intégration
```

Chaque point doit être classé :

```text
CONFORME
PARTIEL
ABSENT
À CONFIRMER
```

Ne pas coder avant d’avoir produit cette matrice et identifié les écarts réels.

### 9.3 Politique cible invitations

À confirmer par l’audit du code actuel :

```text
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
→ expiration par défaut : 7 jours
```

Exigences : secret cryptographiquement aléatoire, secret brut jamais persisté lorsque le modèle permet un hash, expiration serveur, single-use atomique, révocation, resend avec rotation, protection replay/concurrence, absence de fuite logs/URLs persistantes, audit et tests.

### 9.4 Forgot / reset password

Politique cible :

```text
reset password token
→ durée : 15 minutes
→ usage unique
→ nouvelle demande requise après expiration
```

À auditer explicitement : token fort/hashé, expiration serveur, consommation atomique, anti-enumeration, rate limiting, notification après changement, invalidation des sessions après reset, replay et concurrence.

### 9.5 Rate limiting et anti-automation

Auditer séparément `register`, `login`, `forgot-password`, preview/acceptation d’invitations et endpoints Auth sensibles.

Ne pas installer automatiquement un CAPTCHA. La logique cible reste :

```text
protection serveur de base
→ validation stricte
→ rate limiting
→ analyse du risque réel
→ challenge anti-bot complémentaire/adaptatif si nécessaire
```

L’inscription publique doit être protégée contre création massive de comptes/trials et `forgot-password` contre le mail bombing.

### 9.6 Google SSO hors D-021

Google SSO reste dans D-010 et ne bloque pas Core 1.0.

### 9.7 Ordre recommandé pour terminer D-021

```text
D-021.1 inventaire sécurité transverse
→ D-021.2 WorkspaceInvitation
→ D-021.3 PlatformInvitation
→ D-021.4 CommercialInvitation
→ D-021.5 Auth tokens temporaires
→ D-021.6 endpoints publics / anti-automation
→ D-021.7 secrets / logs / URLs
→ D-021.8 replay / concurrence / atomicité
→ D-021.9 gates globales + documentation
→ D-021 VALIDÉ
→ fusion seulement ensuite dans main
```

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

## 11. Bloc Sidebar planifié après D-021

Le prochain refactor UI structurel est **planifié mais ne doit pas être mélangé à D-021**.

Séquence obligatoire :

```text
terminer D-021
→ gates globales
→ documentation synchronisée
→ fusion D-021 dans main
→ repartir de main
→ branche dédiée Sidebar
```

Nom de branche recommandé :

```text
refactor/frontend-shadcn-sidebar
```

La Sidebar Platform actuelle contient encore une mécanique custom de largeur/collapse/labels/flyouts. Les symptômes observés incluent notamment le clipping visuel des labels en mode réduit et une complexité croissante des tests liée aux détails CSS.

Le futur travail ne doit pas consister à empiler des correctifs CSS locaux. Il doit commencer par auditer la Sidebar canonique shadcn compatible avec les primitives Base UI retenues par le dépôt, puis déterminer si elle peut devenir la fondation partagée.

Architecture cible :

```text
components/ui/sidebar.jsx
→ primitive shadcn/Base UI canonique adaptée au dépôt

components/shared
→ uniquement composition transverse réelle si nécessaire

features/platform/components/platform-sidebar.jsx
→ navigation métier Platform, routes, groupes, RBAC

features/workspace/components/workspace-sidebar.jsx
→ navigation métier Workspace
```

La primitive UI ne doit connaître ni permissions Platform, ni workspace, ni subscription, ni features métier.

Ce bloc devra préserver : active route, navigation clavier, responsive/mobile, collapse icon-only, tooltips, flyouts/submenus, RBAC et accessibilité. Aucun nouveau moteur Sidebar maison ne doit être créé si la primitive shadcn/Base UI couvre le besoin.

---

## 12. Méthode de reprise et Git obligatoire

Au début de la prochaine conversation :

1. vérifier la branche courante, son HEAD et la synchronisation distante ;
2. lire `docs/REPRISE-CURRENT.md` ;
3. lire D-020 et D-021 dans `docs/DEBT.md` ;
4. lire `docs/frontend/COMPONENTS-POLICY.md` avant toute modification UI ;
5. lire les contrats canoniques concernés par le lot ;
6. inspecter le code et les tests réels avant toute modification ;
7. pour D-021, produire d’abord la matrice d’audit avant tout code ;
8. ne jamais déclarer une gate verte sans exécution réellement communiquée ;
9. ne jamais remplacer une primitive shadcn/Base UI par un composant maison équivalent ;
10. ne jamais dupliquer une mécanique UI réutilisable dans une feature ;
11. ne jamais mélanger plusieurs dettes dans un même lot sans décision explicite.

Pour chaque lot de code :

```text
modifier
→ tests ciblés
→ tests globaux applicables
→ lint
→ build
→ git diff --check
→ git diff --stat
→ inspection complète du git diff
→ commit
→ push
```

Ne pas commit/push avant inspection du diff. Ne pas fusionner une dette structurante simplement parce qu’un sous-lot passe les tests ; la gate fonctionnelle/sécurité de la dette doit être réellement clôturée.

Les petits correctifs isolés et à faible risque peuvent rester sur `main`. Les fonctionnalités, refactors structurés, lots multi-fichiers significatifs, changements d’architecture ou travaux à risque utilisent une branche dédiée.

---

## 13. Références principales

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
