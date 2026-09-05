# SAAS-CORE-API — Création et maintenance des SaaS dérivés

**Statut :** document canonique — actif  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** création d’un produit dérivé, séparation Core/métier, versionnement, mises à niveau du Core et préparation à la production

---

## 1. Objet

`saas-core-api` est destiné à servir de socle commun à plusieurs applications SaaS métier.

Ce document définit comment créer une application dérivée sans transformer le Core en copie impossible à maintenir, puis comment intégrer dans cette application les futures corrections et évolutions du Core.

Objectif :

```text
SAAS-CORE-API
→ évolue et reste maintenu

SaaS Formation
SaaS Restauration
SaaS CRM
...
→ ajoutent leur métier
→ conservent la possibilité d’intégrer les versions futures du Core
```

Le principe directeur est :

```text
le Core fournit les fondations
+
le produit dérivé ajoute le métier
+
les mises à jour du Core restent intégrables de manière contrôlée
```

---

## 2. Analogie simple

Le Core peut être vu comme les fondations et les réseaux d’un bâtiment :

```text
Core
→ structure
→ sécurité
→ utilisateurs
→ workspaces
→ rôles
→ abonnements
→ fichiers
→ audit
```

Le produit dérivé ajoute les pièces spécifiques :

```text
SaaS Formation
→ cours
→ modules
→ quiz
→ apprenants
→ certificats
```

Si le produit métier modifie inutilement les fondations, chaque réparation future du Core devient difficile à appliquer.

La maintenabilité dépend donc d’abord de la séparation Core / métier.

---

## 3. Frontière Core / métier

### 3.1 Reste dans le Core

Les domaines génériques actuellement identifiés comme Core comprennent notamment :

```text
authentification
sessions
compte utilisateur
workspaces
memberships
invitations
RBAC
ownership
plans
subscriptions
trials
capabilities
entitlements
quotas
overrides
fichiers génériques
audit
administration Platform
composants frontend transverses
```

### 3.2 Appartient au produit dérivé

Exemples :

```text
courses
lessons
learners
products
suppliers
recipes
contacts
campaigns
stocks métier
certificats
règles sectorielles
IA métier
```

Règle :

```text
besoin SaaS générique démontré
→ candidat Core

besoin propre au produit
→ module métier dérivé
```

Une fonctionnalité ne doit pas rejoindre le Core uniquement parce qu’elle pourrait être utile un jour à une autre application.

---

## 4. Architecture d’un module métier dérivé

Un domaine métier doit respecter les architectures canoniques existantes.

### Backend

```text
backend/modules/<domaine>/
├── routes
├── controller
├── service
├── model
├── validation
└── tests associés
```

La logique métier reste dans les services. Les validations restent strictes. L’isolation Workspace, le RBAC, les entitlements, les quotas, l’audit, les transactions et le soft delete sont appliqués lorsque le domaine le nécessite.

### Frontend

```text
frontend/src/features/<domaine>/
├── api
├── components
├── hooks si nécessaire
├── pages ou route components
├── validation/helpers
└── tests
```

Le module réutilise le design system et les composants partagés du Core. Il ne crée pas un second DataTable, système de toast, drawer, stratégie RTK Query ou design system parallèle.

Références :

```text
docs/architecture/ARCHITECTURE.md
docs/architecture/BACKEND.md
docs/architecture/FRONTEND.md
docs/frontend/FRONTEND-GUIDELINES.md
docs/security/SECURITY.md
```

---

## 5. Capabilities métier

Le Capability Registry constitue le point d’extension commercial officiel.

Le Core courant expose :

```text
backend/config/applicationCapability.registry.js
```

avec :

```text
APPLICATION_PLAN_CAPABILITY_MODULES
ACTIVE_PLAN_CAPABILITY_REGISTRY
```

Après création d’un module métier :

```text
module métier
→ déclare ses features
→ déclare ses métriques si nécessaire
→ déclare leurs métadonnées
→ associe explicitement feature → métriques si nécessaire
→ fournit son descriptor
→ descriptor ajouté à APPLICATION_PLAN_CAPABILITY_MODULES
→ registre actif recomposé
```

Le descriptor peut désormais exposer `featureMetrics` afin que les surfaces Platform data-driven connaissent les métriques qui paramètrent une feature sans reconstruire cette relation dans React.

Cette relation sert à la composition et à la présentation. Elle n’accorde aucun entitlement et ne remplace pas les contrôles de quotas.

Une capability existe parce que le code sait réellement l’exécuter. Le SUPER_ADMIN ne crée jamais librement une capability technique depuis Platform.

Références :

```text
docs/contracts/CAPABILITIES.md
docs/derived-saas/EXTENSION-POINTS.md
```

---

## 6. Permissions métier

Une capability commerciale et une permission RBAC sont deux choses différentes.

Exemple :

```text
price_history
→ capability : le Workspace dispose-t-il de la fonction ?

product:price:read
→ permission : cet utilisateur peut-il consulter les prix ?
```

Le Core conserve `CORE_PERMISSION` pour ses propres permissions et `createSystemRoleDefinitions()` accepte les extensions de permissions par rôle.

Le point de composition applicatif est désormais :

```text
backend/config/applicationRolePermission.registry.js
```

avec :

```text
APPLICATION_ROLE_PERMISSION_MODULES
ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY
```

Un module métier déclare explicitement :

```text
permissions
reservedPermissions si nécessaire
systemRolePermissions
```

L’application dérivée n’ajoute donc plus ses permissions métier dans `backend/constants/permissions.constants.js` et ne modifie pas les définitions Core des rôles système pour une extension ordinaire.

Le registre actif est utilisé par les services RBAC existants ; les rôles système nouvellement créés reçoivent les extensions explicitement configurées.

Référence : `docs/derived-saas/EXTENSION-POINTS.md`.

---

## 7. Navigation métier

Le frontend possède un point de composition de la navigation Workspace :

```text
frontend/src/app/workspace-navigation.js
```

Le Core fournit `coreWorkspaceNavigation` et l’application dérivée ajoute ses groupes métier au niveau `app/`.

Le composant Sidebar reste générique.

Flux attendu :

```text
navigation Core
+
navigation module métier A
+
navigation module métier B
↓
workspaceNavigation
↓
WorkspaceSidebar
```

Les entrées sont ensuite filtrées par permissions et capabilities effectives lorsque nécessaire.

Le Core ne doit jamais importer un module métier uniquement pour construire sa Sidebar.

---

## 8. Routes métier — points de composition V1

Les routes métier disposent désormais de points de composition explicites.

### Backend

```text
backend/config/applicationRoutes.registry.js
```

avec :

```text
APPLICATION_BACKEND_ROUTE_MODULES
mountApplicationRoutes()
```

Un descriptor déclare une clé, un `mountPath` et un router Express. `backend/app.js` monte cette collection avant le router Workspace générique.

Une route métier ordinaire n’oblige donc plus à ajouter directement un import et un `app.use()` dans la longue liste de `backend/app.js`.

### Frontend

```text
frontend/src/app/application-routes.js
```

avec :

```text
APPLICATION_FRONTEND_ROUTE_MODULES
APPLICATION_FRONTEND_ROUTES
```

Quatre surfaces sont prévues :

```text
publicRoutes
authenticatedRoutes
workspaceRoutes
platformRoutes
```

`frontend/src/app/router.jsx` compose ces collections dans les guards et layouts Core correspondants.

Le Core ne fait aucune autodécouverte filesystem et n’introduit pas de système de plugins. Le produit dérivé importe explicitement les descriptors des modules qu’il embarque.

Référence détaillée : `docs/derived-saas/EXTENSION-POINTS.md`.

---

## 9. Stratégie de création d’un nouveau SaaS

### Décision canonique pour un produit maintenable

Un produit qui doit recevoir les futures mises à jour du Core doit être créé en **conservant l’historique Git du Core**.

Le GitHub Template n’est pas la méthode canonique pour ce besoin.

GitHub documente qu’un dépôt créé depuis un Template démarre avec un historique indépendant et que les branches issues du Template ont des historiques sans relation. Cela facilite la création initiale, mais ne fournit pas la filiation Git recherchée pour intégrer ensuite les versions du Core.

### Procédure cible

Avant cette procédure :

1. le Core doit disposer d’une version stable publiée ;
2. le nouveau dépôt GitHub du produit doit être créé ;
3. les variables d’environnement et secrets seront configurés séparément.

Exemple conceptuel :

```bash
git clone <URL_SAAS_CORE_API> formation-saas
cd formation-saas

git remote rename origin upstream-core
git remote add origin <URL_NOUVEAU_DEPOT_PRODUIT>

git push -u origin main
```

Signification :

```text
origin
→ dépôt du produit Formation

upstream-core
→ dépôt maître SAAS-CORE-API
```

Le produit possède son propre dépôt mais conserve l’historique commun qui permettra à Git de comparer et fusionner les évolutions futures.

Les noms de remote sont des conventions. `upstream-core` est retenu ici car il est explicite pour un développeur qui reprend le projet.

---

## 10. Place éventuelle du GitHub Template

Un GitHub Template reste utile pour :

```text
prototype
atelier
démonstration
projet volontairement indépendant
création rapide sans objectif de synchronisation future
```

Il peut également rester une porte d’entrée visuelle pratique si une future automatisation reconstruit explicitement une stratégie de maintenance.

Mais il ne doit pas être présenté comme garantissant les mises à jour des SaaS déjà créés.

Pour notre objectif actuel :

```text
création rapide seule
→ Template possible

création + maintenance future du Core
→ historique Core conservé
```

---

## 11. Versionnement du Core

Le Core courant est encore en version `0.1.0`. Il n’est donc pas encore diffusé comme socle finalisé.

La première version considérée comme stable sera :

```text
v1.0.0
```

Le Core utilisera un versionnement sémantique :

```text
PATCH
1.0.0 → 1.0.1
→ correction compatible, bug ou sécurité

MINOR
1.0.0 → 1.1.0
→ fonctionnalité compatible ajoutée

MAJOR
1.x.x → 2.0.0
→ changement incompatible nécessitant une migration explicite
```

Le numéro de version doit être associé à un tag Git et à des notes de version.

Le `package.json` du Core peut porter la version du Core avant dérivation. Après dérivation, le produit aura cependant sa propre version applicative ; il faut donc tracer séparément la version du Core intégrée.

---

## 12. Traçabilité de la version Core dans chaque produit

Avant la distribution officielle, le Core devra introduire une convention simple et machine-readable permettant à chaque application dérivée d’indiquer son origine.

Cible proposée :

```text
core-origin.json
```

Exemple conceptuel :

```json
{
  "repository": "greg44500/saas-core-api",
  "version": "1.2.0",
  "lastIntegratedCommit": "<sha>",
  "updatedAt": "<date ISO>"
}
```

Cette convention n’est pas encore implémentée dans le dépôt au moment de DOC-6.

Elle devra être finalisée avant la diffusion du Core 1.0.

Elle permet de répondre immédiatement à :

```text
quelle version du Core utilise ce produit ?
quel correctif de sécurité lui manque ?
quel était le dernier commit Core intégré ?
```

---

## 13. Contenu obligatoire d’une release Core

Une version Core destinée aux applications dérivées doit fournir au minimum :

```text
numéro de version
résumé des changements
niveau PATCH / MINOR / MAJOR
correctifs sécurité éventuels
migrations MongoDB requises
changements de variables d’environnement
changements de dépendances
changements de contrats observables
instructions particulières de mise à niveau
tests ou vérifications spécifiques
```

Une application dérivée ne doit pas découvrir une migration ou une nouvelle variable d’environnement seulement après avoir fusionné le code.

Un CHANGELOG ou des GitHub Releases structurées devront être adoptés avant le Core 1.0.

---

## 14. Mise à niveau d’un SaaS dérivé

Exemple :

```text
Formation-SaaS
Core actuel : 1.1.0

SAAS-CORE-API
nouvelle version : 1.2.0
```

La mise à niveau doit suivre une branche dédiée.

Exemple conceptuel :

```bash
git fetch upstream-core --tags
git switch -c core-update/v1.2.0
git merge v1.2.0
```

Puis :

```text
résoudre les éventuels conflits
↓
examiner les migrations
↓
examiner les variables d’environnement
↓
backend tests
↓
frontend tests
↓
build frontend
↓
tests d’intégration
↓
E2E critiques
↓
revue
↓
Pull Request vers main du produit
```

La nouvelle version du Core n’est jamais injectée aveuglément directement dans `main` du produit.

---

## 15. Conflits lors d’une mise à niveau

Un conflit Git n’est pas nécessairement un bug. Il signifie que le produit et le Core ont modifié une zone commune.

La stratégie de résolution doit poser cette question :

```text
le produit a-t-il légitimement personnalisé une zone Core ?
```

### Si non

Revenir autant que possible à la version Core et déplacer la personnalisation vers un point d’extension métier.

### Si oui

Résoudre explicitement le conflit, documenter la divergence et renforcer les tests de non-régression.

Un nombre croissant de conflits récurrents sur les mêmes fichiers signale généralement une frontière Core/métier insuffisante.

---

## 16. Règle de personnalisation du Core

Modifier un fichier Core dans une application dérivée n’est pas interdit.

Certaines adaptations seront légitimes.

Mais toute modification doit être classée :

```text
A. correction générique
→ à remonter dans SAAS-CORE-API puis à récupérer par version Core

B. extension métier
→ doit vivre dans un module / point de composition dérivé

C. personnalisation produit réellement spécifique
→ peut modifier le Core, mais devient une divergence à assumer lors des upgrades
```

Lorsqu’une modification générique est faite seulement dans un produit dérivé, les autres produits ne pourront pas en bénéficier. Les corrections génériques doivent donc idéalement remonter d’abord dans le dépôt maître.

---

## 17. Migrations

Une mise à jour Core peut nécessiter :

```text
migration MongoDB
nouvel index
backfill
nouvelle permission système
modification de Plan baseline
changement de configuration
```

Les migrations ne doivent jamais être remplacées par une modification manuelle silencieuse de la production.

Pour chaque release concernée :

1. la migration est versionnée avec le Core ;
2. la release indique qu’elle est requise ;
3. le produit dérivé l’exécute dans un environnement contrôlé ;
4. le résultat est vérifié ;
5. la procédure de rollback ou de correction est connue lorsque le risque le nécessite.

Les migrations déjà exécutées par une application ne doivent pas être rejouées aveuglément sans vérifier leur idempotence et leur intention.

---

## 18. Tests de mise à niveau

Une mise à niveau Core doit protéger simultanément :

```text
le Core
+
les modules métier
+
leurs points d’intégration
```

Minimum avant validation :

### Backend

```text
suite Core
suite du module métier
intégrations RBAC / entitlement / quota
migrations concernées
```

### Frontend

```text
Vitest / React Testing Library
tests des features métier
tests des composants Core impactés
build Vite production
```

### E2E

À partir du moment où Playwright sera intégré :

```text
login / session
accès Workspace
RBAC
entitlement / quota
parcours métier critique
Platform pertinent
logout
```

Les tests du Core ne remplacent jamais les tests du produit dérivé.

---

## 19. Mise à jour de sécurité urgente

Un correctif sécurité Core doit être traité en priorité par les applications concernées.

Flux :

```text
release sécurité Core
↓
identifier les produits sur une version vulnérable
↓
branche de mise à niveau
↓
intégration du correctif
↓
tests ciblés + régression
↓
validation
↓
déploiement
```

Même en urgence, la modification ne doit pas être poussée aveuglément sur toutes les productions sans vérification.

La future traçabilité `core-origin.json` facilitera l’identification des produits concernés.

---

## 20. Catalogue commercial d’un produit dérivé

Le moteur commercial appartient au Core, mais le catalogue réel appartient au produit.

Après dérivation :

```text
Core
→ sait gérer Plan / Subscription / trial / entitlements / quotas

Produit
→ décide des offres réellement vendues
→ noms
→ prix
→ capabilities incluses
→ limites
→ politique de trial
```

Le produit ne doit pas coder ses droits à partir d’un nom de Plan.

Une nouvelle capability métier correctement enregistrée devient configurable par le système commercial générique.

Référence : `docs/contracts/COMMERCIAL.md`.

---

## 21. Dettes à réévaluer dans chaque produit dérivé

Le registre canonique reste :

```text
docs/DEBT.md
```

Lors de la création d’un produit, chaque dette doit être relue et classée selon le produit réel.

Exemples importants :

```text
Billing / Payment
RGPD / cookies / confidentialité
rétention / anonymisation
stockage production
observabilité
notifications
API keys / webhooks
MFA / SSO
E2E
configuration production
```

Un module métier fonctionnel ne rend pas automatiquement une application prête pour la production.

L’ancien `core-deferred-work-for-derived-saas.md` est désormais absorbé sur ce principe par le présent document et `DEBT.md`, mais reste physiquement présent jusqu’au lot de nettoyage et à autorisation explicite.

---

## 22. État des points d’extension au 2026-09-05

| Zone | État | Commentaire |
|---|---|---|
| Capability Registry | prêt | point de composition explicite disponible, métadonnées et relations feature → métriques supportées |
| Navigation Workspace | prêt | composition au niveau `app/workspace-navigation.js` |
| Composants frontend partagés | prêt | réutilisation par composition |
| Permissions métier / rôles système | implémenté, validation locale requise | registre applicatif `applicationRolePermission.registry.js` |
| Routes backend métier | implémenté, validation locale requise | composition dans `applicationRoutes.registry.js` |
| Routes frontend métier | implémenté, validation locale requise | composition dans `app/application-routes.js` |
| Traçabilité version Core par produit | à implémenter avant diffusion | convention `core-origin.json` proposée |
| Releases / changelog Core | à formaliser avant 1.0 | tags + notes de version requis |
| CI de validation des upgrades | à formaliser | aucune stratégie GitHub Actions canonique n’est encore documentée |
| Packages Core séparés | non requis en V1 | à réévaluer après retour d’expérience réel |

Les trois lignes D-014 ne doivent passer à l’état `validé` qu’après exécution locale verte des suites concernées.

Référence : `docs/derived-saas/EXTENSION-POINTS.md`.

---

## 23. Pourquoi ne pas transformer immédiatement le Core en packages ?

Une architecture future pourrait extraire des packages tels que :

```text
@saas-core/auth
@saas-core/rbac
@saas-core/workspace
@saas-core/ui
@saas-core/commercial
```

Cela faciliterait certaines mises à jour, mais introduirait dès maintenant :

```text
versionnement de plusieurs packages
compatibilités croisées
publication de packages
builds supplémentaires
frontières à figer trop tôt
```

Nous ne disposons pas encore de plusieurs produits réels permettant de savoir quelles frontières sont réellement stables.

Décision V1 :

```text
Core monorepo maintenable
+
historique Git conservé dans les produits dérivés
+
points de composition explicites
+
releases Core versionnées
```

Après deux ou trois SaaS dérivés réels, l’extraction de packages pourra être réévaluée sur la base des conflits et répétitions effectivement observés.

---

## 24. Checklist de création d’un SaaS dérivé

Avant de commencer le métier :

- [ ] partir d’une release Core stable ;
- [ ] conserver l’historique Git du Core ;
- [ ] créer le dépôt produit et configurer `origin` / `upstream-core` ;
- [ ] enregistrer la version Core d’origine selon la convention officielle lorsqu’elle sera implémentée ;
- [ ] installer les dépendances et lancer les suites de tests Core ;
- [ ] créer des variables d’environnement propres au produit ;
- [ ] définir le périmètre métier et la tenancy ;
- [ ] définir modèles, RBAC, capabilities, métriques et quotas métier ;
- [ ] créer les modules backend et features frontend sans dupliquer les primitives Core ;
- [ ] composer les capabilities et leurs relations feature → métriques ;
- [ ] composer les permissions métier et extensions des rôles système ;
- [ ] composer les routes backend et frontend dans les points applicatifs prévus ;
- [ ] composer la navigation Workspace ;
- [ ] configurer le catalogue commercial du produit ;
- [ ] réévaluer toutes les dettes applicables ;
- [ ] ajouter les tests métier et E2E critiques ;
- [ ] valider sécurité, conformité et production avant go-live.

---

## 25. Checklist de mise à niveau Core

Pour chaque nouvelle version Core :

- [ ] lire les release notes ;
- [ ] vérifier niveau PATCH / MINOR / MAJOR ;
- [ ] vérifier sécurité ;
- [ ] vérifier migrations ;
- [ ] vérifier variables d’environnement ;
- [ ] créer une branche `core-update/...` ;
- [ ] intégrer la version Core ;
- [ ] résoudre les conflits sans écraser silencieusement le métier ;
- [ ] lancer tests backend Core + métier ;
- [ ] lancer tests frontend Core + métier ;
- [ ] lancer le build production ;
- [ ] lancer les E2E critiques lorsqu’ils existent ;
- [ ] mettre à jour la trace de version Core ;
- [ ] faire relire puis intégrer par Pull Request ;
- [ ] exécuter les migrations nécessaires selon la procédure de déploiement.

---

## 26. Critères de diffusion du Core 1.0

La politique de dérivation ne sera considérée opérationnelle que lorsque le Core aura au minimum :

```text
version 1.0.0 stabilisée
contrats canoniques finalisés
points d’extension métier validés par les tests
convention de traçabilité de version Core
release notes / changelog
migrations documentées
suite de tests Core verte
Playwright ou stratégie E2E finale définie
procédure de création d’un dépôt dérivé testée réellement
procédure de mise à niveau Core testée sur au moins un dépôt dérivé pilote
```

La procédure ne doit pas être considérée validée uniquement parce qu’elle est théoriquement correcte. Un exercice réel de dérivation puis de mise à niveau devra être effectué avant de déclarer la stratégie définitive.

---

## 27. Sources GitHub de référence

La stratégie Git s’appuie notamment sur la documentation officielle GitHub :

- création depuis un Template : `https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template` ;
- gestion des dépôts distants : `https://docs.github.com/en/get-started/git-basics/managing-remote-repositories`.

GitHub indique notamment qu’un dépôt créé depuis un Template démarre avec un historique distinct, contrairement à un clone qui conserve l’historique Git du dépôt source.

---

## 28. Règle de maintenance de ce document

Toute évolution concernant :

```text
versionnement du Core
release process
points de composition
stratégie Git de dérivation
RBAC extensible
Capability Registry
routing dérivé
migrations
core-origin.json ou son remplacement
procédure d’upgrade
```

doit vérifier dans le même lot si `DERIVED-SAAS.md` doit être mis à jour.
