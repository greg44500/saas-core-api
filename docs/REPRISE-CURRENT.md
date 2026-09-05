# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Ce fichier est l'unique synthèse de reprise active du projet. Il n'est pas normatif et sera supprimé uniquement lorsque le Core sera finalisé et que sa suppression aura été explicitement validée.

## 1. Hiérarchie d'autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. documents historiques temporairement conservés ;
8. présent fichier.

Important : le `main` contient actuellement une implémentation **intermédiaire** de CORE-FIN-4 / D-001 qui doit encore être recadrée selon les décisions métier de cette synthèse. Le code intermédiaire ne doit donc pas être considéré comme le contrat final de fermeture de compte.

---

## 2. État général du projet

Le chantier documentaire **DOC-0 → DOC-11 est terminé**.

Les lots de finalisation suivants sont également clôturés :

```text
CORE-FIN-1
→ reprise / audit F10.6
→ F10.6 déjà implémenté et considéré terminé

CORE-FIN-2
→ audit fonctionnel réel du HEAD
→ terminé

CORE-FIN-3
→ corrections ciblées révélées par l'audit
→ terminé et validé
```

Corrections CORE-FIN-3 validées :

- suppression du double montage du `subscriptionRouter` ;
- politique de transfert d'ownership en remédiation rendue explicite ;
- tests associés corrigés et validés.

Dernier baseline validé avant le chantier CORE-FIN-4 :

```text
backend : tous les tests verts
frontend : tous les tests verts
frontend build : OK
```

Le dépôt reste en version de développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement production-ready.

---

## 3. Roadmap de finalisation Core

Roadmap retenue :

```text
CORE-FIN-1  reprise et clôture F10.6                    ✅
CORE-FIN-2  audit fonctionnel complet                  ✅
CORE-FIN-3  corrections révélées par l'audit           ✅
CORE-FIN-4  D-001 fermeture Account / Workspace        EN COURS
CORE-FIN-5  D-014 points d'extension métier
CORE-FIN-6  D-015 versionnement / migrations / release
CORE-FIN-7  D-016 Playwright / E2E Core
CORE-FIN-8  audit final architecture / sécurité / qualité
CORE-FIN-9  D-017 dérivation pilote + upgrade Core
CORE-FIN-10 release v1.0.0
```

Après CORE-FIN-4, ne pas inventer un nouveau lot depuis une ancienne checklist : reprendre cette roadmap et vérifier le HEAD réel avant chaque bloc.

---

## 4. Documentation canonique active

Porte d'entrée du dépôt :

```text
README.md
```

Index interne :

```text
docs/README.md
```

Références canoniques :

```text
docs/DEBT.md

docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/contracts/CAPABILITIES.md

docs/architecture/ARCHITECTURE.md
docs/architecture/BACKEND.md
docs/architecture/FRONTEND.md

docs/security/SECURITY.md
docs/frontend/FRONTEND-GUIDELINES.md
docs/derived-saas/DERIVED-SAAS.md

docs/compliance/COMPLIANCE.md
docs/compliance/rgpd-data-tracker-inventory.md

docs/operations/OPERATIONS.md
docs/development-trial-reset.md
```

`frontend/README.md` est à jour comme guide local du frontend.

---

## 5. Règles permanentes de développement

### 5.1 Sécurité

Principe :

```text
ne jamais faire dépendre la cohérence du système
uniquement de la coopération de l'utilisateur
```

Le frontend n'est jamais l'autorité sur :

- les Workspaces réellement possédés ;
- les memberships ;
- les droits ;
- les conséquences d'une fermeture ;
- la Subscription ;
- les quotas ;
- les transitions de statut.

Le backend recalcule toujours la situation réelle depuis MongoDB avant une mutation sensible.

### 5.2 Architecture frontend

Réutilisabilité obligatoire :

- `DataTable` pour les tableaux compatibles ;
- drawers partagés ;
- confirmations partagées ;
- formulaires réutilisables ;
- pages légères ;
- RTK Query pour le server state ;
- Redux Toolkit pour le vrai state global client ;
- `useState` pour le state local.

Aucun composant dupliqué sans justification.

### 5.3 Suppression de fichiers

Règle utilisateur impérative :

```text
ne supprimer aucun fichier sans approbation explicite préalable
```

Cette règle vaut aussi pour un déplacement qui supprimerait l'ancien chemin.

---

# 6. CORE-FIN-4 / D-001 — état actuel

## 6.1 Objectif

D-001 doit fournir un cycle de vie complet et sécurisé pour :

- fermeture volontaire du compte User ;
- archivage volontaire des Workspaces ;
- fermeture terminale Platform des Workspaces ;
- AuthSessions ;
- memberships ;
- invitations ;
- Subscription ;
- AuditLog ;
- compatibilité avec la future rétention/anonymisation D-006.

Invariant :

```text
fermeture fonctionnelle
≠
suppression physique des données
```

D-006 reste responsable de la politique réelle de rétention, anonymisation et purge.

---

# 7. Décisions métier finales à respecter pour D-001

## 7.1 Fermeture volontaire d'un simple membre

Si le User n'est pas owner d'un Workspace :

```text
User demande la fermeture
↓
sa membership est retirée
↓
le quota membre est libéré
↓
le Workspace reste actif
↓
les autres membres ne sont pas impactés
```

Le compte du User est ensuite fermé selon le workflow Account.

---

## 7.2 Fermeture volontaire d'un owner

Décision retenue :

> La fermeture volontaire d'un compte entraîne automatiquement l'archivage des Workspaces dont ce compte est encore owner au moment de la demande.

Le transfert d'ownership reste possible **avant** la demande de fermeture mais n'est plus une obligation technique.

Workflow :

```text
Owner transfère éventuellement certains Workspaces
↓
Owner demande la fermeture du compte
↓
backend recalcule les ownership réels
↓
Workspaces encore possédés
→ ARCHIVED automatiquement
↓
les autres membres perdent l'accès à ces Workspaces
mais leurs comptes restent actifs
↓
Workspaces transférés auparavant
→ restent ACTIVE avec le nouvel owner
```

Cette conséquence devra être présentée clairement dans l'UI et devra être cohérente avec les futures CGU/conditions contractuelles du SaaS dérivé.

Le backend ne doit jamais accepter du frontend une liste `workspacesToClose` comme source de vérité.

---

## 7.3 ARCHIVED et CLOSED sont distincts

Le modèle existant possède déjà :

```text
ACTIVE
SUSPENDED
ARCHIVED
CLOSED
```

Sens à conserver :

### ARCHIVED

```text
retrait volontaire / opérationnel du Workspace
↓
plus d'accès courant
↓
données conservées
↓
Files conservés
AuditLogs conservés
memberships conservées historiquement lorsque pertinent
↓
traitements de fermeture/rétention encore possibles
```

Un owner peut provoquer l'archivage.

### CLOSED

```text
fermeture fonctionnelle terminale
↓
aucune réactivation normale
↓
données toujours conservées selon D-006
```

`CLOSED` reste une décision Platform / administrative.

Ne pas permettre à un owner de passer directement son Workspace à `CLOSED`.

---

## 7.4 Suspension administrative d'un User

`User.status = disabled` est différent d'une fermeture volontaire.

```text
User DISABLED
→ sessions révoquées
→ authentification impossible
→ memberships conservées
→ Workspaces conservés
→ possibilité de réactivation du User
```

Une suspension de sécurité ne doit pas fermer automatiquement les Workspaces du User.

---

## 7.5 Incident de paiement

Un incident de paiement est encore un autre workflow.

Règle :

```text
incident paiement
→ User reste ACTIVE
→ Subscription porte l'état commercial réel
→ Workspace peut passer en grâce / remediation
→ owner conserve l'accès nécessaire à la régularisation
```

Ne jamais faire :

```text
paiement échoué
→ User DISABLED
```

car un User peut appartenir à plusieurs Workspaces et doit pouvoir se connecter pour régulariser.

Le traitement détaillé appartient à D-004 Billing / Payment, pas à D-001.

---

# 8. Décisions Billing à conserver pour D-004 — NE PAS CODER DANS CORE-FIN-4

Les discussions CORE-FIN-4 ont fait émerger des règles importantes pour D-004.

## 8.1 Alerte Platform

Un incident de paiement doit pouvoir :

- notifier le propriétaire ;
- remonter une alerte dans la Platform ;
- permettre à un opérateur autorisé d'analyser l'incident.

## 8.2 Médiateur humain

Le workflow nominal doit rester automatisé, mais un humain autorisé doit pouvoir intervenir comme voie de secours.

Rôle du médiateur humain :

```text
observer
analyser
diagnostiquer
communiquer
accorder une exception temporaire
rapprocher un paiement externe
déclencher une action métier sécurisée
```

Il ne doit jamais :

```text
modifier MongoDB à la main
falsifier Subscription.status
contourner l'authentification
stocker une CB dans le Core
saisir ou journaliser PAN / CVV
```

## 8.3 Grâce commerciale

Concept futur à prévoir :

```text
Subscription = PAST_DUE
+
grâce commerciale temporaire
↓
Workspace accessMode = NORMAL temporairement
```

La Subscription conserve la vérité commerciale réelle.

Une grâce doit être :

- limitée dans le temps ;
- motivée ;
- accordée par une permission Platform ;
- auditée ;
- automatiquement expirée.

Ne pas détourner `EntitlementOverride` pour représenter cette grâce : EntitlementOverride reste lié aux features/limits, pas au statut commercial du Workspace.

## 8.4 Paiement externe / hors plateforme

Un paiement peut être régularisé hors de l'application :

- virement ;
- terminal du provider ;
- paiement manuel ;
- lien de paiement sécurisé ;
- autre moyen accepté par le produit dérivé.

Le Core futur devra permettre une action métier du type :

```text
enregistrer / rapprocher un paiement externe
```

puis laisser le service Billing décider de la conséquence sur la Subscription.

Ne pas exposer un bouton générique « forcer Subscription ACTIVE ».

## 8.5 Paiement par téléphone

Le support humain peut accompagner un paiement, mais le SaaS Core ne doit pas manipuler les données de carte.

Préférence :

```text
support
→ envoie un lien de paiement sécurisé
→ client saisit sa CB chez le provider
→ provider confirme
→ Billing rapproche le paiement
```

Le SaaS ne conserve que les références non sensibles nécessaires au rapprochement.

## 8.6 Permissions Platform futures

Exemples conceptuels à cadrer dans D-004 :

```text
billing_incident:read
billing_grace:grant
billing_grace:revoke
external_payment:record
```

Ne pas les créer dans CORE-FIN-4.

---

# 9. Code CORE-FIN-4 déjà poussé — IMPORTANT : INTERMÉDIAIRE

Plusieurs fichiers backend ont déjà été ajoutés/modifiés pendant le premier cadrage de D-001.

Leur présence est utile, mais certains comportements reflètent encore l'ancienne règle et doivent être corrigés avant validation.

Éléments déjà présents :

- route self-service `/api/users/me/closure` ;
- service `userClosure.service.js` ;
- service `workspaceClosure.service.js` ;
- fermeture Platform Workspace ;
- finalisation Platform User ;
- nouveaux AuditLog liés aux fermetures ;
- nouvelles raisons de révocation AuthSession ;
- blocage partiel de `deletion_requested` dans Auth ;
- révocation d'invitations ;
- tests de routes/services/validation ajoutés ou renforcés.

### Incohérences connues à corriger

#### A. Ancienne règle owner encore dans `userClosure.service.js`

Le code refuse encore actuellement la fermeture du compte si le User possède un Workspace ouvert :

```text
« Transférez ou fermez tous les workspaces... »
```

Cette règle est abandonnée.

La nouvelle règle est :

```text
Workspace encore possédé
→ archivage automatique dans la transaction de fermeture Account
```

#### B. Owner ferme actuellement un Workspace vers CLOSED

`workspaceClosure.service.js` pousse actuellement un owner vers :

```text
ACTIVE → CLOSED
```

C'est incohérent avec le contrat existant.

À corriger en :

```text
owner
→ ACTIVE → ARCHIVED

Platform
→ ACTIVE / SUSPENDED / ARCHIVED → CLOSED
```

#### C. Auth encore partiellement incohérent

Le durcissement Auth doit être uniformisé sur :

```text
login
access token
refresh token
forgot-password
reset-password
```

Aucun workflow de récupération/authentification ne doit pouvoir réactiver un compte fermé ou en cours de fermeture.

Le code actuel comporte encore au moins une ancienne tolérance de `DELETION_REQUESTED` dans le reset/refresh à vérifier et corriger.

### Tests du code intermédiaire

Ne pas considérer les nouveaux tests CORE-FIN-4 comme validés globalement tant que le recadrage ci-dessus n'est pas terminé.

Le dernier baseline entièrement validé reste celui d'avant CORE-FIN-4.

---

# 10. Ordre exact de reprise dans la prochaine conversation

## CORE-FIN-4A.1 — Corriger ARCHIVED / CLOSED

Objectif :

```text
Owner
→ ARCHIVE uniquement

Platform
→ CLOSE terminal
```

Travail :

- refactorer `workspaceClosure.service.js` ;
- séparer clairement archive owner et close Platform ;
- conserver transaction, révocation invitations, neutralisation Subscription et AuditLog adaptés ;
- ajuster routes/controllers/validations si nécessaire ;
- mettre à jour les tests ciblés.

Ne pas commencer le frontend avant validation backend.

---

## CORE-FIN-4A.2 — Orchestration automatique de fermeture User

Supprimer l'obligation de transfert préalable.

Le serveur doit :

1. authentifier et confirmer fortement l'utilisateur ;
2. charger ses memberships réelles ;
3. identifier les Workspaces dont il est owner ;
4. archiver automatiquement ceux encore possédés ;
5. retirer ses memberships sur les Workspaces dont il n'est pas owner ;
6. révoquer ses invitations pending ;
7. révoquer ses AuthSessions ;
8. fermer le compte selon le workflow final retenu ;
9. écrire les AuditLogs ;
10. effectuer le tout dans une transaction MongoDB cohérente.

Le comportement doit être `all-or-nothing`.

Échec sur un Workspace N :

```text
rollback de toute la fermeture
```

---

## CORE-FIN-4A.3 — Endpoint closure-impact

Créer un endpoint informatif avant confirmation finale, conceptuellement :

```text
GET /api/users/me/closure-impact
```

Il doit retourner depuis le backend :

- Workspaces possédés ;
- Workspaces qui seront archivés ;
- nombre d'autres membres impactés ;
- Workspaces où le User est simple membre ;
- memberships qui seront retirées ;
- subscriptions concernées si pertinent pour l'information.

Le résultat est un aperçu UX uniquement.

Au moment du POST de fermeture, tout doit être recalculé depuis la base.

---

## CORE-FIN-4A.4 — Confirmation forte et Auth hardening

Payload de fermeture à finaliser autour de :

```text
currentPassword
confirmationEmail
confirmAccountClosure = true
```

Validation Zod stricte, idéalement `z.literal(true)` pour la confirmation explicite.

Uniformiser ensuite :

```text
login
access token
refresh
forgot-password
reset-password
```

Aucun chemin ne doit interpréter `DELETION_REQUESTED` ou `CLOSED` de façon contradictoire.

---

## CORE-FIN-4A.5 — Tests backend ciblés puis régression complète

Scénarios minimum :

```text
simple membre ferme son compte
→ sa membership supprimée
→ Workspace reste actif

owner seul ferme son compte
→ Workspace archivé

owner avec d'autres membres ferme son compte
→ Workspace archivé
→ comptes des autres membres inchangés

owner a transféré avant fermeture
→ Workspace transféré reste actif

User possède plusieurs Workspaces
→ tous les Workspaces encore possédés sont archivés

User possède certains Workspaces et est membre ailleurs
→ owned archivés
→ memberships ailleurs retirées

Subscription active d'un Workspace archivé
→ neutralisée selon contrat

invitations Workspace pending
→ revoked

invitations reçues par le User
→ revoked

dernier super-admin
→ fermeture refusée

confirmation incorrecte
→ aucune mutation

échec concurrent sur un Workspace
→ transaction rollback

ancien access token
→ refus

ancien refresh token
→ refus

forgot/reset après fermeture
→ refus
```

Puis :

```bash
npm test
```

Ne passer au frontend qu'avec backend vert.

---

# 11. CORE-FIN-4B — Frontend

Une fois CORE-FIN-4A entièrement vert.

## 11.1 Account

Ajouter une zone sensible dans l'espace Account :

```text
Fermer mon compte
```

Flow recommandé :

```text
clic
↓
RTK Query → closure-impact
↓
Drawer / ConfirmationDialog partagé
↓
affichage des conséquences réelles
↓
mot de passe
email de confirmation
confirmation explicite
↓
POST fermeture
↓
reset cache RTK Query
fin session Redux
redirection login
```

L'UI doit clairement distinguer :

- Workspaces possédés qui seront archivés ;
- nombre d'autres membres qui perdront leur accès à ces Workspaces ;
- Workspaces dont le User est seulement membre et qui resteront actifs.

Ne pas créer un composant de confirmation isolé si un composant partagé existant peut être composé.

## 11.2 Workspace Settings

Pour un owner :

```text
Archiver ce Workspace
```

Pas :

```text
Fermer définitivement
```

La fermeture terminale `CLOSED` reste Platform.

## 11.3 Platform

D-001 ne doit pas introduire une file humaine obligatoire de fermeture.

Cas nominal : automatisé.

Platform doit pouvoir observer :

- comptes fermés ;
- Workspaces archivés ;
- Workspaces closed ;
- AuditLogs associés.

Un système générique de `ClosureCase` n'est pas retenu pour Core 1.0 à ce stade.

---

# 12. CORE-FIN-4C — Documentation de clôture D-001

Après backend + frontend + tests + build :

mettre à jour au minimum :

```text
docs/contracts/CORE-CONTRACT.md
docs/contracts/COMMERCIAL.md
docs/security/SECURITY.md
docs/DEBT.md
docs/REPRISE-CURRENT.md
```

D-001 ne passe à `VALIDÉ` qu'après :

- backend complet ;
- frontend complet ;
- validations Zod ;
- transactions ;
- sécurité ;
- tests ciblés ;
- régression backend ;
- tests frontend ;
- build frontend ;
- documentation canonique alignée ;
- compatibilité D-006 explicitée.

---

# 13. Blockers Core 1.0 après D-001

Le registre canonique reste `docs/DEBT.md`.

Blockers connus :

```text
D-014
→ points d'extension métier : RBAC + routing backend/frontend

D-015
→ versionnement, provenance, releases et discipline de migration

D-016
→ E2E Core avec Playwright

D-017
→ exercice réel création + upgrade d'un SaaS dérivé pilote
```

D-001 est actuellement EN COURS dans le travail réel, même si `DEBT.md` pourra rester temporairement à `PLANIFIÉ` jusqu'au prochain alignement documentaire de CORE-FIN-4C.

---

# 14. Documents historiques encore conservés

Les fichiers suivants restent **historiques et non canoniques** :

```text
docs/backend-implementation-checklist.md
docs/frontend-implementation-checklist.md
docs/frontend-platform-admin-contract.md
docs/platform-overview-dashboard-contract.md
docs/dashboard-workspace-platform-boundary.md
```

Ils peuvent contenir d'anciens noms de lots et des références désormais supprimées.

Ne jamais les utiliser pour contredire :

```text
code
→ tests
→ contrats canoniques
→ architecture / sécurité / guidelines
→ DEBT.md
→ REPRISE-CURRENT.md pour l'état temporaire courant
```

Toute suppression future de ces fichiers nécessite une nouvelle approbation explicite.

---

# 15. Distribution future des SaaS dérivés

Décision actuelle :

```text
Core stable et versionné
↓
création du produit en conservant l'historique Git
↓
origin = dépôt produit
upstream-core = dépôt SAAS-CORE-API
↓
modules métier ajoutés par composition
↓
future release Core
↓
branche d'upgrade
↓
tests + migrations + revue
↓
intégration contrôlée
```

GitHub Template n'est pas la stratégie canonique pour un produit qui doit continuer à recevoir les mises à jour du Core.

---

# 16. Premier réflexe dans la prochaine conversation

La prochaine conversation doit commencer par :

```text
CORE-FIN-4A.1
→ auditer le HEAD actuel
→ corriger l'implémentation intermédiaire
→ ARCHIVED owner / CLOSED Platform
```

Puis poursuivre strictement :

```text
4A.1
→ 4A.2
→ 4A.3
→ 4A.4
→ tests backend ciblés
→ npm test
→ 4B frontend
→ tests frontend
→ build
→ 4C documentation
→ D-001 VALIDÉ
```

Ne pas coder D-004 Billing pendant CORE-FIN-4.

Ne pas demander à l'utilisateur de répéter les décisions ci-dessus : cette synthèse les porte.

---

# 17. Git / état local utilisateur

L'utilisateur n'avait volontairement **pas encore fait de `git pull`** pendant le recadrage métier de CORE-FIN-4.

Le `main` contient donc une implémentation backend intermédiaire de D-001, mais elle doit encore être corrigée selon cette synthèse avant d'être considérée comme un checkpoint propre.

Dans la prochaine conversation :

1. modifier d'abord le `main` pour aligner CORE-FIN-4A.1+ ;
2. faire valider le checkpoint ;
3. seulement ensuite demander à l'utilisateur de `git pull` et de lancer les tests lorsque le lot est cohérent.

---

# 18. Critère de suppression de ce fichier

`docs/REPRISE-CURRENT.md` pourra être supprimé uniquement lorsque :

- le Core sera finalisé ;
- la release stable et la politique de versionnement seront opérationnelles ;
- la dérivation + upgrade pilote auront été réellement validées ;
- aucune reprise de développement Core n'exigera plus de contexte temporaire ;
- la suppression aura été explicitement approuvée.
