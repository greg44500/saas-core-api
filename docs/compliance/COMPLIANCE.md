# SAAS-CORE-API — Conformité, RGPD, cookies et confidentialité

**Statut :** document canonique de conformité  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** Core générique + obligations à réévaluer dans chaque SaaS dérivé

---

## 1. Objet

Ce document définit le cadre de conformité que `saas-core-api` doit préparer sans prétendre déterminer à lui seul la conformité juridique d'un produit final.

Le Core fournit des mécanismes techniques génériques. Chaque application dérivée doit ensuite documenter et valider ses traitements réels, ses prestataires, son modèle commercial, son hébergement et ses obligations sectorielles.

Principe directeur :

```text
conformité réelle
=
comportement technique
+ documentation exacte
+ organisation opérationnelle
+ qualification juridique du produit déployé
```

Une bannière cookies, une politique de confidentialité ou un soft delete ne suffisent jamais, pris isolément, à démontrer la conformité d'un SaaS.

Ce document est un cadrage technique et documentaire. Il ne remplace pas une validation juridique adaptée avant mise en production.

---

## 2. Sources de référence

Le présent cadre a été revérifié au 2026-09-05 contre des sources officielles, notamment :

- CNIL — Cookies et traceurs : `https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi` ;
- CNIL — Mise en conformité cookies : `https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/comment-mettre-mon-site-web-en-conformite` ;
- CNIL — Information et transparence : `https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence` ;
- CNIL — Registre des activités de traitement : `https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement` ;
- CNIL — Durées de conservation : `https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees` ;
- CNIL — AIPD : `https://www.cnil.fr/fr/ce-quil-faut-savoir-sur-lanalyse-dimpact-relative-la-protection-des-donnees-aipd` ;
- CNIL — Violations de données : `https://www.cnil.fr/fr/securite-gerer-les-incidents-et-les-violations` ;
- CNIL — Transferts hors UE : `https://www.cnil.fr/fr/les-outils-de-la-conformite/transferer-des-donnees-hors-de-lue` ;
- RGPD — règlement (UE) 2016/679, notamment articles 5, 12 à 22, 28, 30, 32 à 36 ;
- Ministère de l'Économie — mentions obligatoires d'un site professionnel : `https://www.economie.gouv.fr/entreprises/developper-son-entreprise/innover-et-numeriser-son-entreprise/mentions-sur-votre-site-internet-les-obligations-respecter`.

Ces références doivent être revérifiées lors d'une future implémentation ou avant un go-live, car le droit, les recommandations et les traitements réels peuvent évoluer.

---

## 3. Ce qui appartient au Core et ce qui appartient au produit dérivé

### Core

Le Core peut fournir des mécanismes génériques pour :

```text
inventaire technique des données et traceurs
information utilisateur réutilisable
consentement cookies/traceurs lorsque nécessaire
preuve/version du choix lorsqu'elle est justifiée
pages publiques de contenu légal
exercice sécurisé des droits
rétention / purge / anonymisation génériques
journalisation des opérations sensibles
sécurité et isolation tenant
```

### Application dérivée

Le produit dérivé doit fournir la vérité réelle du déploiement :

```text
entité juridique éditrice
responsable(s) de traitement
DPO ou contact données si applicable
finalités
bases légales
catégories de personnes et de données
caractère obligatoire/facultatif des collectes
destinataires
sous-traitants
hébergeur
transferts hors UE/EEE
durées de conservation
traceurs réellement utilisés
mentions légales
CGV/CGU et autres documents contractuels si applicables
obligations sectorielles
```

Le Core ne doit jamais inventer ces informations.

---

## 4. Inventaire et registre des traitements

Le fichier :

```text
docs/compliance/rgpd-data-tracker-inventory.md
```

est l'inventaire technique vivant du Core.

Il recense notamment :

- catégories de données ;
- stockages navigateur ;
- cookies/traceurs ;
- prestataires connus ;
- points de collecte ;
- traitements techniques identifiables ;
- inconnues restant à qualifier avant production.

Cet inventaire **ne remplace pas** le registre des activités de traitement prévu par le RGPD.

Chaque produit dérivé doit maintenir un registre adapté à ses traitements réels et à son rôle juridique. La CNIL présente le registre comme un outil central de pilotage de la conformité et de documentation des traitements.

Tout nouveau module ou prestataire doit déclencher une revue de l'inventaire s'il introduit :

```text
nouvelle donnée personnelle
nouvelle finalité
nouveau destinataire ou sous-traitant
nouveau stockage navigateur
nouveau traceur
nouveau transfert international
nouvelle durée de conservation
profilage ou décision automatisée
IA utilisant des données utilisateur
paiement / facturation
support ou analytics externe
```

---

## 5. Principes de protection des données

Toute fonctionnalité manipulant des données personnelles doit respecter les principes généraux du RGPD, notamment :

```text
finalité déterminée, explicite et légitime
minimisation des données
exactitude
limitation de la conservation
intégrité et confidentialité
responsabilisation / capacité à démontrer la conformité
```

Conséquences pour l'architecture :

- ne collecter que les données réellement nécessaires ;
- ne pas ajouter un champ « au cas où » sans finalité identifiée ;
- ne pas réutiliser une donnée pour une nouvelle finalité incompatible sans revue ;
- limiter les accès selon les rôles et besoins ;
- documenter les cycles de vie ;
- sécuriser les suppressions et anonymisations ;
- tester les règles sensibles.

La sécurité détaillée du Core reste documentée dans `docs/security/SECURITY.md`.

---

## 6. Information des personnes

Lorsqu'une application collecte ou utilise des données personnelles, l'information doit correspondre au traitement réel.

Selon le contexte, elle doit notamment couvrir :

```text
identité et coordonnées du responsable de traitement
coordonnées du DPO/contact si applicable
finalité
base légale
caractère obligatoire ou facultatif de la donnée
conséquences éventuelles d'une non-fourniture
destinataires / catégories de destinataires
durée ou critère de conservation
transferts hors UE/EEE lorsqu'applicables
droits des personnes
modalités d'exercice des droits
droit de réclamation auprès de la CNIL
information sur décision automatisée/profilage lorsque applicable
```

La présentation peut être organisée en plusieurs niveaux : information courte au point de collecte puis politique de confidentialité plus complète.

Une même mention générique ne doit pas être copiée sous tous les formulaires si les finalités diffèrent.

Exemples de points de collecte Core :

```text
register
profil
invitation
upload de fichier
administration Workspace / Platform
subscription / futur Billing
```

---

## 7. Cookies, traceurs et autres stockages terminal

Les règles cookies/traceurs ne se confondent pas avec l'ensemble du RGPD.

Le régime applicable dépend de la finalité réelle du mécanisme de lecture/écriture sur le terminal.

### 7.1 Deux catégories à distinguer

```text
strictement nécessaire au service demandé
→ consentement préalable potentiellement non requis
→ information et inventaire restent nécessaires

non nécessaire / soumis au consentement
→ pas de dépôt/lecture avant choix valide
→ consentement libre, spécifique, éclairé et univoque
→ preuve du consentement lorsque nécessaire
→ retrait aussi simple que l'acceptation
```

La CNIL cite notamment l'authentification et la sécurisation de l'authentification parmi les usages pouvant relever des traceurs exemptés lorsqu'ils sont effectivement strictement nécessaires.

### 7.2 État actuel du Core

Le Core possède actuellement :

```text
refreshToken
→ cookie HttpOnly d'authentification/session
→ Secure en production
→ SameSite=lax
→ Path=/api/auth

saas-core:theme:<scope>
→ localStorage
→ préférence light/dark
```

Aucun SDK analytics, publicitaire ou de suivi inter-sites n'est actuellement déclaré dans les dépendances frontend, et `frontend/index.html` ne charge aucun script tiers de tracking.

Qualification actuelle :

- `refreshToken` est techniquement conçu comme strictement nécessaire à l'authentification sécurisée ;
- la préférence de thème est une préférence d'interface à inventorier et à qualifier selon le produit réel ;
- aucune catégorie analytics/publicité ne doit être inventée aujourd'hui.

### 7.3 Pas de bannière fictive

La présence d'un cookie technique n'impose pas à elle seule une bannière « Accepter les cookies ».

Une application dérivée qui n'utilise que des mécanismes exemptés ne doit pas créer artificiellement un faux choix de consentement.

Si des traceurs soumis au consentement sont ajoutés plus tard :

```text
aucun consentement
→ aucun chargement / aucune initialisation du traceur optionnel

consentement accordé
→ initialisation autorisée uniquement pour les finalités acceptées
```

Le refus doit être aussi accessible que l'acceptation et le choix doit pouvoir être modifié ultérieurement.

---

## 8. Architecture future de consentement — seulement si nécessaire

Le Core ne possède pas encore de module de consentement.

Si un SaaS dérivé en a réellement besoin, l'architecture devra séparer au minimum :

```text
ConsentConfiguration
→ finalités/catégories/traceurs réellement déclarés

ConsentRecord
→ preuve minimale du choix et de la version présentée

Consent Manager frontend
→ accepter/refuser/personnaliser/modifier

Tracker Gate
→ blocage technique effectif avant consentement
```

Ces responsabilités ne doivent pas être fusionnées dans `User`, `Workspace`, `Plan` ou `Subscription`.

Le frontend devra réutiliser les composants partagés conformément à `docs/frontend/FRONTEND-GUIDELINES.md`.

Aucun `ConsentRecord`, aucune durée de preuve ni aucun modèle de catégorie ne doit être présenté comme implémenté tant que le lot fonctionnel correspondant n'existe pas.

---

## 9. Durées de conservation

Les données personnelles ne doivent pas être conservées indéfiniment. La durée ou les critères de durée doivent être déterminés à partir de la finalité et des obligations applicables.

Le Core ne fixe donc pas une durée juridique unique pour :

```text
User
WorkspaceMember
WorkspaceInvitation
AuthSession
PasswordResetToken
AuditLog
File
Subscription
TrialEligibility
UsageMetric
futur Billing
futur ConsentRecord
```

Une expiration technique n'est pas automatiquement une durée réglementaire de conservation.

La matrice pré-production doit au minimum contenir :

| Catégorie | Finalité | Base légale | Base active | Archivage intermédiaire | Sort final |
|---|---|---|---|---|---|
| exemple | à définir | à définir | durée/critère | si justifié | suppression / anonymisation / conservation légale |

Le cycle de vie doit aussi préciser l'effet sur :

- sauvegardes ;
- fichiers physiques ;
- journaux ;
- exports ;
- données chez les sous-traitants ;
- copies de sécurité ;
- données contractuelles devant éventuellement être conservées.

La dette D-006 de `docs/DEBT.md` reste ouverte tant que cette politique n'est pas implémentée et testée.

---

## 10. Exercice des droits

Chaque SaaS dérivé doit déterminer les droits applicables à chaque traitement et fournir un moyen opérationnel de les exercer.

Selon le traitement, cela peut inclure :

```text
accès
rectification
effacement
limitation
opposition
portabilité
retrait du consentement
réclamation auprès de la CNIL
```

Une demande d'effacement ne signifie pas nécessairement suppression immédiate et aveugle de toutes les données : certaines données peuvent devoir être conservées pour une obligation légale ou une autre base applicable.

Le futur workflow de fermeture de compte doit donc être coordonné avec :

```text
D-001 fermeture de compte/workspace
D-003 conformité
D-006 rétention/anonymisation
```

Les workflows de droits doivent prévoir une vérification d'identité proportionnée, une autorisation stricte, une traçabilité adaptée et une absence de surcollecte.

---

## 11. Responsable de traitement et sous-traitant

Une plateforme SaaS peut exercer des rôles différents selon les traitements.

Exemple conceptuel :

```text
données de compte / sécurité propres à la plateforme
→ rôle à qualifier pour l'éditeur

contenu métier déposé par un client dans son Workspace
→ rôle potentiellement différent selon le contrat et la finalité
```

Le Core ne code donc pas une qualification juridique unique pour toutes les données.

Lorsqu'un prestataire traite des données pour le compte du responsable du traitement, la relation doit être encadrée conformément aux exigences applicables, notamment celles de l'article 28 du RGPD.

Chaque produit doit maintenir la liste réelle de ses sous-traitants et vérifier leurs garanties, contrats, sous-traitants ultérieurs et mesures de sécurité selon le cas.

---

## 12. Transferts hors UE / EEE

Un SaaS dérivé doit identifier où les données sont réellement traitées et stockées.

Lorsqu'un transfert hors UE/EEE existe, il doit être qualifié et encadré avec un mécanisme juridique approprié selon la situation réelle, par exemple décision d'adéquation, clauses contractuelles types ou autre mécanisme applicable.

Ne jamais conclure qu'il n'existe aucun transfert uniquement parce que le serveur principal est hébergé en Europe : email, stockage, support, analytics, paiement, IA ou observabilité peuvent introduire d'autres flux.

---

## 13. AIPD / analyse d'impact

Une AIPD doit être évaluée lorsqu'un traitement est susceptible d'engendrer un risque élevé pour les droits et libertés des personnes.

Les critères peuvent notamment inclure :

```text
profilage / scoring
décision automatisée importante
surveillance systématique
données sensibles ou hautement personnelles
grand volume
croisement de données
personnes vulnérables
technologie innovante
exclusion d'un droit ou d'un service
```

Une application dérivée ajoutant par exemple un module IA, santé, profilage ou données de personnes vulnérables doit déclencher explicitement cette revue.

L'AIPD, lorsqu'elle est requise, doit intervenir avant la mise en œuvre du traitement et être revue lorsque le traitement évolue significativement.

---

## 14. Incidents et violations de données

`AuditLog` n'est pas une procédure de gestion des violations de données.

Chaque déploiement de production doit prévoir :

```text
détection de l'incident
qualification de la violation
mesures de confinement
registre interne des violations
évaluation du risque pour les personnes
notification CNIL lorsque requise
information des personnes lorsque requise
preuves et chronologie de décision
retour d'expérience
```

La CNIL rappelle que les violations présentant un risque pour les droits et libertés doivent être notifiées dans les meilleurs délais et, si possible, dans les 72 heures après en avoir pris connaissance. Les violations à risque élevé peuvent également nécessiter l'information des personnes concernées.

Le sous-traitant doit, de son côté, informer le responsable du traitement dans les meilleurs délais lorsqu'il constate une violation portant sur les données traitées pour son compte.

Cette procédure relève de l'exploitation/incident response et sera reliée à `docs/operations/OPERATIONS.md`.

---

## 15. Mentions légales et documents publics

Les mentions légales sont distinctes du RGPD.

Le produit final doit afficher les informations légalement requises selon :

```text
forme juridique
activité
caractère marchand ou non
statut professionnel
hébergement
territoire ciblé
relation B2B / B2C
```

Pour un site professionnel français, les informations portent notamment, selon le cas, sur l'identité de l'éditeur, ses coordonnées, les informations d'immatriculation applicables et l'hébergeur.

Le Core peut fournir une structure de page et un emplacement de navigation, mais il ne doit pas livrer de fausses valeurs génériques.

Les CGU, CGV, médiation de la consommation, résiliation d'abonnement et autres obligations commerciales sont à évaluer séparément selon le modèle réel du produit.

---

## 16. Privacy by design dans les futurs modules

Avant d'ajouter une nouvelle donnée, un nouveau fournisseur ou une nouvelle intégration, le développeur doit pouvoir répondre à :

```text
Pourquoi cette donnée est-elle nécessaire ?
Quelle finalité réelle sert-elle ?
Qui y accède ?
Combien de temps doit-elle exister ?
Peut-elle être évitée ou minimisée ?
Est-elle exportée vers un tiers ?
Le produit est-il responsable ou sous-traitant pour ce traitement ?
Quel mécanisme d'effacement/anonymisation est prévu ?
Une information utilisateur doit-elle être ajoutée ?
Une AIPD doit-elle être évaluée ?
L'inventaire doit-il être mis à jour ?
```

Une fonctionnalité ne doit pas attendre la fin du développement pour découvrir ses obligations de données.

---

## 17. Tests de conformité technique

Lorsqu'un mécanisme de conformité est implémenté, les tests doivent vérifier le comportement réel, pas seulement la présence d'une interface.

Exemples :

### Cookies/consentement

```text
refus → aucun tracker optionnel initialisé
acceptation → uniquement les finalités acceptées
retrait → arrêt des futurs traitements concernés
refreshToken → authentification toujours fonctionnelle après refus optionnel
```

### Rétention / droits

```text
suppression logique ≠ purge physique supposée
règles de rétention respectées
anonymisation irréversible lorsque requise
frontière Workspace préservée
opérations sensibles auditées
```

### E2E

Playwright devra couvrir les parcours de consentement et droits réellement implémentés lorsqu'ils deviennent applicables.

---

## 18. Gate pré-production

Un SaaS dérivé ne doit pas être considéré conforme ou prêt à être commercialisé uniquement parce que le Core fonctionne.

Avant un go-live réel, vérifier au minimum :

- inventaire des données, traitements, traceurs et prestataires à jour ;
- registre des traitements adapté au produit ;
- finalités et bases légales déterminées ;
- politique de confidentialité correspondant aux traitements réels ;
- mentions légales complétées ;
- information présente aux points de collecte nécessaires ;
- cookies/traceurs correctement classifiés ;
- traceurs optionnels réellement bloqués avant consentement si applicable ;
- retrait/modification du consentement testés si applicable ;
- durées de conservation et mécanismes de purge/anonymisation définis ;
- exercice des droits opérationnel ;
- sous-traitants et contrats évalués ;
- transferts internationaux identifiés et encadrés si applicable ;
- AIPD évaluée et réalisée si requise ;
- procédure de violation de données opérationnelle ;
- validation juridique/organisationnelle appropriée effectuée.

---

## 19. État actuel du Core

Au 2026-09-05 :

```text
inventaire technique initial
→ oui

cookie d'authentification strictement technique
→ oui

préférence de thème localStorage
→ oui

analytics / publicité / tracking tiers identifié dans le frontend
→ non

module ConsentConfiguration / ConsentRecord
→ non implémenté

centre de préférences cookies
→ non implémenté

pages légales finalisées
→ non, dépend du produit dérivé

workflow complet d'exercice des droits / fermeture de compte
→ non finalisé

politique réglementaire complète de rétention/anonymisation
→ non finalisée
```

Les dettes D-003 et D-006 restent donc actives dans `docs/DEBT.md`.

DOC-7 consolide le cadre documentaire ; il ne transforme pas ces dettes en fonctionnalités implémentées.

---

## 20. Documents historiques absorbés

Le contenu encore utile des documents suivants est désormais consolidé dans ce document et dans l'inventaire canonique :

```text
docs/functional-debt-privacy-cookies-rgpd.md
docs/functional-debt-rgpd-cookies-privacy-legal.md
docs/rgpd-cookies-privacy-technical-cadrage.md
docs/rgpd-data-tracker-inventory.md
```

Ces fichiers restent physiquement présents jusqu'au lot de nettoyage et à autorisation explicite de suppression.

---

## 21. Règle de maintenance

Mettre à jour `COMPLIANCE.md` et/ou l'inventaire dans le même lot lorsqu'une évolution modifie :

```text
catégories de données
finalité
point de collecte
traceur ou stockage navigateur
provider / sous-traitant
transfert international
rétention
workflow de droits
consentement
incident response lié aux données
IA ou profilage
Billing/Payment
```

Une application dérivée doit compléter ce cadre avec sa propre réalité opérationnelle et juridique, sans modifier les règles génériques du Core uniquement pour y inscrire ses informations d'entreprise.