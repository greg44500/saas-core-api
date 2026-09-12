# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état réel du Core au 2026-09-12 après :
> - la fusion du chantier Design Tokens + Sidebar shadcn ;
> - l’alignement des Topbars Platform et Workspace ;
> - l’alignement ciblé des `Select` sur la primitive shadcn/Base UI ;
> - la mise en place de la gate de transfert de propriété exceptionnelle ;
> - le nettoyage UX de plusieurs textes pédagogiques vers `InfoTooltip` ;
> - le cadrage différé D-023 du workflow gouverné de demande de transfert pour Core 1.1.
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

Dernier HEAD connu avant la présente mise à jour documentaire :

```text
bc169c129d38353b48901984514f2e1f22d0ea26
docs: refine governed ownership transfer workflow
```

Dernier lot fonctionnel significatif avant les ajustements UI/documentaires :

```text
1904c42115e2ebc6ad1c63689223e1dedce350a7
feat(core): gate ownership transfer and align workspace controls
```

Commits récents importants :

```text
7efcb4c2  fix(frontend): align workspace topbar actions
1904c421  feat(core): gate ownership transfer and align workspace controls
6d7f21a7  test(frontend): cover select display labels
90875a0d  fix(frontend): render select labels from declared items
8049384d  fix(frontend): move files page guidance to info tooltip
392a41d7  test(frontend): align files page guidance and select interaction
276edef3  docs: defer governed ownership transfer requests to Core 1.1
bc169c12  docs: refine governed ownership transfer workflow
```

Toute nouvelle conversation doit vérifier le HEAD réel de `main` avant modification.

---

## 3. Validation réellement constatée — ne pas surinterpréter

État antérieur validé du chantier Sidebar/Topbar Platform :

```text
frontend suite globale avant dernière correction : 717 / 718 tests verts
unique échec : platform-layout.test.jsx
→ cause identifiée : mock obsolète ne transmettant plus le slot `actions`
→ test corrigé puis relancé de manière ciblée : VERT

autres tests ciblés Sidebar / Router / Topbar : VERT
frontend lint : VERT
frontend build : VERT
validation visuelle : effectuée
```

Puis, lors du lot ownership/select/UX, une exécution frontend ciblée a réellement produit :

```text
7 fichiers ciblés
39 tests
→ 5 fichiers verts
→ 2 fichiers en échec
→ 37 tests verts / 2 échecs
```

Les deux échecs avaient une même cause : `SelectValue` affichait la valeur technique (`__all__`, `standard`) au lieu du libellé utilisateur. La primitive partagée `components/ui/select.jsx` a ensuite été corrigée pour dériver les libellés depuis les `SelectItem`, et un test de primitive a été ajouté.

Après cette correction, la page Fichiers a encore été modifiée pour déplacer son sous-titre pédagogique vers `InfoTooltip`, avec adaptation du test de page.

**Important :** dans cette conversation, les résultats des relances ciblées postérieures à ces deux derniers correctifs n’ont pas encore été communiqués. Ne pas affirmer qu’ils sont verts tant qu’ils ne sont pas réellement exécutés localement.

Relances ciblées recommandées avant tout nouveau chantier si elles n’ont pas déjà été faites localement :

```text
frontend/src/components/ui/select.test.jsx
frontend/src/features/files/components/file-list-filters.test.jsx
frontend/src/features/subscription/components/commercial-lifecycle-section.test.jsx
frontend/src/features/files/pages/workspace-files-page.test.jsx
```

Les tests backend ciblés du lot ownership ont été demandés mais leur résultat n’a pas été communiqué dans cette conversation. Ne pas les marquer implicitement verts sans preuve locale.

Méthode à conserver :

- pendant les corrections, utiliser `npx vitest run <fichiers ciblés>` ;
- ne pas utiliser `npm test -- ...` si cela déclenche la suite complète dans ce dépôt ;
- regrouper les corrections par cause racine ;
- réserver les suites globales aux gates finales réellement utiles.

---

## 4. Design System / navigation — acquis à préserver

`D-011` reste **VALIDÉ**. Le chantier postérieur est un alignement transversal, pas une réouverture de D-011.

Architecture frontend de référence :

```text
Design tokens
→ components/ui
→ components/shared
→ components/data-display
→ features/*/components
→ pages = assemblage
```

Le frontend reste Tailwind CSS v4 CSS-first avec shadcn/ui + Base UI lorsque pertinent.

Pour chaque famille de composants :

```text
A. CONFORME
B. WRAPPER LÉGITIME
C. À MIGRER
D. À CONSERVER SPÉCIFIQUE
```

Ne jamais migrer vers shadcn par réflexe si le wrapper actuel apporte une responsabilité réelle.

### Sidebar / navigation

Le contrat suivant est conservé :

```text
coreWorkspaceNavigation
+
APPLICATION_WORKSPACE_NAVIGATION_MODULES
↓
composeWorkspaceNavigation()
↓
filtrage features + permissions
↓
AppSidebar
```

Le Core reste métier-neutre.

Le renderer partagé repose sur les primitives Sidebar / Collapsible / Popover / Sheet et couvre desktop, mode icône, mobile, groupes, tooltips, route active et navigation accessible.

Ne pas recréer une seconde Sidebar maison.

---

## 5. Topbars Platform et Workspace — état actuel

Les deux côtés utilisent désormais le même principe d’actions :

```text
[ Recherche extensible ] [ Identité ] [ Préférences d’affichage si contexte Dashboard ] [ Déconnexion ]
```

Le composant partagé est :

```text
frontend/src/components/shared/expandable-search.jsx
```

Responsabilité actuelle : UI seulement. Aucun moteur métier de recherche n’est inventé dans le Core.

`AuthenticatedUserIdentity` expose un slot `actions`, utilisé par Platform et Workspace pour placer les préférences avant la déconnexion.

Les préférences d’affichage restent contextuelles au Dashboard ; la recherche reste disponible plus largement dans la Topbar.

---

## 6. Select shadcn/Base UI — correction transversale récente

Les `select` natifs ciblés dans le lot récent ont été remplacés par la primitive partagée `components/ui/select.jsx` dans les surfaces concernées, notamment :

- filtre de catégorie des Fichiers ;
- périodicité de l’essai ;
- cible de downgrade ;
- sélection du nouveau propriétaire / rôle de remplacement ;
- motif de suspension Platform.

Un écart Base UI a été identifié : sans collection déclarée, `SelectValue` affichait la valeur technique au lieu du libellé.

La correction a été faite **dans la primitive partagée**, pas dupliquée dans chaque feature. Elle dérive la collection depuis les `SelectItem` déclarés afin que les triggers affichent les libellés utilisateurs.

Ne pas réintroduire des mappings locaux `value → label` dans chaque feature sauf cas réellement spécifique.

---

## 7. UX des textes pédagogiques

Règle validée :

```text
information secondaire / pédagogique
→ InfoTooltip `(i)`

conséquence importante d’une action
→ reste visible

opération sensible / destructive
→ explication visible obligatoire
```

Applications récentes :

- page Abonnement : plusieurs explications secondaires déplacées vers `InfoTooltip` ;
- Paramètres Workspace : information technique secondaire déplacée vers `InfoTooltip` ;
- page Fichiers : le sous-titre `Consultez et téléchargez...` a été déplacé dans un `(i)` à côté du titre ;
- les conséquences de fin d’essai, résiliation, transfert et autres opérations sensibles restent visibles.

Cette règle doit guider le reste de l’audit UI sans transformer toutes les descriptions en tooltips.

---

## 8. Transfert de propriété — gate exceptionnelle implémentée

Le transfert de propriété ne doit plus être considéré comme une fonction normale toujours disponible à l’owner.

Le mécanisme bas niveau actuel est une **capacité opérationnelle exceptionnelle**.

Contrat :

```text
Super administrateur Platform
→ permission réservée dédiée
→ autorise temporairement UN workspace
→ TTL serveur
→ autorisation révocable

owner courant
→ voit le workflow uniquement si l’autorisation est active
→ choisit la cible
→ choisit son rôle après transfert
→ confirme les conséquences
→ confirme son mot de passe courant
→ backend revalide
→ transfert transactionnel
→ autorisation consommée single-use
→ audit
```

### TTL

Variable backend :

```text
WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_TTL_HOURS
```

Règles :

- valeur serveur ;
- défaut 24 h ;
- validation stricte ;
- minimum > 0 ;
- maximum absolu 24 h ;
- le frontend ne décide jamais de la durée ;
- le backend calcule `expiresAt`.

### Sécurité

La permission Platform dédiée est `RESERVED`, donc non attribuable à un rôle Platform ordinaire. Le frontend ne doit pas disperser des tests `role === super_admin` : il consomme la permission effective.

Le transfert reste exécuté par l’owner lui-même, pas par le Super administrateur à sa place.

Le backend vérifie notamment autorisation active, expiration, révocation, consommation, owner courant, invariants d’unicité owner et mot de passe.

L’état courant de l’autorisation est porté par le Workspace ; AuditLog conserve l’historique.

---

## 9. D-023 — workflow gouverné différé à Core 1.1

`docs/DEBT.md` contient désormais D-023 :

```text
D-023 — Demande gouvernée de capacité exceptionnelle de transfert de propriété
Statut : DIFFÉRÉ — cible Core 1.1
Blocage Core 1.0 : non
```

### Décision v1.0

Avant D-023 :

- aucun bouton owner `Demander capacité de transfert` ;
- aucune cloche de demandes de transfert dans la Topbar Platform ;
- aucun workflow commercialisé comme un droit normal ;
- gate bas niveau existante conservée fermée par défaut.

Cette décision permet de versionner Core 1.0 sans implémenter prématurément le workflow complet.

### Cible Core 1.1

Le workflow prévu :

```text
Paramètres > Sécurité
→ owner crée une demande
→ WorkspaceOwnershipTransferRequest persistée
→ données workspace/identités référencées par IDs serveur
→ audit
→ compteur Platform
→ cloche Topbar Platform pour la permission réservée
→ /platform/ownership-transfer-requests
→ Super Admin examine
→ backend revalide l’éligibilité
→ Autoriser / Refuser sans ressaisie manuelle
→ autorisation temporaire existante
→ owner transfère avec réauthentification
→ single-use
→ clôture et audit
```

### Cloche Platform prévue

La cloche est un signal **spécifique D-023**, pas le prétexte à construire un centre de notifications générique.

Règles prévues :

- visible uniquement lorsque la permission réservée de traitement des transferts est présente ;
- en pratique réservée au Super administrateur ;
- cloche disponible même à zéro pour rester le point d’entrée de la file ;
- aucune pastille à zéro ;
- compteur des seules demandes `requested` réellement à traiter ;
- badge `1..9`, puis `9+` ;
- accessible name avec nombre en attente ;
- clic vers `/platform/ownership-transfer-requests`.

### Refus et nouvelle demande

Les blocages objectifs doivent venir du backend sous forme de codes structurés : workspace suspendu/inactif, owner invalide, `past_due`, cible inéligible, demande concurrente, autorisation concurrente, etc.

Le frontend traduit ces codes en explications actionnables.

Une demande refusée reste immutable dans l’historique. Après correction de la cause, l’owner crée une **nouvelle demande avec un nouveau `requestId`**.

Une simple remédiation de quota n’est pas automatiquement bloquante : toute règle de refus doit être justifiée par un risque réel de sécurité, gouvernance ou paiement.

D-023 ne doit pas être implémentée pendant l’audit UI actuel sauf décision explicite de changement de roadmap.

---

## 10. D-020 et roadmap Core 1.0

D-020 reste **EN COURS**.

Contrôles manuels négatifs restant à confirmer :

```text
mauvaise identité
→ aucune acceptation/création indue

refus bénéficiaire
→ invitation declined
→ acceptation ultérieure impossible
→ secret runtime nettoyé
→ session courante fermée comme prévu
```

Roadmap canonique actuelle :

```text
D-020 → clôturer ou reclassifier
D-015 → versionnement / provenance / releases / migrations
D-016 → Playwright E2E Core
D-002 → corbeille / restauration Files
→ audit final architecture / sécurité / qualité
D-017 → dérivation + upgrade pilote
→ tag Core stable ensuite

post-v1.0 :
D-023 → workflow gouverné de transfert — cible Core 1.1
```

D-002 doit être VALIDÉ avant D-017 et avant la première dérivation métier.

---

## 11. Audit transversal shadcn/ui / Base UI — travail à reprendre

Le chantier global n’est pas terminé. Tokens, Sidebar/navigation, Topbars et quelques `Select` ont été traités, mais le reste doit encore être audité.

Ne pas réauditer immédiatement Sidebar/tokens sauf régression concrète.

Priorité recommandée :

```text
1. DataTable partagé + primitive table
2. DataPagination
3. Dialog / modal / confirmations
4. Drawer / Sheet / panneaux latéraux
5. formulaires partagés
6. Input / Textarea / Checkbox / Switch
7. Select restant hors lot récent
8. Dropdown menus
9. Tooltip / Popover / Accordion / Tabs restants
10. Badge / StatusBadge
11. primitives HTML/React directes dans pages/features
```

Pour chaque famille :

- identifier le composant réel ;
- inventorier les usages ;
- détecter les duplications ;
- vérifier accessibilité clavier/ARIA/focus ;
- vérifier cohérence Design Tokens ;
- vérifier API et testabilité ;
- classer `CONFORME / WRAPPER LÉGITIME / À MIGRER / À CONSERVER SPÉCIFIQUE` ;
- distinguer problème réel et préférence stylistique ;
- proposer les migrations par valeur / risque ;
- ne rien coder avant validation utilisateur.

Le `DataTable` partagé reste obligatoire pour les tableaux applicatifs. L’objectif est de consolider cette abstraction, pas de créer plusieurs tables concurrentes.

---

## 12. Chantiers à garder séparés

Ne pas mélanger à l’audit UI :

```text
A. D-023 workflow de demande ownership Core 1.1
B. gouvernance de conservation des données
C. reset reproductible de la base de développement
D. validation négative finale D-020
E. D-015 versionnement / provenance / releases
F. D-016 Playwright E2E Core
G. D-002 corbeille / restauration Files
H. D-017 dérivation + upgrade pilote
```

---

## 13. Règles de travail pour la prochaine conversation

Conserver impérativement :

- travailler à partir de `main` ;
- vérifier branche et HEAD avant toute conclusion ;
- code + DB + tests réellement exécutés priment sur la synthèse ;
- JavaScript uniquement ;
- validation stricte des données ;
- séparation routes/controllers/services/models/validation côté backend ;
- pages frontend = assemblage, pas logique métier lourde ;
- `useState` pour état local ;
- Redux Toolkit pour état global client ;
- RTK Query pour état serveur ;
- composants réutilisables obligatoires ;
- DataTable partagé obligatoire pour les tableaux applicatifs ;
- shadcn/ui comme base des primitives génériques lorsqu’adapté ;
- wrappers custom conservés lorsqu’ils apportent une vraie responsabilité ;
- aucun snippet sauvage ;
- aucun changement hors périmètre ;
- expliquer avant d’implémenter ;
- ne pas coder pendant une phase d’audit avant validation explicite ;
- corrections par cause racine et lots cohérents ;
- tests ciblés avec `npx vitest run <fichiers>` pendant le développement ;
- ne pas relancer inutilement 700+ tests ;
- gate globale uniquement au moment utile de validation finale.

---

## 14. Amorçage recommandé du prochain chantier

La prochaine conversation doit reprendre **le reste de l’audit transversal UI**, après vérification rapide des validations ciblées encore non confirmées.

Ordre recommandé :

```text
1. se connecter à greg44500/saas-core-api ;
2. travailler à partir de main ;
3. vérifier le HEAD réel ;
4. lire intégralement docs/REPRISE-CURRENT.md ;
5. lire docs/DEBT.md, notamment D-011, D-020, D-023 et l’ordre de roadmap ;
6. ne modifier aucun fichier immédiatement ;
7. vérifier si les relances ciblées Select/Fichiers ont déjà été exécutées localement ;
8. si nécessaire, demander uniquement les tests ciblés manquants ;
9. auditer DataTable puis DataPagination ;
10. produire une matrice de conformité complète ;
11. attendre validation utilisateur avant toute implémentation.
```

Le présent document est une synthèse de reprise et non une source supérieure au code, aux tests ou aux contrats canoniques.
