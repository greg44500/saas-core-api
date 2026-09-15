# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse sert d’amorce autoritative de reprise pour la fin de stabilisation du Core avant versionnement puis dérivation métier.
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

## 2. État Git au moment de cette synthèse

### `main`

HEAD vérifié avant fusion de FORM-2 :

```text
5cf9e9ea4237a987e06ac611000ef56574a365ef
merge(forms): harmonize shared field architecture
```

### Branche FORM-2

```text
feature/form-control-primitives-alignment
```

FORM-2 a été entièrement validé sur cette branche :

```text
tests ciblés          → VERT
frontend npm test     → VERT
frontend npm run lint → VERT
frontend npm run build→ VERT
validation visuelle / clavier → CONFORME
```

Le backend n’a pas été modifié par FORM-2 et n’a pas été rejoué spécifiquement pour ce lot.

La fusion de FORM-2 dans `main` a été explicitement autorisée par l’utilisateur le 2026-09-15.

**Important pour toute nouvelle conversation :** vérifier le HEAD réel de `main` avant toute conclusion. Si FORM-2 a été fusionné après la génération de ce document, Git et le code priment sur les SHA ci-dessus.

---

## 3. Lots UI / Design System déjà stabilisés

Les lots suivants sont validés et déjà fusionnés dans `main` avant FORM-2 :

```text
D-011.A Design System Core
D-011.B Préférences de confort
D-011.C Préférences d’affichage métier
DLG-1 Dialog / ConfirmationDialog Base UI
Select Base UI / UX
DLG-2 FileUploadDialog Base UI
Toast Base UI
Drawer / Sheet / EntityDetailsDrawer Base UI
FORM-1 architecture partagée des champs
```

FORM-2 est validé et autorisé à fusionner :

```text
Input     → primitive native partagée conservée
Textarea  → primitive native partagée conservée
Checkbox  → primitive native partagée conservée
Switch    → moteur migré vers @base-ui/react/switch
```

FORM-2 a également :

- harmonisé `data-slot` et états invalides des contrôles ;
- ajouté les tests de contrat des quatre primitives ;
- fait réutiliser `Input` par `DatePicker` et `DateTimePicker` ;
- remplacé les contrôles HTML directs audités dans les formulaires Platform/Workspace par les primitives partagées ;
- réaligné les acceptations d’invitations Workspace et Platform sur le contrat ARIA de FORM-1 ;
- conservé volontairement le file input technique de `FileUploadDialog` comme contrôle natif spécifique.

Aucune logique métier, validation Zod, mutation RTK Query, contrat API, RBAC ou Sidebar n’a été modifié par FORM-2.

---

## 4. Architecture frontend à préserver

```text
Design tokens
→ components/ui
→ components/shared
→ components/forms / components/data-display
→ features/*/components
→ pages = assemblage
```

Règles :

- JavaScript uniquement ;
- Tailwind CSS v4 CSS-first ;
- shadcn/ui + Base UI lorsque la primitive interactive le justifie ;
- HTML natif conservé lorsqu’il est déjà le meilleur contrat ;
- composants réutilisables obligatoires ;
- `DataTable` partagé pour les tableaux applicatifs ;
- RTK Query pour l’état serveur ;
- Redux Toolkit pour l’état global client ;
- `useState` pour l’état local ;
- aucune primitive générique concurrente sans justification ;
- les pages assemblent, elles ne portent pas de logique métier lourde ;
- validation stricte des données ;
- informations pédagogiques secondaires via `InfoTooltip` ;
- erreurs, blocages et conséquences sensibles restent visibles ;
- accessibilité structurelle toujours active, indépendamment du profil renforcé.

Règle de test Base UI : les composants portallés peuvent nécessiter `findByRole` après l’interaction d’ouverture. Les tests métier doivent viser le contrat applicatif stable, pas le DOM interne d’une bibliothèque tierce.

---

## 5. État canonique des dettes Core

Selon `docs/DEBT.md` :

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

Dettes non bloquantes pour Core 1.0 mais potentiellement bloquantes pour un produit réel :

```text
D-003 conformité / RGPD
D-004 Billing / Payment
D-005 observabilité
D-006 rétention / anonymisation réglementaire
D-007 stockage fichiers production
D-012 E2E du produit dérivé
D-013 configuration / déploiement production
```

Dettes conditionnelles / différées :

```text
D-008 notifications étendues
D-009 API Keys / Webhooks
D-010 authentification avancée / Google SSO
D-023 demande gouvernée de transfert de propriété — Core 1.1
```

Google SSO ne bloque pas Core 1.0.

---

## 6. Point complet : ce qu’il reste AVANT le versionnement D-015

Cette section distingue :

```text
blockers canoniques
+
travaux de stabilisation que nous avons volontairement choisi de terminer avant de figer le Core
```

### 6.1 Finaliser et fusionner FORM-2

FORM-2 est validé et autorisé à fusionner.

Après merge/push :

- vérifier le nouveau HEAD réel de `main` ;
- ne pas supprimer immédiatement la branche tant que la reprise n’est pas confirmée ;
- considérer FORM-2 comme clos sauf régression concrète.

### 6.2 Terminer l’audit transversal UI avant gel d’architecture

Ce chantier n’est pas listé comme dette bloquante autonome dans `DEBT.md`, mais il fait partie de notre objectif explicite de disposer d’un Core clonable, professionnel et maintenable avant versionnement.

Familles restant à auditer :

```text
1. Dropdown menus
2. Tooltip / Popover / Accordion / Tabs
3. Badge / StatusBadge
4. primitives HTML / React directes restantes
5. Sidebar — revue dédiée d’alignement shadcn/ui
```

Règle : **audit avant migration**. Pour chaque famille :

```text
inventaire réel
→ duplications
→ clavier / focus / ARIA
→ tokens / Design System
→ API du composant
→ responsabilité shared vs feature
→ tests
→ décision : conserver / harmoniser / migrer
```

Ne pas réécrire un composant fonctionnel uniquement parce qu’une primitive Base UI existe.

### 6.3 Contrôler les reliquats techniques UI

À vérifier explicitement pendant la fin de l’audit :

- consommateurs résiduels éventuels de `use-dialog-focus.js` avant suppression ;
- primitives HTML directes restantes réellement justifiées ;
- warnings React Hooks connus, sans les mélanger silencieusement à un autre lot :

```text
platform-entitlement-override-form.jsx
platform-retention-policy-form.jsx
platform-role-form-drawer.jsx
platform-roles-section.jsx
workspace-ownership-section.jsx
```

Ces warnings doivent être requalifiés : corriger si dette réelle, documenter/différer si choix intentionnel.

### 6.4 Clôturer D-020 — invitation commerciale

D-020 reste le **seul blocker métier/documentaire explicitement EN COURS avant D-015**.

Le contrat, la sécurité, le backend, le frontend et les tests sont déjà très avancés ; le critère de clôture restant déclaré dans `DEBT.md` est notamment la validation fonctionnelle manuelle finale.

Avant D-015 :

```text
validation fonctionnelle D-020
→ éventuels correctifs ciblés
→ tests applicables
→ mise à jour DEBT.md
→ D-020 VALIDÉ ou reclassification explicite et justifiée
```

D-020 doit être clôturée ou explicitement reclassifiée avant l’ouverture de la release candidate D-015.

### 6.5 Faire une gate globale pré-versionnement

Après les derniers lots UI et D-020, exécuter une gate complète avant de commencer D-015 :

```text
backend npm run lint
backend npm test
frontend npm run lint
frontend npm test
frontend npm run build
validation manuelle des parcours critiques touchés
```

Ne pas annoncer le Core stabilisé si une gate n’a pas été réellement exécutée.

### 6.6 Revue globale pré-D-015

Avant d’ouvrir D-015, faire un point explicite sur :

- dettes actives réelles ;
- documentation obsolète à supprimer ou archiver ;
- contrats canoniques ;
- README global du Core ;
- scripts de setup/dev/test/migration ;
- cohérence des `.env.example` et variables requises ;
- migrations DB existantes et discipline future ;
- séparation claire Core générique / futur métier ;
- absence de secrets, données locales ou artefacts de développement dans le dépôt ;
- structure des tests et commandes reproductibles ;
- liste des éléments volontairement différés après Core 1.0.

Cette revue doit produire une décision claire :

```text
PRÊT POUR D-015
ou
LISTE FERMÉE DES BLOQUANTS RESTANTS
```

---

## 7. D-015 — versionnement du Core

D-015 est la prochaine grande gate une fois la stabilisation précédente terminée.

À finaliser avant `v1.0.0` :

```text
SemVer
provenance Core
stratégie tags / releases
CHANGELOG / release notes
contrats et changements de configuration
migrations DB
ordre pre-deploy / post-deploy
reprise / rollback
provenance machine-readable
gate de release reproductible
```

D-015 ne signifie pas que le produit dérivé est prêt pour la production. Il stabilise la distribution et l’évolution du Core.

---

## 8. Ce qu’il reste APRÈS D-015 avant le premier vrai clone métier

Le registre canonique impose encore des étapes avant la première dérivation réelle.

### 8.1 D-016 — Playwright E2E Core

**Bloquant Core 1.0.**

Couvrir les parcours transversaux critiques :

```text
auth / session / refresh / logout
lifecycle Account / Workspace
isolation tenant
RBAC
subscription / entitlement / quota
administration Platform
Files
principaux états interdits
```

### 8.2 D-002 — corbeille / restauration Files

**Bloquant avant D-017 ET avant toute première dérivation métier.**

À implémenter :

- listing de corbeille ;
- restauration sécurisée ;
- permissions dédiées ;
- isolation Workspace ;
- restauration simple/multiple si pertinente ;
- cohérence existence physique / purge ;
- quotas ;
- audit ;
- UI `Ressources > Corbeille` avec `DataTable` partagé ;
- tests sécurité/concurrence.

Invariant : un fichier soft-deleted dont le contenu physique existe consomme toujours `storage_bytes`; une restauration avant purge ne réserve pas le stockage une seconde fois.

### 8.3 Audit final Core

Après D-015, D-016 et D-002, réaliser un audit final :

```text
architecture
sécurité
qualité
contrats
migrations
documentation
DX de clonage
séparation Core / métier
```

### 8.4 D-017 — vraie validation de dérivation + upgrade

D-017 ne consiste pas simplement à copier le dépôt.

Exercice canonique :

```text
release candidate Core
→ dépôt pilote dérivé
→ petit module métier réel
→ évolution Core compatible
→ upgrade réel du dérivé
→ migrations/configuration
→ tests Core + métier + E2E
→ analyse des conflits et de la provenance
```

Le premier clone métier doit donc devenir le **pilote de D-017** plutôt qu’un simple fork sans stratégie d’upgrade.

---

## 9. Séquence recommandée consolidée

```text
FORM-2 merge
→ audit UI restant
→ revue Sidebar dédiée
→ requalification des reliquats techniques UI
→ validation / clôture D-020
→ gate globale pré-versionnement
→ revue globale pré-D-015
→ D-015 versionnement / provenance / releases / migrations
→ D-016 Playwright E2E Core
→ D-002 corbeille / restauration Files
→ audit final Core
→ D-017 clone pilote + premier module métier + test d’upgrade
→ tag Core stable
```

Ne pas inverser D-002 et D-017 : `DEBT.md` rend D-002 bloquante avant toute première dérivation métier.

---

## 10. Préparation du futur SaaS métier

Avant de coder le métier dans le dérivé, cadrer séparément :

```text
périmètre fonctionnel
personas et rôles métier
workflows
modèle de données métier
permissions métier
entitlements / plans
composants réutilisables obligatoires
routes / services / validations
intégrations externes
sécurité et données sensibles
KPI / dashboards
notifications
fichiers
rétention / conformité
stratégie de tests
```

Le dérivé doit ajouter des modules métier sans casser les invariants du Core.

Les pages métier assemblent des composants ; les appels serveur restent via RTK Query ; la logique métier backend reste dans les services ; validation Zod stricte ; audit, soft delete, rôles et permissions sont réutilisés lorsque pertinents.

Les sujets production spécifiques du dérivé devront ensuite traiter D-003 à D-007, D-012 et D-013 selon le produit réel.

---

## 11. Prochaine conversation — première action obligatoire

La prochaine conversation ne doit pas démarrer directement par un nouveau lot de code.

Commencer par :

```text
1. vérifier la branche active et le HEAD réel de main ;
2. confirmer que FORM-2 est bien fusionné ;
3. lire docs/REPRISE-CURRENT.md ;
4. lire docs/DEBT.md et vérifier D-020 / D-015 / D-016 / D-002 / D-017 ;
5. inspecter l’état réel du dépôt ;
6. faire un point exhaustif de tout ce qui reste avant D-015 ;
7. classer chaque élément : BLOQUANT / À TERMINER AVANT GEL / DIFFÉRABLE ;
8. proposer l’ordre final de travail avant versionnement ;
9. ne modifier aucun fichier avant validation de ce plan.
```

Le premier audit UI restant connu est `Dropdown menus`, mais il ne doit être lancé qu’après le point global pré-versionnement demandé ci-dessus.

---

## 12. Règles de travail à conserver

- vérifier branche et HEAD avant modification ;
- toujours repartir de `main` pour un nouveau lot sauf décision explicite contraire ;
- code + DB + tests réellement exécutés priment sur la synthèse ;
- aucun merge implicite ;
- aucun changement hors périmètre ;
- JavaScript uniquement ;
- validation stricte ;
- composants réutilisables obligatoires ;
- audit avant migration ;
- plusieurs FAILS d’une même famille = analyse globale + correction par cause racine ;
- gate globale après un bloc transversal ;
- ne jamais annoncer une gate verte sans exécution réelle ;
- ne jamais supprimer un hook/composant partagé sans audit de consommateurs ;
- ne pas confondre Core 1.0 stabilisé et produit dérivé production-ready.

---

Le présent fichier est une synthèse de reprise. Il ne remplace ni Git, ni le code, ni les tests, ni les contrats canoniques, ni `docs/DEBT.md`.
