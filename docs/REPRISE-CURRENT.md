# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse sert d’amorce de reprise pour la fin de stabilisation du Core, le cadrage du versionnement puis la future dérivation métier.
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

Les anciennes synthèses de reprise ne sont pas autoritatives lorsqu’elles sont dépassées.

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement prêt pour la production.

---

## 2. État Git et validation de référence

### Baseline applicative validée et fusionnée dans `main`

```text
79c52c1ac922b0c6a5beb8475b003c1b00b62b44
refactor(ui): preserve responsive section tab overflow
```

Ce commit contient les deux branches finalisées puis intégrées par fast-forward :

```text
feature/d-002-file-trash-restore
→ feature/file-management-ux-storage
→ main
```

La relation Git avait été vérifiée avant fusion :

```text
main historique
→ D-002
→ File Management UX / Storage
```

Il n’y a donc pas eu de merge conflict ni de commit de merge artificiel.

Après cette baseline applicative, `main` avance uniquement par les commits documentaires de synchronisation de `docs/DEBT.md` puis du présent fichier. Toute nouvelle conversation doit vérifier le HEAD distant réel de `main` avant de travailler.

### Validation réellement déclarée

Avant fusion des deux branches :

```text
tests applicables → VERT
lint               → VERT
build frontend     → VERT
validation fonctionnelle / visuelle → OK
```

Cette validation porte sur la baseline applicative `79c52c1…`. Les commits documentaires suivants ne modifient pas le code exécutable.

Ne jamais inventer de nouvelle gate : si une future étape exige une gate globale, elle devra être réellement rejouée.

---

## 3. D-002 — Files : VALIDÉE et fusionnée

`docs/DEBT.md` porte désormais D-002 au statut :

```text
VALIDÉ — 2026-09-15
```

Le blocage D-002 avant D-017 et avant la première dérivation métier est levé.

### Cycle de vie Files validé

```text
fichier actif
→ suppression logique
→ corbeille
→ restauration
ou
→ suppression définitive volontaire
ou
→ suppression définitive automatique à l’échéance
```

Invariants importants :

- un fichier placé dans la corbeille continue de consommer `storage_bytes` tant que son contenu physique existe ;
- une restauration avant suppression physique ne réserve jamais le stockage une seconde fois ;
- la libération du quota intervient lors de la suppression physique effective ;
- restauration et suppression définitive sont protégées contre les concurrences par le mécanisme de claim existant ;
- les permissions restent séparées selon le niveau de pouvoir.

Permissions ajoutées :

```text
file:trash:read
file:restore
file:delete:permanent
```

La migration idempotente existante reste :

```text
npm run migration:file-trash-permissions
```

Elle doit faire partie de la discipline de déploiement/versionnement pour tout environnement possédant déjà des rôles système persistés.

### UX Files validée

La surface utilisateur est désormais concentrée sous :

```text
Ressources
└── Fichiers
```

La page comporte :

- titre `Fichiers` avec aide contextuelle ;
- carte `Stockage` uniquement consacrée à capacité utilisée / limite / restant / pourcentage ;
- métrique de stockage fondée sur `UsageMetric.storage_bytes` et la limite d’entitlement effective, pas sur une somme frontend des fichiers actifs ;
- onglets `Fichiers actifs <nombre>` et `Corbeille <nombre>` ;
- style d’onglets harmonisé avec la navigation secondaire de `Équipe de la Plateforme` ;
- `DataTable` partagé ;
- upload avec état d’attente explicite et spinner pendant validations backend / antivirus / persistance ;
- prévisualisation authentifiée PDF/JPEG/PNG via le flux de téléchargement existant ;
- téléchargement ;
- suppression logique ;
- restauration ;
- suppression définitive avec confirmation irréversible ;
- surbrillance de ligne au hover/focus dans la Corbeille.

Le vocabulaire utilisateur privilégie `suppression définitive` / `effacement` plutôt que le terme technique historique `purge`. Les identifiants internes historiques (`purgeScheduledAt`, services/jobs, etc.) n’ont pas été renommés sans nécessité.

Le widget Workspace Dashboard `Fichiers actifs` a été retiré : le Dashboard utilisateur est destiné à recevoir prioritairement les futurs KPI métier, tandis que stockage et gestion documentaire appartiennent à `Ressources > Fichiers`.

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

### Navigation secondaire / Tabs

Le Core possède désormais deux responsabilités distinctes mais visuellement harmonisées :

```text
SectionTabs
→ navigation URL avec NavLink
→ ex. Équipe de la Plateforme

components/ui/Tabs — variante section
→ changement de panneau Base UI dans une même surface
→ ex. Fichiers actifs / Corbeille
```

Les styles de navigation secondaire sont centralisés afin d’éviter leur divergence.

Règle de test Base UI : les composants portallés peuvent nécessiter `findByRole` après l’interaction d’ouverture. Les tests métier doivent viser le contrat applicatif stable, pas le DOM interne d’une bibliothèque tierce.

---

## 5. État canonique des dettes Core

Après synchronisation de D-002 :

```text
D-020  EN COURS
D-011  VALIDÉ
D-021  VALIDÉ
D-022  VALIDÉ
D-002  VALIDÉ — 2026-09-15
D-015  PLANIFIÉ
D-016  PLANIFIÉ
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

Dettes conditionnelles :

```text
D-008 notifications étendues
D-009 API Keys / Webhooks
D-010 authentification avancée / Google SSO
```

Google SSO ne bloque pas Core 1.0.

### Point documentaire à ne pas oublier

`docs/DEBT.md` maintient actuellement D-020 en `EN COURS` et la considère comme le blocker immédiat avant D-015.

Ne pas la déclarer implicitement clôturée dans une nouvelle conversation. Avant D-015, il faudra soit :

```text
constater que son critère de clôture est réellement atteint
→ la passer VALIDÉE

ou
justifier explicitement une reclassification
```

---

## 6. Questions utilisateur à traiter AVANT tout nouveau code

La prochaine conversation doit commencer par une phase de discussion et de décision.

L’utilisateur souhaite poser plusieurs questions autour du **versioning du Core** et du **clonage / dérivation du SaaS**.

Ne pas lancer automatiquement D-015, D-016, un audit UI ou un nouveau module avant d’avoir répondu à ces questions.

Les sujets à clarifier pourront notamment couvrir :

```text
version release candidate vs version stable
SemVer et signification réelle de v1.0.0
tag Git vs GitHub Release vs branche
moment où le Core doit être considéré comme gelé
clone Git vs fork vs template repository vs nouveau dépôt dérivé
nommage des dépôts dérivés
conservation ou non de l’historique Git
relation future avec le dépôt Core d’origine
stratégie d’upgrade d’un SaaS dérivé quand le Core évolue
remote upstream éventuel
risques de conflits Core / métier
provenance du Core dans chaque dérivé
migrations DB et configuration lors d’un clone puis d’un upgrade
README, docs et tests à conserver dans les dérivés
moment exact du premier clone pilote
place de D-016 et D-017 dans cette séquence
moment où créer le premier tag réellement immuable
```

Ce sont des sujets d’architecture de distribution : les réponses doivent précéder l’implémentation de D-015.

### Principe déjà retenu

D-015 doit être compris comme la construction d’une **release candidate reproductible du Core et de sa discipline de versionnement**, pas comme l’affirmation automatique que la première version produite est déjà le tag stable final immuable.

D-017 doit réellement tester :

```text
Core release candidate
→ dérivé pilote
→ ajout métier réel
→ évolution Core compatible
→ upgrade du dérivé
→ migrations/configuration
→ tests Core + métier + E2E
→ analyse des conflits et de la provenance
```

Le premier dérivé utile doit donc servir de validation réelle de la stratégie de clonage/upgrade, pas seulement de copie ponctuelle du dépôt.

---

## 7. Ce qui reste à décider / vérifier avant D-015

Après la phase de questions versioning/clonage, faire une revue bornée de ce qui reste réellement avant le gel de release candidate.

### 7.1 D-020

Statut canonique actuel : `EN COURS`.

Vérifier son critère de clôture réel et mettre le registre à jour avant D-015.

### 7.2 Audit transversal frontend restant

Une ancienne reprise listait encore :

```text
Dropdown menus
Tooltip / Popover / Accordion / Tabs
Badge / StatusBadge
primitives HTML / React directes restantes
Sidebar — revue dédiée d’alignement shadcn/ui
```

Cette liste ne doit pas être appliquée aveuglément : plusieurs composants ont évolué depuis. Il faut **réauditer l’état réel du code**, supprimer les points devenus obsolètes et ne conserver que les écarts démontrés.

Règle : audit avant migration ; ne pas réécrire un composant fonctionnel uniquement parce qu’une primitive Base UI existe.

La Sidebar reste un sujet de revue shadcn/ui connu, mais aucune réécriture globale ne doit être lancée sans décision explicite.

### 7.3 Reliquats techniques

Vérifier à partir du code réel :

- consommateurs éventuels de `use-dialog-focus.js` avant toute suppression ;
- contrôles HTML directs encore réellement justifiés ;
- warnings React Hooks précédemment connus ;
- documentation devenue obsolète ;
- cohérence des scripts, migrations, `.env.example` et opérations de setup.

### 7.4 Gate globale pré-D-015

Une fois la liste des derniers blockers fermée :

```text
backend npm run lint
backend npm test
frontend npm run lint
frontend npm test
frontend npm run build
validation manuelle des parcours critiques touchés
```

Cette gate doit être réellement exécutée avant de déclarer le Core prêt pour D-015.

### 7.5 Revue pré-versionnement

Faire un point explicite sur :

- dettes actives réelles ;
- README global du Core ;
- documentation historique à supprimer/archiver ;
- contrats canoniques ;
- migrations DB existantes et leur ordre ;
- scripts setup/dev/test/release ;
- `.env.example` ;
- absence de secrets/artefacts locaux ;
- séparation Core générique / futur métier ;
- stratégie de provenance ;
- stratégie de clonage et d’upgrade décidée avec l’utilisateur ;
- éléments volontairement différés après Core 1.0.

Résultat attendu :

```text
PRÊT POUR D-015
ou
LISTE FERMÉE DES BLOQUANTS RESTANTS
```

---

## 8. Roadmap actuelle proposée

Sous réserve des décisions prises lors des questions versioning/clonage :

```text
D-002 Files                                  VALIDÉ
→ questions / décisions versioning + clonage
→ clôture ou reclassification explicite D-020
→ audit final des reliquats pré-gel réellement encore applicables
→ gate globale pré-D-015
→ revue globale pré-versionnement
→ D-015 release candidate / SemVer / provenance / releases / migrations
→ D-016 Playwright E2E Core
→ audit final Core
→ D-017 dérivé pilote + premier module métier + test réel d’upgrade
→ corrections éventuelles
→ nouvelle gate
→ tag/release Core stable immuable lorsque la stratégie est réellement validée
```

Ne pas confondre :

```text
release candidate Core
≠
tag stable final
≠
produit dérivé production-ready
```

---

## 9. Préparation du futur SaaS métier

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

Les pages métier assemblent des composants ; les appels serveur restent via RTK Query ; la logique métier backend reste dans les services ; validation Zod stricte ; audit, soft delete, rôles et permissions sont réutilisés lorsque pertinent.

Les sujets production spécifiques du dérivé devront ensuite traiter D-003 à D-007, D-012 et D-013 selon le produit réel.

---

## 10. Prochaine conversation — ordre obligatoire

La prochaine conversation ne doit pas commencer par du code.

Ordre demandé :

```text
1. vérifier que la branche réelle est main ;
2. vérifier le HEAD distant réel de main ;
3. lire intégralement docs/REPRISE-CURRENT.md ;
4. lire dans docs/DEBT.md D-002, D-015, D-016, D-017 et D-020 ;
5. confirmer que D-002 est bien VALIDÉE et que les deux branches Files sont intégrées ;
6. répondre d’abord aux questions de l’utilisateur sur le versioning et le clonage du SaaS ;
7. challenger les options : avantages, risques, maintenabilité, upgrades, provenance et migrations ;
8. aboutir à une stratégie explicite avant tout code ;
9. seulement ensuite réévaluer les derniers blockers pré-D-015 ;
10. ne modifier aucun fichier tant que l’utilisateur n’a pas validé cette stratégie.
```

La discussion doit être pédagogique et concrète : expliquer la différence entre copie, clone, fork, template, release, tag, branche et mécanisme d’upgrade, puis relier ces choix au fonctionnement réel de `saas-core-api`.

---

## 11. Règles de travail à conserver

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
