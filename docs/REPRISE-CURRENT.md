# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse sert d’amorce de reprise pour D-025 — Centre d’aide sécurisé Workspace / Platform, dernier développement fonctionnel générique décidé avant le gel pré-versionnement du Core.
>
> Le code actuel, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-16**

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

## 2. État Git de référence

### `main` vérifié avant ouverture de D-025

```text
5a48859b415ebd5d56bfed0f2a0fe75eec4476fc
docs(debt): register D-024 workspace control center
```

Ce HEAD de `main` intègre la dette différée D-024 et constitue la base de la branche D-025.

### Branche de travail ouverte

```text
feature/d-025-help-center
```

Elle a été créée directement depuis `main` au SHA `5a48859b415ebd5d56bfed0f2a0fe75eec4476fc`.

Avant tout nouveau travail, vérifier le HEAD distant réel de cette branche : Git et le code restent prioritaires sur cette synthèse.

### État applicatif

Aucun code backend ou frontend D-025 n’a encore été écrit au moment de cette synthèse.

Les modifications déjà présentes sur la branche sont documentaires :

```text
docs/debt/D-025-secure-help-center.md
docs/DEBT.md
docs/REPRISE-CURRENT.md
```

Aucune nouvelle gate applicative n’a donc été exécutée pour D-025. Ne jamais annoncer de tests/lint/build verts pour cette branche sans les exécuter réellement.

---

## 3. Décision produit : D-025 avant le gel Core

Le Core possède une documentation technique/interne importante, mais aucune aide fonctionnelle directement utilisable par un membre Workspace ou un membre Platform.

Cette absence est désormais considérée comme un manque générique du Core avant versionnement.

D-025 est donc :

```text
PLANIFIÉ
Blocage Core 1.0 : OUI
Position : dernier développement fonctionnel générique avant gate pré-D-015
```

Spécification détaillée :

```text
docs/debt/D-025-secure-help-center.md
```

Le chatbot / assistant IA n’est pas un blocker Core 1.0 et n’appartient pas au MVP D-025.

---

## 4. Vision fonctionnelle validée D-025

### Deux centres d’aide fonctionnels distincts

Le système doit distinguer clairement :

```text
contexte Workspace
→ Centre d’aide Workspace

contexte Platform
→ Centre d’aide Platform
```

Un utilisateur Workspace ne doit pas recevoir les procédures réservées aux membres Platform.

Un utilisateur disposant des deux contextes accède au centre correspondant à la surface dans laquelle il travaille.

### Une seule infrastructure technique

Il ne faut pas créer deux systèmes parallèles.

```text
Aide Workspace ─┐
                ├→ composants partagés + modèle d’aide commun
Aide Platform ──┘
```

La séparation des audiences est fonctionnelle et sécuritaire ; la composition technique reste réutilisable.

---

## 5. UX déjà décidée

### 5.1 Catégories

Chaque centre doit comporter **4 ou 5 catégories maximum**.

Les intitulés définitifs doivent être définis après inventaire des workflows réels. Les catégories doivent utiliser le vocabulaire utilisateur, pas les noms de modèles backend.

Exemples de cadrage non contractuels :

```text
Workspace
- Mon compte
- Workspace & équipe
- Ressources
- Offre & accès
- Sécurité & dépannage

Platform
- Utilisateurs & Workspaces
- Plans & abonnements
- Accès & dérogations
- Administration
- Sécurité & exploitation
```

### 5.2 Tooltips

Chaque catégorie peut disposer d’un tooltip très bref indiquant son contenu.

Le tooltip doit :

- rester léger et succinct ;
- orienter l’utilisateur ;
- ne jamais remplacer la fiche d’aide ;
- rester accessible clavier/lecteur d’écran.

### 5.3 Recherche prédictive

La recherche doit permettre de commencer à écrire puis de voir les résultats se préciser au fil de la saisie.

Règle UX retenue :

```text
saisie progressive
→ 3 à 5 suggestions maximum
→ classement de plus en plus précis
→ sélection clavier ou souris
→ ouverture de la fiche
```

La recherche doit pouvoir exploiter au minimum :

```text
titre
mots-clés
questions/formulations prédéfinies
contenu si nécessaire
```

Exemple :

```text
fiche : Inviter un membre dans un workspace
mots-clés : invitation, membre, utilisateur, équipe, ajouter
questions :
- Comment inviter un membre ?
- Comment ajouter un utilisateur ?
- Ajouter quelqu’un à mon workspace
```

Le classement doit privilégier les correspondances fortes avant le simple plein texte.

---

## 6. Sécurité D-025 — exigence prioritaire

Le principe de sécurité retenu est strict :

```text
authentification
+
contexte réel
+
permissions effectives
→ corpus d’aide autorisé
```

Le frontend ne doit pas recevoir l’intégralité des fiches Platform pour ensuite masquer ce qui ne concerne pas un utilisateur Workspace.

Les restrictions doivent couvrir :

- listing des fiches ;
- catégories ;
- suggestions de recherche ;
- mots-clés ;
- accès direct à une fiche ;
- permissions fines à l’intérieur d’un même contexte.

Un membre Workspace ne doit donc pas voir apparaître dans l’autocomplétion une procédure Platform telle que `Créer un plan` ou `Inviter un membre de la Platform`.

Le masquage frontend reste une règle UX, jamais l’autorité de sécurité.

L’audit D-025 devra décider le contrat backend exact nécessaire à l’exposition du catalogue autorisé. Aucun endpoint ou modèle ne doit être inventé avant cet audit.

---

## 7. Modèle de fiche d’aide

Le format cible doit rester cohérent pour toutes les procédures.

Structure de référence :

```text
Titre
Résumé / objectif
Qui peut réaliser cette action ?
Prérequis
Procédure
Résultat attendu / ce qui se passe ensuite
Cas particuliers / erreurs fréquentes
Conséquences sensibles ou irréversibles lorsque pertinent
Voir aussi
```

Chaque entrée doit posséder un identifiant stable permettant sa réutilisation par la recherche, l’URL, l’aide contextuelle, les tests et plus tard éventuellement un assistant conversationnel.

Exemple conceptuel :

```text
workspace.members.invite
platform.plans.create
files.restore
```

Le format technique définitif sera décidé après audit.

---

## 8. Architecture frontend existante à réutiliser

Architecture générale :

```text
Design tokens
→ components/ui
→ components/shared
→ components/forms / components/data-display
→ features/*/components
→ pages = assemblage
```

Règles constantes :

- JavaScript uniquement ;
- Tailwind CSS v4 CSS-first ;
- shadcn/ui + Base UI ;
- composants réutilisables obligatoires ;
- aucune primitive concurrente sans justification ;
- RTK Query pour l’état serveur ;
- Redux Toolkit pour le global client si nécessaire ;
- `useState` pour le local ;
- validation stricte ;
- accessibilité structurelle toujours active.

### Composants déjà vérifiés avant D-025

Le frontend possède déjà :

```text
frontend/src/components/ui/tabs.jsx
→ Base UI Tabs
→ variante `section`

frontend/src/components/ui/tooltip.jsx
→ Base UI Tooltip

frontend/src/components/ui/input.jsx
frontend/src/components/ui/popover.jsx
frontend/src/components/ui/card.jsx
```

Il ne faut donc pas recréer des Tabs, Tooltip, Input ou Popover spécifiques à l’aide.

### Recherche/autocomplétion

Aucun composant partagé évident `Autocomplete` / `Combobox` / `SearchSuggestions` n’a été trouvé lors du premier contrôle documentaire.

Avant création :

1. auditer la version réelle de Base UI installée ;
2. rechercher à nouveau les composants existants et leurs consommateurs ;
3. vérifier si Base UI fournit une primitive adaptée ;
4. créer une composition générique partagée uniquement si le besoin est réellement transversal ;
5. ne pas enfermer une primitive générique dans `features/help` par facilité.

---

## 9. Contenus versionnés avec le Core

Pour Core 1.0, les fiches d’aide doivent être versionnées avec le code.

Ne pas créer par anticipation :

```text
CMS d’aide
collection MongoDB éditable librement
éditeur WYSIWYG
base vectorielle
RAG
LLM obligatoire
```

Une release du Core doit contenir l’aide correspondant réellement à cette release.

---

## 10. Extensibilité des SaaS dérivés

Le mécanisme d’aide doit permettre aux futurs modules métier d’ajouter leurs propres fiches sans modifier le corpus Core.

Cible conceptuelle :

```text
catalogue Core
+
modules d’aide applicatifs
→ catalogue du SaaS dérivé
```

Le contrat exact du futur registre doit être explicite et versionné, comme les autres points d’extension du Core.

D-017 devra vérifier que le dérivé pilote peut conserver l’aide Core et ajouter au moins une aide métier sans casser la frontière Core / métier.

---

## 11. État canonique des dettes

Sur la branche D-025, `docs/DEBT.md` porte désormais :

```text
D-020  EN COURS
D-025  PLANIFIÉ — blocker Core 1.0 avant D-015
D-011  VALIDÉ
D-021  VALIDÉ
D-022  VALIDÉ
D-002  VALIDÉ
D-015  PLANIFIÉ
D-016  PLANIFIÉ
D-017  PLANIFIÉ
D-023  DIFFÉRÉ — Core 1.1
D-024  DIFFÉRÉ — Core 1.1
```

D-020 reste `EN COURS` tant que sa validation fonctionnelle manuelle restante n’a pas été constatée ou qu’une reclassification explicite n’a pas été décidée.

Cela ne change pas la décision que D-025 est le **prochain développement**. D-020 reste néanmoins une condition de clôture obligatoire avant D-015.

---

## 12. Ordre de travail D-025 obligatoire

La prochaine conversation doit commencer par un audit, pas par du code.

Ordre :

```text
1. vérifier la branche `feature/d-025-help-center` et son HEAD réel ;
2. vérifier que `main` n’a pas divergé de manière pertinente ;
3. lire intégralement `docs/REPRISE-CURRENT.md` ;
4. lire D-025 dans `docs/DEBT.md` ;
5. lire intégralement `docs/debt/D-025-secure-help-center.md` ;
6. inspecter le frontend et le backend réels sans modification ;
7. inventorier les workflows Workspace et Platform réellement disponibles ;
8. relier chaque workflow à ses permissions réelles ;
9. auditer les composants UI/shared déjà disponibles ;
10. auditer Base UI réellement installée pour la recherche prédictive ;
11. auditer routing, shells, topbars/sidebars et points d’entrée possibles vers l’aide ;
12. proposer l’architecture finale, le modèle d’entrée d’aide, la stratégie backend de filtrage et les catégories ;
13. faire valider ce cadrage avant le premier changement applicatif ;
14. implémenter ensuite par lots cohérents avec tests ciblés puis gate globale.
```

Ne pas rédiger massivement les fiches avant validation du modèle et des catégories.

---

## 13. Tests attendus D-025

### Backend / sécurité

Si un catalogue/endpoint serveur est nécessaire :

- authentification ;
- séparation Workspace / Platform ;
- permissions fines ;
- non-divulgation via listing, recherche et slug ;
- accès direct protégé ;
- validation stricte ;
- tests Supertest d’isolation et de non-escalade.

### Frontend

- centre correct selon contexte ;
- 4/5 catégories maximum ;
- tooltip accessible ;
- recherche progressive ;
- 3 à 5 suggestions maximum ;
- pertinence des suggestions ;
- navigation clavier ;
- ARIA/accessibilité ;
- aucune suggestion non autorisée ;
- responsive ;
- réutilisation des composants existants ;
- non-régression des shells.

### Gate globale avant D-015

Après validation complète de D-025 et clôture/reclassification de D-020 :

```text
backend npm run lint
backend npm test
frontend npm run lint
frontend npm test
frontend npm run build
validation manuelle des parcours critiques
```

Cette gate doit être réellement exécutée avant de déclarer le Core prêt pour D-015.

---

## 14. Roadmap actuelle

```text
D-002 Files                                             VALIDÉ
D-020 invitation commerciale                           EN COURS — clôture manuelle/reclassification encore requise
→ D-025 centre d’aide Workspace / Platform sécurisé    PROCHAIN DÉVELOPPEMENT
→ clôture effective des derniers blockers pré-gel
→ gate globale pré-D-015
→ revue globale pré-versionnement
→ D-015 release candidate / SemVer / provenance / releases / migrations
→ D-016 Playwright E2E Core, incluant l’aide D-025
→ audit final Core
→ D-017 dérivé pilote + module métier + test réel d’upgrade + extension de l’aide
→ corrections éventuelles
→ nouvelle gate
→ tag/release Core stable lorsque la stratégie est réellement validée
```

Ne pas confondre :

```text
release candidate Core
≠
tag stable final
≠
produit dérivé production-ready
```

Évolutions explicitement différées après Core 1.0 :

```text
D-023 demande gouvernée de transfert de propriété
D-024 console Platform contextualisée du Workspace
assistant conversationnel / IA au-dessus du centre d’aide
```

---

## 15. Principes de versionnement/clonage déjà discutés

Les décisions détaillées restent à matérialiser dans D-015, mais plusieurs principes de travail ont déjà été retenus :

- D-015 construit une release candidate reproductible, pas automatiquement le tag stable final ;
- un produit dérivé doit conserver une provenance claire vers le Core ;
- l’upgrade du dérivé doit être explicite, testé et fondé sur une release/tag du Core plutôt que sur un suivi aveugle de `main` ;
- D-017 doit réellement tester dérivation, ajout métier, évolution Core compatible, upgrade, migrations/configuration, conflits et provenance ;
- `v1.0.0` stable ne doit être taguée qu’après validation réelle de cette stratégie.

D-025 doit être terminé avant l’ouverture de D-015 afin que le contrat utilisateur du Core soit inclus dans la discipline de release.

---

## 16. Règles de travail à conserver

- vérifier branche et HEAD avant modification ;
- code + DB + tests réellement exécutés priment sur la synthèse ;
- aucun merge implicite ;
- aucun changement hors périmètre ;
- JavaScript uniquement ;
- validation stricte ;
- composants réutilisables obligatoires ;
- audit avant migration/création d’une primitive ;
- plusieurs FAILS d’une même famille = analyse globale + correction par cause racine ;
- gate globale après un bloc transversal ;
- ne jamais annoncer une gate verte sans exécution réelle ;
- ne jamais supprimer un hook/composant partagé sans audit de consommateurs ;
- sécurité backend autoritative ;
- aucun contenu d’aide non autorisé simplement caché côté frontend ;
- ne pas confondre Core 1.0 stabilisé et produit dérivé production-ready.

---

Le présent fichier est une synthèse de reprise. Il ne remplace ni Git, ni le code, ni les tests, ni les contrats canoniques, ni `docs/DEBT.md`.
