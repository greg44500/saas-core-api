# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état réel du Core au 2026-09-12 après les corrections Platform post-D-022 et avant l’audit transversal de cohérence shadcn/ui / Base UI.
>
> Le code actuel, les contraintes de base de données, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-12**

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

Les anciennes synthèses de reprise ne sont pas autoritatives lorsqu’elles sont dépassées.

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement prêt pour la production.

---

## 2. État Git de référence

Branche de référence :

```text
main
```

HEAD fonctionnel de `main` au moment de cette mise à jour :

```text
e8d6c178e93cb2031b74433f0b8beacbc7a3a316
Merge client user KPI semantics
```

Ce merge correspond à la PR #9 et aligne les KPI utilisateurs Platform sur la population cliente réelle.

Les principaux merges récents à conserver en tête sont :

```text
PR #7  fix(retention): polish retention purge UX
PR #8  fix(platform): clarify user population KPI
PR #9  fix(platform): align client user KPI semantics
```

Toute nouvelle conversation doit relire le HEAD réel de `main` avant modification, car un commit documentaire peut avoir été ajouté après ce SHA.

---

## 3. Gates et validations récentes

### 3.1 D-022

La clôture D-022 a été confirmée par des exécutions locales explicites :

```text
tests ciblés backend Entitlement          → VERT
tests ciblés frontend Entitlement         → VERT
backend tests globaux                     → VERT
frontend tests globaux                    → VERT
lint applicable                           → VERT
frontend build                            → VERT
```

### 3.2 UX Rétention & purge

Le lot UX Rétention & purge a été validé localement avant fusion :

```text
tests ciblés                              → VERT
tests globaux                             → VERT
lint                                      → VERT
build                                     → VERT
```

### 3.3 KPI Utilisateurs clients

Le comportement final a été contrôlé visuellement et les tests demandés ont été annoncés comme verts par l’utilisateur avant fusion de la PR #9.

Ne pas déduire d’autres gates non explicitement réexécutées après une future modification : chaque nouveau lot devra refaire ses propres validations.

---

## 4. D-021 — Gate sécurité Auth, invitations et tokens temporaires

**État : VALIDÉE le 2026-09-12.**

Invariants à conserver :

```text
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
→ expiration par défaut : 7 jours
→ secret serveur 32 octets
→ SHA-256 uniquement en persistance
→ rotation au resend
→ single-use atomique
→ replay/concurrence refusés
```

Les liens sensibles utilisent `#token=...`; le frontend capture le secret en mémoire puis nettoie l’URL. Aucun secret temporaire ne doit être persisté dans Redux, `localStorage`, `sessionStorage` ou `history.state`.

Password reset : token aléatoire 32 octets, hash SHA-256, expiration 15 minutes, usage unique atomique, révocation des sessions après succès et protections d’anti-enumeration/rate limiting validées.

Google SSO reste volontairement dans D-010 et ne bloque pas Core 1.0.

---

## 5. D-022 — Intégrité des Entitlement Override Groups

**État : VALIDÉE le 2026-09-12 ; `docs/DEBT.md` porte le statut canonique.**

Contrat protégé :

```text
Décision commerciale groupée
├── FEATURE principale
├── LIMIT(s) associée(s)
├── période
├── origine
└── lifecycle
```

Invariants validés :

- création groupée transactionnelle ;
- modification groupée ;
- révocation groupée atomique ;
- même métadonnée de révocation pour tous les membres ;
- audit de chaque override ;
- update/revoke unitaire interdit au niveau service pour tout document possédant `groupId` ;
- `relatedLimits` conserve une sémantique de patch partiel ;
- mutation RTK Query dédiée pour la révocation de groupe ;
- page Platform routant automatiquement un groupe vers la mutation groupée ;
- précédence du resolver déterministe : `startsAt`, puis `createdAt`, puis `_id`, tous décroissants.

Les enfants LIMIT d’un groupe restent des données techniques de résolution/audit et ne doivent pas être présentés comme plusieurs décisions commerciales indépendantes dans la vue principale.

---

## 6. D-020 — Invitation commerciale

D-020 est intégrée dans `main` et ses gates automatisées applicables sont vertes.

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

D-020 reste cependant `EN COURS` dans `docs/DEBT.md` tant que les contrôles manuels négatifs restants n’ont pas été explicitement clôturés.

Contrôles à confirmer avant passage à `VALIDÉ` :

```text
mauvaise identité
→ aucune création/acceptation indue

refus bénéficiaire
→ invitation declined
→ acceptation ultérieure impossible
→ secret runtime nettoyé
→ session courante fermée comme prévu
```

Ne pas modifier son statut sans validation explicite.

---

## 7. Corrections Platform post-D-022

### 7.1 Rétention & purge — UX

La page Platform `Rétention & purge` a été nettoyée sans modifier le moteur D-019 :

- vocabulaire utilisateur francisé ;
- suppression des explications anglaises ou trop techniques visibles ;
- explication du workflow de purge via tooltip `(i)` plutôt que textes redondants ;
- motif d’indisponibilité de la purge rendu compréhensible ;
- statuts alignés sur les conventions sémantiques `success`, `warning`, `destructive/error` ;
- erreur d’exécution visuellement signalée avec le token d’erreur ;
- pas de coloration agressive de ligne entière.

Le moteur de purge lui-même reste celui validé par D-019.

### 7.2 Gouvernance future des historiques et "vidage" de tableaux

Décision à conserver : **ne pas ajouter maintenant de bouton générique “vider le tableau”.**

La pagination règle le volume affiché ; elle ne règle pas la conservation en base.

Avant toute suppression d’historique, il faudra définir une matrice de gouvernance des données précisant au minimum :

```text
type de donnée
→ valeur d’audit / valeur métier / donnée technique
→ durée de conservation
→ archivage éventuel
→ purge automatique autorisée ou non
→ suppression manuelle autorisée ou non
→ rôle/permission autorisé
→ prévisualisation obligatoire ou non
→ audit de la suppression
```

Sont notamment concernés : AuditLogs, historiques d’exécution, invitations, sessions, fichiers, historiques commerciaux et autres tableaux volumineux.

Ce chantier doit être traité dans une conversation dédiée. Il ne doit pas être mélangé à l’audit UI.

---

## 8. Sémantique canonique des utilisateurs Platform

La Vue d’ensemble ne doit plus confondre **identité technique `User`**, **collaborateur interne Platform** et **utilisateur client**.

### 8.1 Organisation interne

`PlatformTeamMember` représente l’appartenance à l’équipe interne de la plateforme.

Les membres Platform actifs ou suspendus sont des collaborateurs internes et restent comptés dans la section **Organisation interne**.

Cette section n’a pas été modifiée par la correction KPI utilisateurs clients.

### 8.2 Utilisateur client

Le KPI principal et `Clients > Utilisateurs` utilisent désormais la même population métier :

```text
User non clôturé
+ au moins un WorkspaceMember actuel
  (active ou suspended)
- membre Platform Team actuel
  (active ou suspended)
= utilisateur client
```

Un membre Platform révoqué n’est plus un collaborateur interne courant ; s’il possède encore une relation Workspace admissible, il peut donc appartenir à la population cliente.

Les invitations en attente ne sont pas des utilisateurs tant qu’aucun compte n’existe.

### 8.3 Répartition utilisateur visible

La Vue d’ensemble affiche le KPI **Utilisateurs clients** et une répartition visuelle réutilisant `DistributionBarChart`, au lieu de cacher les détails dans un tooltip dense.

Les catégories restent visibles même lorsqu’elles sont à zéro afin de rendre les profils possibles explicites.

Répartitions retenues :

```text
État du compte
- Comptes actifs
- Comptes désactivés
- Suppression demandée

Accès aux espaces
- Au moins un accès actif
- Accès suspendus uniquement

Relation aux espaces
- Propriétaires d’au moins un espace
- Membres sans propriété d’espace
```

Une répartition naïve par rôle Workspace n’a pas été retenue, car un même utilisateur peut appartenir à plusieurs workspaces avec plusieurs rôles et serait alors compté plusieurs fois.

Les rôles Workspace système restent :

```text
owner
admin
manager
member
reader
```

avec possibilité de rôles personnalisés.

---

## 9. Reset futur de la base de développement

Le nettoyage des données de test est souhaité avant versionnement afin de faciliter la validation visuelle des KPI.

Décision : ne pas nettoyer MongoDB manuellement au fil de l’eau.

Prévoir une opération de reset/seed de développement reproductible et contrôlée qui puisse ramener l’environnement à un état connu, notamment :

```text
fondateur valide
+ AuthIdentity nécessaire
+ PlatformTeamMember fondateur / super_admin valide
+ rôles Platform système nécessaires
+ plans / baseline système nécessaires

sans :
- workspaces de test
- subscriptions de test
- utilisateurs clients de test
- fichiers de test
- invitations de test
- AuditLogs parasites
- autres historiques de test non nécessaires
```

État attendu pour la validation du cockpit après reset :

```text
Utilisateurs clients : 0
Workspaces clients : 0
Organisation interne : fondateur présent
```

Ce reset doit être traité dans une conversation dédiée et ne doit pas être lancé pendant l’audit UI.

---

## 10. Design System validé et audit transversal à lancer

D-011 est `VALIDÉ` dans `docs/DEBT.md` et ne doit pas être rouvert automatiquement.

Architecture de référence :

```text
Design tokens
→ components/ui : primitives du design system
→ components/shared : compositions réutilisables transversales
→ components/data-display : compositions génériques de restitution des données
→ features/*/components : composants métier composés à partir des briques précédentes
```

Le frontend utilise Tailwind CSS v4, shadcn/ui et les primitives Base UI présentes dans le dépôt.

### 10.1 Problème à auditer

Des composants partagés ou des pages peuvent encore utiliser des primitives construites directement en HTML/React alors qu’un équivalent shadcn/ui / Base UI serait plus cohérent.

L’exemple déjà identifié est le `DataTable` partagé : il est réutilisable, ce qui est positif, mais il faut vérifier si sa primitive de table/pagination respecte réellement la convention Design System.

Le même contrôle doit être fait pour :

```text
- tableaux
- pagination
- sidebar / navigation
- boutons
- modales / dialogs
- drawers
- sheets
- composants de formulaire
- inputs / textarea
- select
- checkbox
- switch
- dropdown menus
- tooltips
- badges / statuts
- tabs / accordion / popover si présents
```

### 10.2 Principe de décision

L’audit **ne doit pas devenir une migration aveugle vers shadcn**.

Pour chaque famille de composants, déterminer :

```text
A. CONFORME
   primitive shadcn/Base UI déjà correctement utilisée

B. WRAPPER LÉGITIME
   composant partagé maison pertinent,
   mais construit au-dessus des primitives du Design System

C. À MIGRER
   primitive générique recréée localement sans bénéfice clair

D. À CONSERVER SPÉCIFIQUE
   implémentation custom justifiée parce qu’elle est plus sûre,
   plus maintenable, plus accessible ou répond à une contrainte réelle
   que la primitive disponible ne couvre pas proprement
```

Critères obligatoires :

- cohérence globale ;
- réutilisabilité ;
- accessibilité clavier/ARIA/focus ;
- sécurité des interactions sensibles ;
- maintenabilité ;
- testabilité ;
- stabilité API des composants ;
- absence de duplication ;
- coût et risque de migration ;
- compatibilité avec le Design System et les tokens.

Un composant partagé applicatif n’est pas interdit simplement parce qu’il est “maison”. Ce qui doit être évité est la réinvention inutile d’une primitive générique déjà fournie par le Design System.

### 10.3 Méthode obligatoire du prochain chantier

La prochaine conversation doit commencer par **un audit sans modification**.

Ordre recommandé :

```text
1. vérifier main + HEAD ;
2. lire REPRISE-CURRENT.md ;
3. relire la section D-011 de DEBT.md ;
4. inventorier components/ui ;
5. inventorier components/shared ;
6. inventorier components/data-display ;
7. rechercher les primitives HTML/React directes dans les pages/features ;
8. produire une matrice de conformité ;
9. classer les migrations par risque et valeur ;
10. seulement après validation utilisateur, découper les migrations en lots indépendants.
```

Ne modifier aucun composant pendant la phase d’audit.

---

## 11. Blocs déjà validés à conserver

```text
D-001 fermeture Account / Workspace                         VALIDÉ
D-011 Design System + préférences                           VALIDÉ
D-014 points d’extension métier                             VALIDÉ
D-018 Équipe Platform / RBAC / invitations                  VALIDÉ
D-019 moteur sécurisé de rétention / purge Core             VALIDÉ
DOC-CODE-1 documentation source                             VALIDÉ
D-021 sécurité Auth / invitations / tokens temporaires      VALIDÉ
D-022 intégrité Entitlement Override Groups                 VALIDÉ
```

Ne pas rouvrir ces dettes uniquement parce qu’un audit de cohérence identifie une amélioration locale. Reclasser uniquement si un écart réel aux invariants canoniques est démontré.

---

## 12. Roadmap et chantiers à garder séparés

Statuts canoniques selon `docs/DEBT.md` :

```text
D-020 invitation commerciale / offre privée découverte      EN COURS
D-015 release/version/provenance/migrations                 PLANIFIÉ
D-016 Playwright E2E Core                                   PLANIFIÉ
D-002 corbeille / restauration Files                        PLANIFIÉ
D-017 dérivation + upgrade pilote                           PLANIFIÉ
```

Chantiers fonctionnels identifiés mais à traiter séparément :

```text
A. audit transversal shadcn/ui / Base UI
B. gouvernance de conservation des données + vidage contrôlé des historiques
C. reset reproductible de la base de développement avant versionnement
D. clôture manuelle négative D-020
E. reprise de la roadmap canonique vers D-015 puis D-016 / D-002 / D-017
```

Ne pas regrouper A, B et C dans une même branche ou une même conversation d’implémentation.

---

## 13. Reprise dans une nouvelle conversation

Pour le prochain chantier **audit transversal shadcn/ui / Base UI**, commencer par :

```text
1. se connecter au dépôt greg44500/saas-core-api ;
2. travailler à partir de main ;
3. vérifier le HEAD réel de main ;
4. lire docs/REPRISE-CURRENT.md ;
5. lire docs/DEBT.md, en particulier D-011 ;
6. auditer le frontend réel sans modifier de fichier ;
7. produire une matrice CONFORME / WRAPPER LÉGITIME / À MIGRER / À CONSERVER SPÉCIFIQUE ;
8. couvrir au minimum tableaux, pagination, sidebar, boutons, dialogs/modales, drawers/sheets et composants de formulaire ;
9. justifier chaque décision par cohérence, accessibilité, sécurité, maintenabilité et réutilisabilité ;
10. attendre validation utilisateur avant toute migration.
```

Le présent document est une synthèse de reprise et non une source supérieure au code, aux tests ou aux contrats canoniques.
