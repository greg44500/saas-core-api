# Dette transverse — Cookies, traceurs, confidentialité et RGPD

## Statut

Dette de conformité volontairement différée mais **obligatoire avant une mise en production réelle destinée à des utilisateurs en France / Union européenne**.

Cette dette est transverse. Elle ne doit pas être classée uniquement comme dette frontend ou backend.

```text
Produit / juridique
├── finalités et bases légales
├── registre des traitements
├── politique de confidentialité
├── mentions légales / information utilisateur
├── durées de conservation
├── sous-traitants et transferts éventuels
└── politique de non-commercialisation / partage des données

Frontend
├── information utilisateur
├── bandeau / centre de préférences si nécessaire
├── accepter / refuser / personnaliser les traceurs soumis au consentement
├── retrait du consentement
└── blocage des traceurs non nécessaires avant consentement

Backend
├── minimisation des données
├── règles de conservation et purge
├── suppression / anonymisation / pseudonymisation selon les traitements
├── exercice des droits utilisateur
├── traçabilité pertinente
└── cohérence avec Account Closure, AuditLog, Files, Billing et sauvegardes
```

## 1. Cookies et traceurs : ne pas confondre avec les données personnelles en général

Un cookie est une information stockée ou lue sur le terminal de l'utilisateur. Certains cookies peuvent contenir ou permettre de relier des données à une personne, mais la réglementation des cookies/traceurs ne se confond pas avec l'ensemble du RGPD.

La politique cible doit distinguer au minimum :

- les cookies/traceurs strictement nécessaires au service ;
- les traceurs de préférence ou personnalisation ;
- les traceurs de mesure d'audience ;
- les traceurs publicitaires ;
- les traceurs de réseaux sociaux ou services tiers ;
- les autres stockages côté navigateur pouvant relever de la réglementation applicable.

## 2. Consentement cookies/traceurs

Tous les cookies ne nécessitent pas un consentement préalable.

Les traceurs strictement nécessaires à la fourniture du service demandé peuvent être exemptés de consentement. Les traceurs non nécessaires doivent, lorsqu'ils relèvent du régime de consentement, être bloqués tant que l'utilisateur n'a pas exprimé un choix valide.

Le refresh token du socle est transporté par cookie HttpOnly pour l'authentification/session. À ce stade, il est à traiter comme un mécanisme strictement nécessaire au service, sous réserve du cadrage juridique final et de l'usage réel de l'application.

Le frontend ne doit donc pas afficher artificiellement un bandeau « accepter les cookies » uniquement parce qu'un cookie technique existe.

## 3. Future surface frontend de gestion du consentement

Si des traceurs soumis au consentement sont ajoutés, prévoir une surface dédiée réutilisable :

```text
CookieConsentBanner
CookiePreferencesDialog
CookieCategoryToggle
PrivacySettingsLink
```

Le parcours devra permettre :

- accepter les traceurs optionnels ;
- les refuser avec une simplicité comparable ;
- personnaliser les catégories si nécessaire ;
- modifier ultérieurement son choix ;
- retirer le consentement ;
- conserver la preuve technique utile du choix sans créer de traçage supplémentaire injustifié ;
- ne jamais charger avant consentement les scripts/SDK soumis à consentement.

Le consentement ne devra pas être stocké dans Redux comme source de vérité durable. Une stratégie dédiée de persistance devra être définie au moment du cadrage.

## 4. Politique de confidentialité / RGPD

Avant production réelle, le produit devra disposer d'une politique de confidentialité correspondant aux traitements réellement effectués.

Le cadrage devra identifier pour chaque traitement :

- finalité ;
- catégories de données ;
- personnes concernées ;
- base légale ;
- durée de conservation ;
- destinataires ;
- sous-traitants ;
- transfert éventuel hors UE/EEE ;
- mesures de sécurité ;
- droits applicables ;
- mécanisme d'exercice des droits.

Aucune durée de conservation ne doit être inventée dans le code sans avoir été cadrée selon la finalité et les obligations applicables.

## 5. Conservation des données

Le socle possède déjà plusieurs cycles de vie qui devront être intégrés à une politique globale de conservation :

- `User` et fermeture de compte ;
- `AuthSession` ;
- `PasswordResetToken` ;
- `Workspace` / `WorkspaceMember` ;
- `WorkspaceInvitation` ;
- `Subscription` / futur Billing ;
- `TrialEligibility` ;
- `File` et purge physique différée ;
- `UsageMetric` ;
- `AuditLog` ;
- éventuelles sauvegardes et exports.

Chaque catégorie pourra avoir une durée différente. La politique doit distinguer base active, archivage intermédiaire lorsqu'il est justifié et suppression/anonymisation définitive.

## 6. Non-commercialisation et partage des données

La notion de « non-commercialisation des données » relève d'un engagement produit/juridique qui doit être cohérent avec les traitements techniques réels.

Il faudra documenter clairement :

- si les données sont ou non vendues ;
- dans quels cas elles sont transmises à des sous-traitants nécessaires au service ;
- quels fournisseurs techniques interviennent ;
- pour quelles finalités ;
- avec quelles garanties contractuelles et techniques.

Une politique ne doit jamais promettre « aucune transmission à des tiers » si l'application utilise en réalité hébergeur, email provider, paiement, antivirus cloud, analytics ou autres sous-traitants nécessaires.

## 7. Exercice des droits utilisateur

Le futur domaine de conformité devra être coordonné avec `Account Closure` et prévoir selon les traitements applicables :

- accès aux données ;
- rectification ;
- effacement lorsque applicable ;
- limitation ;
- opposition ;
- portabilité lorsque applicable ;
- retrait du consentement lorsque le consentement constitue la base légale.

Ces workflows devront être sécurisés, authentifiés lorsque nécessaire, auditables sans exposer de données supprimées et compatibles avec les obligations de conservation qui peuvent limiter une suppression immédiate.

## 8. Relation avec les dettes existantes

Cette dette complète notamment :

- `docs/functional-debt-account-workspace-closure.md` ;
- la future dette Billing/Payment ;
- les règles de conservation Files ;
- AuditLog ;
- les futurs providers cloud ;
- les futurs outils analytics/marketing.

La fermeture de compte ne devra pas être finalisée sans cadrage RGPD, car suppression, anonymisation et conservation sélective sont directement liées.

## 9. Déclencheurs de reprise obligatoires

Cette dette devra être reprise **avant** l'un des événements suivants :

- mise en production publique réelle ;
- ajout d'un outil analytics non strictement exempté ;
- ajout d'un outil publicitaire ou marketing ;
- ajout d'un SDK tiers déposant/lisant des traceurs ;
- activation d'un vrai Billing/Payment avec données client ;
- mise en place des workflows de fermeture de compte ;
- collecte de nouvelles données personnelles non couvertes par le cadrage actuel.

## 10. Lots futurs recommandés

```text
C1 — Cartographie des traitements et données
C2 — Politique de conservation / purge / anonymisation
C3 — Politique de confidentialité + mentions applicables
C4 — Inventaire cookies/traceurs et classification
C5 — CMP légère / bannière / centre de préférences si nécessaire
C6 — Exercice des droits utilisateur
C7 — Tests de conformité et audit pré-production
```

Le lot C5 ne doit être développé qu'après l'inventaire C4 : si le produit n'utilise que des traceurs strictement nécessaires, une bannière de consentement générale peut être inutile et même trompeuse.

## 11. Références de cadrage à vérifier lors de la reprise

Références officielles prioritaires :

- CNIL — Cookies et autres traceurs : règles et mise en conformité ;
- CNIL — Cookies et traceurs : que dit la loi ? ;
- CNIL — Durées de conservation des données ;
- RGPD et loi Informatique et Libertés applicables au traitement considéré.

Le cadrage juridique final devra être revérifié au moment de l'implémentation, car les recommandations, jurisprudences, fournisseurs et traitements réels peuvent évoluer.

## 12. Invariant de sécurité produit

Le Core ne doit jamais transformer la conformité en simple composant visuel.

```text
bannière cookies ≠ conformité RGPD
politique de confidentialité ≠ suppression technique effective
consentement affiché ≠ blocage réel des traceurs
```

La conformité devra rester vérifiable par le comportement réel du frontend, du backend, des fournisseurs tiers et des politiques de conservation.