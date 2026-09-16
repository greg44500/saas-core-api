# D-025 — Centre d’aide sécurisé Workspace / Platform

**Statut :** PLANIFIÉ  
**Périmètre :** Core frontend + contrats backend d’exposition de l’aide + sécurité RBAC/contextuelle + extensibilité des SaaS dérivés  
**Blocage Core 1.0 :** oui — dernier développement fonctionnel générique à traiter avant le gel pré-D-015  
**Dépendances :** Design System D-011 validé, RBAC Workspace/Platform existant, contexte Workspace/Platform existant, composants partagés existants  
**Déclencheur :** décision produit du 2026-09-16 — un Core professionnel doit fournir une aide fonctionnelle directement exploitable par ses utilisateurs avant d’être figé pour versionnement.

---

## 1. Problème à résoudre

Le dépôt dispose d’une documentation technique et interne riche, mais aucune surface d’aide utilisateur ne permet actuellement de répondre rapidement à des questions opérationnelles telles que :

```text
Comment inviter un membre dans mon workspace ?
Comment suspendre un membre ?
Comment restaurer un fichier ?
Comment créer un plan ?
Comment gérer une dérogation ?
Comment suspendre un workspace depuis la Platform ?
```

Les documents d’architecture, contrats, sécurité, opérations et dette ne doivent pas être exposés comme substitut à une documentation fonctionnelle utilisateur.

Le besoin D-025 est donc de créer une couche d’aide produit structurée, recherchable, contextualisée et sécurisée.

---

## 2. Décision structurante : deux centres fonctionnels, une infrastructure technique

L’aide Workspace et l’aide Platform doivent être séparées dans l’expérience utilisateur.

```text
contexte Workspace
→ Centre d’aide Workspace

contexte Platform
→ Centre d’aide Platform
```

Un utilisateur Workspace ne doit pas recevoir les procédures réservées à la Platform, par exemple la création d’un plan, l’invitation d’un membre Platform ou les opérations d’administration d’un workspace client.

Un utilisateur pouvant accéder aux deux contextes dispose des deux centres selon la surface dans laquelle il travaille ; il n’est pas nécessaire de construire un centre unique mélangeant toutes les catégories.

Cette séparation fonctionnelle ne doit pas conduire à deux implémentations techniques dupliquées.

```text
Centre Workspace ─┐
                  ├→ mêmes primitives et composants partagés
Centre Platform ──┘
```

---

## 3. Architecture UX cible

### 3.1 Nombre de catégories

Chaque centre d’aide doit rester simple et limiter sa navigation principale à **4 ou 5 catégories maximum**.

Les intitulés définitifs seront arrêtés après inventaire des workflows réels. Ils doivent utiliser le vocabulaire utilisateur et non les noms techniques des modèles backend.

Exemples de cadrage possibles :

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

Ces intitulés ne constituent pas encore un contrat immuable ; l’audit d’implémentation doit vérifier qu’ils regroupent correctement les fonctionnalités réelles du Core.

### 3.2 Tooltip léger par catégorie

Chaque catégorie peut exposer un tooltip très bref indiquant son périmètre.

Exemple :

```text
Workspace & équipe
→ Membres, rôles, invitations et gestion du workspace.
```

Le tooltip reste une aide d’orientation, jamais une procédure complète. Il doit rester accessible au clavier et aux technologies d’assistance.

### 3.3 Recherche prédictive centrale

La barre de recherche constitue le principal point d’accès rapide à l’aide.

Comportement attendu :

```text
l’utilisateur commence à saisir
→ les meilleures correspondances apparaissent progressivement
→ 3 à 5 suggestions maximum restent visibles
→ les propositions se précisent au fur et à mesure de la saisie
→ sélection clavier ou souris
→ ouverture de la fiche correspondante
```

La recherche ne doit pas dépendre uniquement du titre de la fiche. Une entrée d’aide peut fournir :

```text
id stable
titre
catégorie
résumé
mots-clés
synonymes éventuels
questions / formulations prédéfinies
contenu de la fiche
contexte Workspace ou Platform
contraintes de permissions
```

Exemple conceptuel :

```text
id: workspace.members.invite
titre: Inviter un membre dans un workspace
mots-clés: invitation, membre, utilisateur, équipe, ajouter
questions:
- Comment inviter un membre ?
- Comment ajouter un utilisateur ?
- Ajouter quelqu’un à mon workspace
```

La pertinence doit favoriser les correspondances fortes, par exemple :

```text
titre exact / début du titre
→ question prédéfinie
→ mots-clés
→ contenu
```

Le comportement exact sera testé sur le corpus réel avant d’ajouter une complexité algorithmique inutile.

---

## 4. Fiche d’aide canonique

Toutes les procédures utilisent un modèle cohérent afin de rester compréhensibles, maintenables et réutilisables ultérieurement par une recherche avancée ou un assistant conversationnel.

Structure de référence :

```text
Titre
Résumé / objectif
Qui peut réaliser cette action ?
Prérequis
Procédure
Résultat attendu / ce qui se passe ensuite
Cas particuliers ou erreurs fréquentes
Conséquences sensibles ou irréversibles lorsque pertinent
Voir aussi
```

Une fiche décrit le parcours réellement disponible dans la version courante du Core. Elle ne doit jamais inventer une fonctionnalité planifiée ou exposer une règle technique non confirmée par le code/les contrats.

Les actions sensibles doivent expliciter leurs conséquences sans banaliser leur usage : suspension, révocation, suppression définitive, transfert ou autres opérations à impact fort.

---

## 5. Sécurité et confidentialité de l’aide

### 5.1 Principe

Le masquage frontend ne constitue pas une protection suffisante.

Le système d’aide doit appliquer le même principe de sécurité que le reste du Core :

```text
authentification
+
contexte effectif
+
permissions effectives
→ corpus d’aide autorisé
```

Le frontend ne doit pas recevoir par défaut l’intégralité des contenus Platform puis simplement masquer ceux qui ne concernent pas l’utilisateur.

### 5.2 Séparation Workspace / Platform

Un utilisateur Workspace sans accès Platform ne doit pas recevoir :

- les fiches Platform ;
- les titres de fiches Platform dans les suggestions ;
- les mots-clés ou formulations de recherche Platform ;
- les métadonnées permettant d’inférer des procédures administratives non autorisées.

La recherche prédictive travaille uniquement sur le corpus autorisé.

### 5.3 Permissions fines

À l’intérieur d’un même contexte, certaines fiches peuvent dépendre de permissions effectives.

Exemple : une procédure d’administration Workspace réservée à l’owner ou à un rôle disposant de la permission correspondante ne doit pas être proposée à un membre qui ne peut pas exécuter l’action.

Le filtrage de l’aide améliore la confidentialité et l’UX, mais ne remplace jamais les contrôles d’autorisation réels des endpoints métier concernés.

### 5.4 Accès direct

Connaître ou deviner l’URL d’une fiche ne doit pas contourner son autorisation.

L’accès direct doit être vérifié côté serveur lorsqu’un contenu est protégé. La stratégie `403` / `404` et le niveau de non-divulgation seront décidés pendant l’audit sécurité selon la nature des contenus.

---

## 6. Composants et Design System

Avant toute création de composant, auditer les primitives réelles déjà présentes.

État constaté avant ouverture de D-025 :

```text
components/ui/Tabs
→ Base UI Tabs
→ variante section existante

components/ui/Tooltip
→ Base UI Tooltip

components/ui/Input
components/ui/Popover
components/ui/Card
→ primitives disponibles
```

Ces composants doivent être réutilisés lorsqu’ils correspondent au besoin.

Aucun second système d’onglets, tooltip, input ou popover ne doit être créé pour l’aide.

La recherche prédictive semble nécessiter une composition générique de type Autocomplete/Combobox actuellement absente du Core. Avant de l’implémenter :

1. vérifier les capacités de la version réelle de Base UI installée ;
2. vérifier qu’aucun composant partagé existant ne couvre déjà ce besoin ;
3. préférer une primitive/composition générique réutilisable à un autocomplete codé uniquement dans `features/help` si son contrat est réellement transversal.

Architecture de principe :

```text
components/ui
→ primitives existantes shadcn/Base UI

components/shared
→ compositions génériques réellement transversales nécessaires

features/help
→ HelpCenter
→ HelpSearch
→ HelpArticle
→ composition Workspace
→ composition Platform
```

Les noms exacts seront décidés après audit. La règle de responsabilité prime sur les noms proposés ici.

---

## 7. Source de vérité des contenus d’aide

Pour Core 1.0, les procédures doivent être **versionnées avec le code qu’elles documentent**.

Ne pas créer par anticipation :

- CMS d’aide ;
- collection MongoDB éditable librement ;
- éditeur WYSIWYG ;
- synchronisation externe de documentation ;
- base vectorielle uniquement pour D-025.

L’objectif est qu’une release du Core contienne l’aide correspondant réellement à cette release.

Le format technique des entrées (registre JavaScript contrôlé, ressources structurées ou autre solution versionnée) sera choisi après audit, en privilégiant validation stricte, maintenabilité et possibilité d’extension.

---

## 8. Extensibilité pour les SaaS dérivés

Le Core ne doit pas enfermer le futur produit dans un corpus d’aide figé.

La cible doit permettre à une application dérivée d’ajouter des fiches métier sans modifier les fiches Core, selon le même principe de composition explicite que les autres points d’extension du projet.

Conceptuellement :

```text
HELP_CORE_ENTRIES
+
APPLICATION_HELP_MODULES
→ catalogue d’aide du produit dérivé
```

Le nom et le contrat définitifs de ce point d’extension seront décidés pendant l’implémentation.

L’exercice D-017 devra vérifier que le mécanisme d’aide peut être conservé dans un dérivé et enrichi par un petit module métier sans casser la séparation Core / métier.

---

## 9. Assistant conversationnel

Le chatbot / assistant IA n’appartient pas au MVP D-025.

Ordre retenu :

```text
corpus fiable
→ navigation
→ recherche prédictive
→ sécurité contextuelle
→ extensibilité
→ éventuellement assistant conversationnel ultérieur
```

Un futur assistant devra interroger uniquement le corpus autorisé pour l’utilisateur et ne jamais devenir une autorité de permission ou une source de règles métier indépendante du Core.

D-025 ne doit donc introduire ni LLM, ni RAG, ni coût provider IA pour atteindre son critère de clôture Core 1.0.

---

## 10. Audit obligatoire avant code

La prochaine phase D-025 commence par un audit sans modification applicative :

1. vérifier branche et HEAD réels ;
2. lire `docs/REPRISE-CURRENT.md`, `docs/DEBT.md` et la présente spécification ;
3. inventorier les workflows réellement disponibles pour Workspace et Platform ;
4. distinguer les workflows communs, Workspace, Platform et les actions sensibles ;
5. inventorier les permissions réelles associées ;
6. auditer les composants `Tabs`, `Tooltip`, `Input`, `Popover`, les composants partagés et les primitives Base UI réellement installées ;
7. vérifier les routes/navigation Workspace et Platform où l’accès au centre d’aide doit être proposé ;
8. définir 4/5 catégories maximum par contexte à partir des workflows réels ;
9. définir le schéma strict d’une entrée d’aide et la stratégie d’exposition sécurisée ;
10. décider si un endpoint backend dédié au catalogue autorisé est nécessaire ;
11. établir la stratégie de recherche prédictive et d’accessibilité ;
12. établir les tests avant toute implémentation.

Aucun contenu d’aide ne doit être rédigé massivement avant que le modèle, les catégories et la stratégie d’autorisation soient validés.

---

## 11. Tests attendus

### Backend / sécurité

Si un catalogue ou endpoint serveur est retenu :

- authentification obligatoire ;
- séparation Workspace / Platform ;
- permissions fines ;
- absence de fuite via listing, recherche, slug ou accès direct ;
- validation stricte des paramètres ;
- comportement cohérent des contenus non autorisés ;
- tests Supertest d’isolation et de non-escalade.

### Frontend

- bon centre selon le contexte ;
- 4/5 catégories maximum ;
- tooltips courts et accessibles ;
- recherche progressive ;
- 3 à 5 suggestions maximum ;
- classement cohérent des résultats ;
- navigation clavier `↑` / `↓` / `Enter` / `Escape` lorsque pertinente ;
- lecteurs d’écran / rôles ARIA cohérents ;
- aucun résultat non autorisé dans les suggestions ;
- accès direct à une fiche autorisée ;
- états empty / no-result / error ;
- responsive ;
- réutilisation des composants communs ;
- non-régression des shells Workspace et Platform.

### E2E

D-016 devra intégrer les parcours essentiels du centre d’aide une fois D-025 validé, notamment la séparation Workspace / Platform et au moins une recherche + ouverture de fiche par contexte.

---

## 12. Critère de clôture

D-025 est validée lorsque :

- un centre d’aide Workspace fonctionnel existe ;
- un centre d’aide Platform fonctionnel existe ;
- les deux utilisent la même infrastructure de composants sans duplication injustifiée ;
- chaque centre reste limité à 4/5 catégories principales ;
- les catégories disposent d’une aide d’orientation concise lorsque pertinent ;
- une recherche prédictive propose progressivement 3 à 5 résultats pertinents ;
- le corpus, les suggestions et l’accès direct respectent contexte et permissions effectives ;
- les procédures principales du Core sont documentées avec un format cohérent ;
- les contenus sont versionnés avec le Core ;
- le mécanisme peut être enrichi par une application dérivée ;
- aucun chatbot/LLM n’est requis pour la clôture ;
- accessibilité, sécurité, tests backend/frontend applicables et validation fonctionnelle/visuelle sont verts ;
- la gate globale pré-D-015 est ensuite rejouée avant de déclarer le Core prêt au versionnement.
