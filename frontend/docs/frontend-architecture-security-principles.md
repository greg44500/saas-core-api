# SAAS-CORE-API — Principes d’architecture, maintenabilité et sécurité Frontend

**Statut :** référence normative frontend  
**Date :** 30 août 2026

## 1. Objectif

Ce document fixe les règles transverses qui doivent guider toute décision frontend, indépendamment du module métier développé.

Une fonctionnalité ne doit pas être considérée comme correctement implémentée si elle fonctionne mais fragilise la maintenabilité, la sécurité, l’accessibilité ou la cohérence du design system.

## 2. Stack imposée

```text
React
Vite
JavaScript uniquement
Tailwind CSS
shadcn/ui en JavaScript
Lucide Icons
Redux Toolkit
RTK Query
Vitest
React Testing Library
Playwright
```

Aucune introduction de TypeScript ne doit être faite implicitement par un outil, un composant shadcn ou un exemple externe.

## 3. Architecture cible

```text
frontend/
├── docs/
├── src/
│   ├── app/
│   ├── components/
│   │   ├── ui/
│   │   ├── shared/
│   │   ├── forms/
│   │   └── data-display/
│   ├── features/
│   ├── services/
│   │   └── api/
│   ├── store/
│   ├── hooks/
│   ├── lib/
│   ├── utils/
│   └── assets/
└── ...
```

La structure finale sera créée progressivement. Cette arborescence définit les responsabilités attendues, pas une obligation de créer des dossiers vides prématurément.

## 4. Séparation des responsabilités

- les pages assemblent les composants et ne portent pas de logique métier lourde ;
- `components/ui` contient les briques du design system, principalement issues/adaptées de shadcn/ui ;
- `components/shared` contient des assemblages transverses réutilisables ;
- `features/<feature>` contient les composants, hooks et logique propres à un domaine fonctionnel ;
- RTK Query gère l’état serveur et les appels HTTP ;
- Redux Toolkit ne stocke que l’état global client qui ne relève pas naturellement du cache serveur ;
- `useState` reste réservé à l’état local de composant ;
- les règles d’autorisation backend ne doivent jamais être remplacées par un simple contrôle visuel frontend.

### 4.1 Composants réutilisables et taille des fichiers

La composition est la règle par défaut.

Un fichier React ne doit pas devenir un assemblage monolithique mêlant rendu, appels API, transformation de données, permissions, formulaires et logique de navigation.

Lorsqu’un composant acquiert plusieurs responsabilités indépendantes, des blocs réutilisables ou testables séparément doivent être extraits dans le niveau architectural approprié.

La taille en nombre de lignes n’est pas utilisée comme règle arbitraire, mais un fichier long doit déclencher une revue de responsabilité. L’objectif est d’obtenir des unités :

- faciles à lire ;
- faciles à tester ;
- faciles à remplacer ;
- avec une API de props claire ;
- sans duplication de logique ou de présentation.

Il faut privilégier la composition à la création de composants génériques sur-paramétrés ou de fichiers « couteau suisse ».

### 4.2 Documentation du code et commentaires

Chaque fichier doit être compréhensible rapidement par un développeur qui le reprend sans avoir à reconstruire mentalement tout son contexte.

La documentation doit rester concise et expliquer principalement :

- le rôle du fichier lorsqu’il n’est pas évident par son nom ou son emplacement ;
- les décisions architecturales importantes ;
- les règles métier ou UX non triviales ;
- les comportements de sécurité ou de permission pouvant surprendre ;
- les raisons d’un contournement, d’une contrainte technique ou d’un ordre d’exécution particulier ;
- les hypothèses ou invariants dont dépend le code.

Les commentaires ne doivent pas paraphraser le code.

Exemples à éviter :

```js
// Initialise l'état ouvert
const [isOpen, setIsOpen] = useState(false);

// Ferme la modale
setIsOpen(false);
```

Exemple pertinent :

```js
// La modale reste montée pendant la mutation afin de préserver le contexte
// d'erreur et d'éviter de perdre les données saisies en cas d'échec API.
const [isOpen, setIsOpen] = useState(false);
```

Un `useState`, `useEffect`, hook, composant ou handler ne doit donc être commenté que si son intention, sa contrainte ou son effet de bord n’est pas évident à la lecture du code.

Pour les composants, hooks ou utilitaires réutilisables ayant une API non triviale, JSDoc peut être utilisé pour documenter les paramètres, valeurs retournées, contrats de props ou comportements particuliers. JSDoc ne doit pas être ajouté mécaniquement aux fonctions évidentes.

La règle est : **commenter le pourquoi, les contraintes et les invariants ; laisser le code exprimer le quoi**.

## 5. Règle anti-hardcoding

Le code en dur doit être évité lorsqu’une valeur est susceptible d’évoluer, d’être partagée ou de représenter une règle transverse.

Sont notamment concernés :

- couleurs et thème ;
- endpoints ;
- chemins de navigation partagés ;
- rôles et permissions ;
- labels de statut réutilisés ;
- tailles/limites fonctionnelles venant du backend ;
- clés de stockage local autorisées ;
- durées et timeouts structurants ;
- options de configuration ;
- messages métier partagés lorsque leur centralisation est pertinente.

L’objectif n’est pas de transformer toute constante locale en configuration globale, mais d’éviter les duplications et les valeurs structurelles dispersées.

## 6. Design tokens et thème

Le design system doit reposer sur des tokens sémantiques compatibles clair/sombre.

Les composants métier doivent utiliser des intentions (`primary`, `destructive`, `muted`, etc.) et non dépendre directement d’une teinte précise.

La palette personnalisée sera intégrée au niveau des tokens afin de permettre :

- changement de marque ;
- dark mode cohérent ;
- maintenance centralisée ;
- contraste contrôlé ;
- réutilisation des composants dans les futurs SaaS métier.

## 7. Affichage conditionnel

L’affichage conditionnel doit être explicite, centralisé lorsque la règle est partagée et fondé sur un état réel : permission, rôle, statut, entitlement, état de requête ou contexte de navigation.

Exemples :

- afficher une action « Inviter » uniquement si l’utilisateur dispose de la permission correspondante ;
- masquer ou désactiver une fonctionnalité absente de l’entitlement effectif ;
- afficher un état de remédiation spécifique lorsqu’un workspace est suspendu ;
- séparer les navigations Workspace et Platform selon le contexte réellement accessible.

Une condition réutilisée ne doit pas être recopiée sous des formes légèrement différentes dans plusieurs pages. Elle doit être portée par une fonction, un sélecteur, un hook ou un composant adapté à son niveau de responsabilité.

L’affichage conditionnel améliore l’UX mais ne constitue jamais un mécanisme de sécurité : le backend reste l’autorité finale.

## 8. Notifications et toasts

Les notifications temporaires doivent utiliser une stratégie unique pour toute l’application.

Le système retenu devra :

- supporter au minimum succès, information, avertissement, erreur et opérations asynchrones ;
- être compatible avec le thème clair/sombre ;
- éviter la multiplication de bibliothèques concurrentes ;
- centraliser les conventions de messages et de durée lorsque pertinent ;
- ne pas remplacer les erreurs inline d’un formulaire ;
- ne pas exposer de message technique ou sensible provenant directement du backend.

Au 30 août 2026, shadcn/ui propose un composant Toast pour ses projets Base UI et continue aussi de documenter Sonner. Le choix définitif sera cadré avant installation selon la variante shadcn retenue et la simplicité d’intégration dans Vite/JavaScript.

## 9. Sécurité frontend

Le frontend est une couche d’expérience utilisateur, jamais une frontière de sécurité suffisante.

Principes :

- aucune donnée secrète dans le bundle Vite ;
- seules les variables explicitement destinées au client peuvent être exposées ;
- ne jamais stocker un secret ou refresh token accessible à JavaScript si le contrat backend repose sur un cookie HttpOnly ;
- ne pas considérer le masquage d’un bouton comme une autorisation ;
- toujours laisser le backend appliquer permissions, isolation tenant et validation ;
- éviter l’injection HTML ; toute utilisation future de HTML brut devra être explicitement auditée ;
- traiter les paramètres URL, données API et contenus utilisateur comme non fiables ;
- ne pas afficher de détails techniques sensibles issus des erreurs serveur ;
- centraliser la stratégie d’authentification et de renouvellement de session ;
- gérer explicitement les réponses 401/403 sans boucle de refresh ou redirection infinie ;
- minimiser les données persistées dans `localStorage`/`sessionStorage` ;
- toute persistance client doit avoir une justification et une politique de nettoyage.

## 10. Authentification et permissions

Le frontend devra couvrir les parcours complets exposés par le Core :

- register ;
- login ;
- session courante ;
- refresh ;
- logout ;
- logout-all ;
- forgot password ;
- reset password ;
- change password ;
- profil ;
- gestion des états de session et d’expiration.

Les rôles/permissions servent à adapter :

- navigation ;
- visibilité des actions ;
- routes accessibles ;
- messages de refus ;
- dashboards et outils proposés.

Mais l’autorisation effective reste backend.

## 11. Workspace et Platform

Les deux contextes doivent être distincts :

- espace Workspace : contexte tenant, membres, rôles, fichiers, abonnement, audit, paramètres ;
- espace Platform : pilotage global SUPER_ADMIN sur utilisateurs, workspaces, plans, subscriptions et AuditLogs selon le contrat backend.

La séparation doit être visible dans le routing, les layouts et les guards pour réduire les risques d’erreur de contexte.

## 12. Validation des formulaires

La validation client améliore l’UX mais ne remplace jamais Zod côté backend.

Les formulaires devront :

- afficher les erreurs près du champ concerné ;
- préserver les données utilisateur lorsque possible après une erreur ;
- désactiver ou protéger les doubles soumissions ;
- rendre explicites les conséquences des opérations destructrices ou sensibles ;
- éviter de dupliquer à plusieurs endroits les mêmes règles de formulaire.

Le choix de l’outillage de formulaire frontend sera cadré avant implémentation.

## 13. Accessibilité

Le design system doit prévoir dès le départ :

- navigation clavier ;
- focus visible ;
- labels explicites ;
- structure sémantique ;
- contrastes compatibles avec la palette claire et sombre ;
- états non communiqués uniquement par la couleur ;
- composants modaux, menus et popovers accessibles.

Les primitives shadcn réduisent certains risques mais ne dispensent pas d’une validation de l’usage réel.

## 14. Tests

Chaque lot frontend devra envisager :

- tests unitaires des utilitaires et règles client ;
- React Testing Library pour le comportement des composants ;
- tests d’intégration sur les parcours importants ;
- Playwright sur les parcours critiques de bout en bout ;
- checklist de validation manuelle responsive, thème et accessibilité.

Les tests doivent vérifier le comportement observable plutôt que les détails d’implémentation React.

## 15. Règle d’évolution

Toute modification transverse doit être évaluée pour ses impacts sur :

```text
Auth
Routing
Permissions
Workspace context
Platform context
RTK Query cache
Design system
Dark mode
Responsive
Accessibilité
Tests
Contrats backend/frontend
```

Une modification locale ne doit pas créer silencieusement une nouvelle convention globale.