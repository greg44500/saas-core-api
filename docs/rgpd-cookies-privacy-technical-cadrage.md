# SAAS-CORE-API — Cadrage technique RGPD, cookies, confidentialité et mentions légales

**Date :** 3 septembre 2026  
**Statut :** cadrage technique actif — dette fonctionnelle à implémenter avant mise en production  
**Périmètre :** Core SaaS générique, frontend + backend + exploitation + validation juridique

Référence fonctionnelle :

```text
docs/functional-debt-rgpd-cookies-privacy-legal.md
```

---

## 1. Objectif

Le Core doit fournir une architecture générique permettant à une application dérivée de gérer proprement :

- les traceurs strictement nécessaires ;
- les traceurs optionnels soumis au consentement lorsqu'ils existent ;
- la preuve et la version du choix de consentement ;
- le retrait ou la modification du consentement ;
- la politique de cookies ;
- la politique de confidentialité ;
- les mentions légales ;
- les informations courtes au point de collecte ;
- les données nécessaires à l'exercice des droits ;
- la traçabilité des versions publiées.

Le Core ne doit pas inventer des partenaires, finalités, durées de conservation ou transferts hors EEE inexistants dans l'application réellement déployée.

---

## 2. État réel observé dans le dépôt au 3 septembre 2026

### 2.1 Cookie d'authentification existant

Le backend utilise actuellement un cookie :

```text
refreshToken
```

Caractéristiques actuelles :

```text
HttpOnly = true
Secure = true en production
SameSite = lax
Path = /api/auth
Max-Age = durée de l'AuthSession
```

Il est utilisé pour login, refresh et logout.

Qualification technique provisoire : **traceur strictement nécessaire à l'authentification et à la sécurité du service**. Cette qualification devra être confirmée dans l'inventaire de production, mais il ne doit pas être bloqué par un mécanisme de consentement optionnel.

### 2.2 Frontend actuel

Le frontend ne dépend actuellement d'aucune bibliothèque d'analytics, de publicité ou de suivi inter-sites dans `frontend/package.json`.

Conséquence :

- aucune bannière ne doit annoncer aujourd'hui Google Analytics, publicité, pixels ou partenaires inexistants ;
- aucune catégorie optionnelle ne doit être créée uniquement par anticipation ;
- le centre de préférences devra être piloté par une configuration réellement déclarée par l'application dérivée.

### 2.3 Stockages navigateur

Tous les usages de cookies, `localStorage`, `sessionStorage`, IndexedDB, pixels, SDK tiers ou autres techniques de lecture/écriture sur le terminal devront faire partie de l'inventaire avant commercialisation.

Un stockage navigateur n'est pas automatiquement soumis au consentement : la qualification dépend de sa finalité réelle.

---

## 3. Décision d'architecture

La conformité doit être séparée en quatre responsabilités :

```text
LegalContent
→ versions des textes publiables

ConsentConfiguration
→ catégories/finalités et traceurs réellement déclarés

ConsentRecord
→ preuve du choix exprimé

Frontend Consent Manager
→ interface, blocage et modification des préférences
```

Ces responsabilités ne doivent pas être fusionnées dans `User`, `Workspace`, `Plan` ou `Subscription`.

---

## 4. Ce qui appartient au Core et ce qui appartient à l'application dérivée

### Core

Le Core peut fournir :

- structure générique des catégories de consentement ;
- moteur de consentement ;
- modèle de preuve ;
- versionnement des textes ;
- pages/routes génériques de publication ;
- centre de préférences réutilisable ;
- mécanisme de blocage avant consentement ;
- lien permanent « Gérer mes cookies » ;
- tests génériques de refus, acceptation et retrait.

### Application dérivée

L'application dérivée doit fournir les données réelles :

- raison sociale et informations légales ;
- hébergeur ;
- DPO ou contact données personnelles ;
- sous-traitants ;
- transferts hors EEE ;
- catégories de données réellement traitées ;
- finalités et bases juridiques ;
- durées de conservation ;
- traceurs réellement utilisés ;
- fournisseurs et partenaires ;
- catégories optionnelles réellement nécessaires.

---

## 5. Modèle conceptuel cible — ConsentConfiguration

Un registre de consentement générique devra définir les catégories réellement utilisées.

Exemple conceptuel :

```js
{
  key: 'analytics',
  label: 'Mesure d’audience',
  description: '...',
  required: false,
  active: true,
  vendors: [...],
  trackers: [...]
}
```

Règles :

- `required: true` signifie visible mais non désactivable uniquement si la finalité est réellement exemptée ;
- les catégories optionnelles sont désactivées tant qu'aucun consentement n'a été obtenu ;
- une application sans traceur optionnel ne doit pas créer artificiellement de catégories optionnelles ;
- les clés doivent être stables et versionnées avec la configuration présentée à l'utilisateur.

---

## 6. Modèle conceptuel cible — ConsentRecord

Le Core devra pouvoir démontrer quel choix a été exprimé et sur quelle information.

Champs conceptuels à cadrer lors du bloc d'implémentation backend :

```text
subjectType           anonymous | user
user                  ObjectId|null
anonymousId           identifiant pseudonyme|null
policyVersion         version de l'information présentée
configurationVersion  version des catégories/traceurs
choices               map catégorie -> booléen
decision              accept_all | reject_all | custom
consentedAt
updatedAt
expiresAt
source                 banner | preferences_center
requestContext         données techniques minimales réellement justifiées
```

Ne pas enregistrer davantage de données techniques que nécessaire à la démonstration du choix.

La durée de conservation de cette preuve devra être figée après analyse juridique/opérationnelle.

---

## 7. Utilisateur anonyme vs utilisateur authentifié

Le consentement ne doit pas dépendre de l'existence d'un compte.

Deux cas doivent être supportés :

```text
visiteur non authentifié
→ préférence locale + preuve pseudonyme éventuelle

utilisateur authentifié
→ possibilité de rattacher la preuve au User
```

La synchronisation multi-terminaux ne doit pas être activée automatiquement. Elle constitue une décision spécifique à cadrer si le produit souhaite synchroniser les préférences entre appareils.

---

## 8. Frontend cible

Créer plus tard une feature dédiée :

```text
frontend/src/features/privacy/
```

Structure probable :

```text
api/
components/
  consent-banner.jsx
  consent-preferences-dialog.jsx
  consent-category-list.jsx
pages/
  privacy-policy-page.jsx
  cookie-policy-page.jsx
  legal-notice-page.jsx
lib/
  consent-storage.js
  tracker-gate.js
```

Les composants devront utiliser les primitives partagées existantes plutôt que recréer boutons, dialogues ou formulaires.

Le bandeau doit proposer au premier niveau, lorsqu'il existe des traceurs optionnels :

```text
Tout refuser
Personnaliser
Tout accepter
```

Le refus doit être aussi accessible que l'acceptation.

---

## 9. Blocage technique des traceurs optionnels

Principe obligatoire :

```text
aucun traceur soumis au consentement
→ avant consentement explicite
```

Le frontend ne doit pas seulement masquer une interface. Il doit empêcher le chargement ou l'initialisation réelle du fournisseur concerné.

L'architecture devra donc utiliser un mécanisme de gating explicite :

```text
consent analytics = false/absent
→ module analytics non initialisé

consent analytics = true
→ initialisation autorisée
```

Aucun script tiers optionnel ne doit être injecté globalement dans `index.html` avant la résolution du consentement.

---

## 10. Cookie/session d'authentification

Le cookie `refreshToken` reste indépendant du consentement optionnel.

Il doit apparaître dans la politique de cookies comme traceur strictement nécessaire avec ses propriétés réelles et sa durée effective.

Le futur gestionnaire de consentement ne doit jamais :

- supprimer ce cookie lors d'un simple refus des traceurs optionnels ;
- empêcher login/refresh/logout ;
- assimiler logout à un retrait de consentement cookies ;
- stocker le refresh token dans un stockage JavaScript accessible.

---

## 11. Contenus juridiques

Les pages suivantes devront être publiques et accessibles sans authentification :

```text
/privacy
/cookies
/legal-notice
```

Les textes doivent être versionnés afin que l'application puisse identifier la version effectivement présentée au moment d'un consentement ou d'une information importante.

Le Core peut fournir la structure, mais les valeurs juridiques réelles doivent être configurées après clonage.

---

## 12. Information au point de collecte

Les formulaires collectant des données personnelles devront pouvoir afficher une information courte adaptée à la finalité réelle.

Ne pas mettre une mention générique identique sous tous les formulaires.

Exemples de zones concernées :

- register ;
- invitation ;
- profil ;
- support futur ;
- facturation future ;
- formulaires métier futurs.

Une primitive partagée pourra être créée uniquement lorsqu'une structure réutilisable réelle est confirmée.

---

## 13. Backend cible

La dette sera probablement implémentée dans des modules séparés, par exemple :

```text
backend/modules/privacy/
backend/modules/consent/
```

Le découpage exact devra rester métier :

```text
routes
controller
service
model
validation
tests
```

Le backend devra rester l'autorité pour :

- validation des payloads de consentement ;
- persistance des preuves ;
- version active de la configuration ;
- version active des documents légaux ;
- historique utile ;
- droits d'administration Platform éventuels.

---

## 14. Administration Platform

Une future administration pourra nécessiter :

```text
configuration des catégories de traceurs
liste des fournisseurs/traceurs
activation/désactivation d'une catégorie
versions des textes légaux
publication d'une nouvelle version
historique des versions
```

Cette administration ne doit pas permettre de déclarer arbitrairement un traceur exempté sans vérification fonctionnelle/juridique.

La configuration juridique finale reste une responsabilité d'exploitation de l'application dérivée.

---

## 15. Données personnelles et multi-tenant

Le SaaS peut avoir des rôles différents selon le traitement : responsable de traitement pour certains traitements propres à la plateforme, sous-traitant pour certaines données introduites par les clients dans leurs Workspaces.

Le modèle technique ne doit pas coder une qualification juridique unique pour toutes les données du SaaS.

Les modules métier futurs devront documenter leurs propres traitements et durées de conservation lorsque leurs données sortent du périmètre Core.

---

## 16. Durées de conservation

Aucune durée juridique générique ne doit être codée aujourd'hui pour :

```text
User
Workspace
AuditLog
AuthSession
Files
ConsentRecord
Billing futur
Support futur
```

Les durées existantes purement techniques, comme expiration de session ou purge de fichiers, doivent être distinguées des politiques légales de conservation.

Avant production, une matrice de conservation devra relier :

```text
catégorie de données
finalité
base juridique
durée ou critère
suppression / anonymisation / archivage
```

---

## 17. Tests requis lors de l'implémentation

### Backend

- validation stricte des choix ;
- refus de catégories inconnues ;
- version de configuration obligatoire ;
- preuve historisée ;
- retrait/modification ;
- absence de données sensibles inutiles dans les DTO ;
- protection des routes d'administration.

### Frontend

- premier affichage sans choix ;
- « Tout refuser » ;
- « Tout accepter » ;
- choix personnalisé ;
- catégorie nécessaire non désactivable ;
- réouverture du centre de préférences ;
- retrait du consentement ;
- aucune initialisation d'un tracker optionnel avant accord ;
- navigation vers les politiques publiques.

### E2E Playwright

- visite anonyme + refus ;
- visite anonyme + acceptation ;
- reload et mémorisation ;
- retrait après acceptation ;
- login après refus sans casse du cookie d'authentification ;
- vérification réseau qu'aucun domaine optionnel n'est contacté avant accord.

---

## 18. Roadmap dédiée

Cette dette ne doit pas interrompre le développement du moteur commercial Core tant que le produit n'est pas en phase de déploiement réel.

Ordre recommandé :

```text
RGPD-0  inventaire réel traitements/traceurs/prestataires
RGPD-1  contrat ConsentConfiguration + LegalContent
RGPD-2  ConsentRecord + API backend
RGPD-3  frontend Consent Manager
RGPD-4  pages publiques légales
RGPD-5  informations aux points de collecte
RGPD-6  administration Platform si nécessaire
RGPD-7  audit conservation / sous-traitants / transferts
RGPD-8  tests E2E et validation juridique pré-production
```

---

## 19. Gate de production

Cette dette devient **bloquante avant mise en production réelle accessible à des clients**.

Le Core peut continuer F10/F11 avant son implémentation complète, mais aucun déploiement commercial final ne doit être déclaré prêt tant que :

- les traitements réels ne sont pas inventoriés ;
- les textes ne sont pas complétés ;
- les traceurs ne sont pas classifiés ;
- les traceurs optionnels ne sont pas réellement bloqués avant accord ;
- les mécanismes de refus/retrait ne sont pas testés ;
- les durées et sous-traitants ne sont pas documentés ;
- la validation juridique finale n'est pas réalisée.

---

## 20. Décision figée

La conformité RGPD/cookies n'est ni exclusivement frontend ni exclusivement backend.

```text
Frontend
→ information, choix, blocage des scripts, centre de préférences, pages publiques

Backend
→ configuration autoritative, validation, preuve, versionnement, administration

Exploitation / juridique
→ données réelles, finalités, bases légales, durées, sous-traitants, transferts et validation finale
```

Le Core fournit le mécanisme générique ; l'application dérivée fournit la vérité juridique et opérationnelle de son déploiement.
