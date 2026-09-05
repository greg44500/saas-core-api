# SAAS-CORE-API — Registre canonique des dettes actives

**Statut :** source de vérité documentaire pour les dettes non résolues  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** Core clonable et, lorsque précisé, applications dérivées

## 1. Objet

Ce document est le registre unique des dettes fonctionnelles, techniques, de conformité et de préparation à la production encore actives.

À partir de sa création :

```text
DEBT.md
→ source de vérité du statut des dettes

anciens fichiers functional-debt-* / deferred-work
→ documents historiques ou de cadrage à auditer avant suppression
```

Une dette résolue doit être mise à jour dans ce document dans le même lot que son implémentation et ses tests lorsque cela est possible. Git conserve l'historique ; ce fichier ne doit pas devenir une archive infinie de dettes closes.

## 2. Statuts

Les statuts utilisés sont :

```text
À CADRER
PLANIFIÉ
EN COURS
DIFFÉRÉ
CONDITIONNEL
BLOQUÉ
VALIDÉ
NON APPLICABLE
```

`NON APPLICABLE` doit être justifié dans l'application dérivée concernée.

## 3. Règles de maintenance

Pour chaque dette :

- conserver un identifiant stable ;
- indiquer son périmètre ;
- indiquer si elle bloque ou non une mise en production ;
- définir son critère de clôture ;
- ne pas dupliquer son statut dans un autre document ;
- lorsqu'elle devient `VALIDÉ`, vérifier le code, les tests et la documentation normative concernés ;
- retirer ensuite la dette active lors d'un nettoyage documentaire ultérieur, l'historique restant disponible dans Git.

---

## D-001 — Fermeture de compte et fermeture de workspace

**Statut :** À CADRER  
**Périmètre :** Core + application dérivée  
**Blocage production :** oui pour un cycle de vie de compte considéré complet

Le Core ne possède pas encore de workflow public complet de fermeture de compte. La route User courante expose la modification du profil mais pas de fermeture autonome du compte.

Le futur workflow doit coordonner au minimum :

- authentification et confirmation forte ;
- ownership des workspaces ;
- memberships ;
- sessions ;
- Subscription ;
- Files ;
- AuditLog ;
- données personnelles ;
- rétention, anonymisation et suppression réglementaire ;
- idempotence et concurrence ;
- audit des étapes sensibles.

**Critère de clôture :** workflow métier documenté puis implémenté, validations Zod strictes, protections d'autorisation, règles d'ownership, transactions/atomicité nécessaires, tests unitaires/intégration/E2E et politique de conservation cohérente.

---

## D-002 — Corbeille et restauration des fichiers

**Statut :** DIFFÉRÉ  
**Périmètre :** Core  
**Blocage production :** non pour la V1 actuelle

Le cycle actuel permet la suppression logique puis la purge différée, mais aucune route de restauration n'est exposée.

Une restauration devra notamment définir :

- permission de restauration ;
- accès à la corbeille ;
- vérification de l'existence physique du contenu ;
- réservation atomique de `storage_bytes` ;
- comportement si le Plan ne permet plus la restauration ;
- comportement en mode remédiation ;
- audit dédié ;
- frontière multi-tenant stricte.

**Critère de clôture :** listing de corbeille et restauration sécurisés côté backend, quota cohérent, UI dédiée, tests de sécurité et de concurrence pertinents.

---

## D-003 — RGPD, cookies, confidentialité et mentions légales

**Statut :** À CADRER  
**Périmètre :** Core + chaque application dérivée  
**Blocage production :** oui lorsqu'applicable au produit et aux traitements réels

La conformité ne doit pas être réduite à une bannière de cookies. Chaque produit dérivé doit réévaluer ses traitements réels, ses providers et ses traceurs.

À finaliser selon le produit :

- inventaire des traitements et catégories de données ;
- finalités et bases légales ;
- cookies/traceurs et nécessité éventuelle d'un consentement ;
- blocage réel des traceurs soumis à consentement avant choix ;
- politique de confidentialité ;
- mentions légales ;
- sous-traitants et transferts éventuels ;
- durées de conservation ;
- exercice des droits ;
- suppression, anonymisation ou conservation réglementaire ;
- validation juridique appropriée avant production.

Documents de travail complémentaires actuellement présents :

```text
docs/rgpd-cookies-privacy-technical-cadrage.md
docs/rgpd-data-tracker-inventory.md
```

Ces documents peuvent rester des supports spécialisés, mais ils ne doivent pas devenir une seconde source de vérité du statut de la dette.

**Critère de clôture :** conformité technique et documentaire alignée sur les traitements réels du produit, inventaire à jour et validation pré-production appropriée.

---

## D-004 — Billing / Payment réel

**Statut :** À CADRER  
**Périmètre :** application dérivée commercialisée avec paiement réel  
**Blocage production :** oui pour une commercialisation payante automatisée

Le Core gère Plan, Subscription, trial, entitlement, quotas et dérogations. Ces mécanismes ne constituent pas une autorité financière.

À finaliser lorsqu'un produit devient payant :

- provider de paiement ;
- frontière Billing/Payment distincte de Subscription ;
- identité facturée et coordonnées de facturation ;
- moyens de paiement ;
- événements provider et idempotence ;
- refus, retards, résiliations et remboursements ;
- remises, coupons et proratas réellement facturés ;
- TVA/taxes selon les règles applicables ;
- factures/avoirs lorsque nécessaires ;
- instantanés historiques ;
- audit des opérations sensibles.

Invariant :

```text
Subscription / entitlement
≠
encaissement / facture / autorité financière
```

**Critère de clôture :** domaine Billing/Payment sécurisé et testé, provider intégré si nécessaire, idempotence démontrée, fiscalité/facturation validées pour le produit.

---

## D-005 — Observabilité technique

**Statut :** DIFFÉRÉ  
**Périmètre :** chaque déploiement de production  
**Blocage production :** à apprécier selon le niveau de service attendu, mais une observabilité minimale est requise

`AuditLog` reste un journal fonctionnel et de sécurité ; il ne remplace pas le monitoring technique.

À prévoir :

- erreurs HTTP 5xx ;
- latence API ;
- santé MongoDB ;
- santé SMTP ;
- jobs asynchrones lorsqu'ils existent ;
- pipeline antivirus/File ;
- erreurs frontend significatives ;
- corrélation `requestId` ;
- métriques et alertes ;
- politique de rétention des logs ;
- absence de secrets dans les logs.

**Critère de clôture :** instrumentation et alertes adaptées à l'infrastructure réellement déployée, testées avant go-live.

---

## D-006 — Politique de rétention, anonymisation et suppression réglementaire

**Statut :** À CADRER  
**Périmètre :** Core + application dérivée  
**Blocage production :** oui lorsque des données personnelles, contractuelles ou réglementées sont conservées

Le soft delete, l'archivage et la fermeture fonctionnelle d'un compte ne constituent pas à eux seuls une politique de rétention.

À définir :

- comptes clôturés ;
- fichiers supprimés ;
- AuditLogs ;
- données contractuelles et financières ;
- sauvegardes ;
- anonymisation/pseudonymisation ;
- purge définitive ;
- exceptions légales ;
- dépendances entre User et données appartenant au Workspace.

Cette dette doit être traitée avec D-001 et D-003.

**Critère de clôture :** politique documentée, mécanismes techniques correspondants implémentés et tests de purge/anonymisation adaptés.

---

## D-007 — Stockage et exploitation des fichiers en production

**Statut :** À CADRER  
**Périmètre :** application dérivée / infrastructure  
**Blocage production :** oui si la configuration de développement n'est pas adaptée à l'exploitation réelle

À valider selon l'hébergement :

- provider de stockage définitif ;
- sauvegarde/restauration ;
- chiffrement et contrôle d'accès ;
- disponibilité ;
- suppression physique ;
- rétention ;
- supervision antivirus ;
- quotas et coûts ;
- localisation des données si nécessaire.

**Critère de clôture :** provider et procédures d'exploitation validés et documentés pour l'environnement de production.

---

## D-008 — Notifications et communications transactionnelles

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée  
**Blocage production :** seulement si les parcours du produit exigent ces communications

À cadrer lorsque nécessaire : notifications in-app, emails transactionnels, destinataires, préférences, priorités, historique et anti-abus.

**Critère de clôture :** besoins produit identifiés ; si applicable, canaux, sécurité, délivrabilité et tests définis.

---

## D-009 — API Keys et Webhooks

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée exposant des intégrations externes  
**Blocage production :** seulement si ces intégrations sont proposées

Exigences minimales : secrets jamais stockés en clair, scopes, expiration/révocation, audit, rate limiting, signature des webhooks, retry, protection SSRF, validation stricte des URLs et idempotence lorsque nécessaire.

**Critère de clôture :** domaine dédié implémenté avec protections et tests de sécurité adaptés.

---

## D-010 — Authentification avancée

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée  
**Blocage production :** non par défaut

MFA, passkeys, SSO entreprise ou fournisseurs supplémentaires ne doivent être ajoutés que lorsqu'un besoin produit, risque ou contrat réel le justifie.

**Critère de clôture :** dette classée `NON APPLICABLE` pour le produit ou mécanisme requis implémenté et testé.

---

## D-011 — Préférences d'affichage utilisateur

**Statut :** CONDITIONNEL  
**Périmètre :** Core clonable / application dérivée  
**Blocage production :** non

Cette évolution concerne uniquement la présentation de données auxquelles l'utilisateur a déjà accès.

Invariant :

```text
préférence d'affichage
≠ permission
≠ entitlement
≠ suppression de donnée
```

À réévaluer lorsque la densité des dashboards ou modules métier le justifie : scope User ou User/Workspace, persistance, multi-appareils, valeurs par défaut, restauration et composants non masquables.

**Critère de clôture :** besoin réel confirmé puis contrat de préférences centralisé et testé, ou classement `NON APPLICABLE`.

---

## D-012 — Tests E2E de chaque application dérivée

**Statut :** À CADRER APRÈS AJOUT DU MÉTIER  
**Périmètre :** chaque application dérivée  
**Blocage production :** oui

Les tests Core ne remplacent pas les tests du produit dérivé.

Avant production, couvrir au minimum : authentification, sélection/accès Workspace, RBAC, entitlement/quotas, parcours métier critique, Platform applicable, session/logout et principaux états interdits.

**Critère de clôture :** parcours E2E critiques verts sur une configuration représentative de production.

---

## D-013 — Configuration et déploiement de production

**Statut :** À CADRER PAR PRODUIT  
**Périmètre :** chaque application dérivée  
**Blocage production :** oui

À valider selon l'infrastructure réelle : variables d'environnement, secrets, HTTPS, proxy/trust proxy, CORS, cookies Secure/SameSite/domaine, MongoDB et sauvegardes, SMTP, stockage, antivirus, stratégie de déploiement, health checks, logs, monitoring et rollback.

**Critère de clôture :** checklist de production spécifique au produit validée et testée.

---

## 4. Éléments volontairement non intégrés comme dette active

### Ancien placeholder « petite dette finale annoncée »

Un ancien document mentionne une dette non définie. Aucun contenu actionnable n'est disponible ; elle n'est donc pas transformée en dette canonique sans définition explicite.

### Historique Plan / Subscription

Les anciens cadrages Plan/Subscription ont été largement remplacés par l'architecture actuelle Plan / Subscription / entitlement / capability / override. Les éventuels besoins encore non résolus doivent être enregistrés ici uniquement s'ils sont confirmés par l'état courant du code. Le besoin Billing/Payment restant est couvert par D-004.

## 5. Gate de duplication / production

Le Core peut être dupliqué avec certaines dettes conditionnelles encore ouvertes.

Une application dérivée ne doit pas être considérée prête pour la production tant que :

```text
fonctionnalités Core nécessaires validées
+
modules métier validés
+
dettes bloquantes applicables traitées ou explicitement acceptées
+
configuration production validée
+
tests sécurité / intégration / E2E pertinents verts
```
