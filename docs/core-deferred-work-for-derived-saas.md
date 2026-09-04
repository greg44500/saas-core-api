# SAAS-CORE-API — Chantiers différés à conserver dans chaque application dérivée

**Statut :** dette transversale clonable
**Dernière mise à jour :** 2026-09-04
**Périmètre :** toute application créée à partir de `saas-core-api`

## 1. Objet

Ce document fait partie du socle à conserver lors de toute duplication de `saas-core-api`.

Il ne décrit pas des fonctionnalités métier. Il recense les chantiers transversaux volontairement différés qui peuvent rester ouverts au moment où un module métier est ajouté, mais qui doivent être réévalués et finalisés avant une mise en production réelle lorsqu'ils sont applicables au produit dérivé.

Règle de sortie :

```text
Core dupliqué
→ configuration du produit dérivé
→ ajout des modules métier
→ traitement des dettes transversales applicables
→ validation production
```

Une application dérivée ne doit pas être déclarée `production-ready` uniquement parce que son module métier fonctionne.

## 2. Principe de suivi

Pour chaque chantier ci-dessous, l'application dérivée doit conserver explicitement un statut :

```text
NON APPLICABLE
À CADRER
PLANIFIÉ
EN COURS
VALIDÉ
```

`NON APPLICABLE` doit être justifié dans la documentation du produit dérivé.

---

## 3. Billing / Payment — dette transverse majeure

### Statut Core

```text
À CADRER dans chaque produit dérivé qui commercialise des plans payants
```

Le Core sait gérer les éléments commerciaux génériques :

- catalogue de Plans ;
- Subscription baseline/commercial ;
- trial ;
- entitlement effectif ;
- quotas ;
- dérogations administratives ;
- snapshot de certaines données commerciales de Subscription.

Ces mécanismes ne constituent pas une comptabilité de paiement.

### À finaliser avant commercialisation payante automatisée

- choisir et intégrer un provider de paiement si nécessaire, par exemple Stripe ;
- créer une frontière `Billing/Payment` distincte de `Subscription` ;
- gérer l'identité facturée et les coordonnées de facturation ;
- gérer les moyens de paiement selon le provider ;
- traiter les confirmations, refus, retards et résiliations venant du provider ;
- assurer l'idempotence des événements externes ;
- gérer les remises, coupons et proratas réellement facturés ;
- gérer taxes, TVA et règles territoriales applicables ;
- produire ou intégrer factures, avoirs et remboursements si le produit le nécessite ;
- conserver les instantanés historiques nécessaires ;
- auditer les opérations administratives sensibles.

### Invariant

```text
Subscription / entitlement
≠
encaissement / facture / autorité financière
```

Le futur domaine Billing/Payment doit devenir l'autorité des montants réellement facturés et encaissés.

---

## 4. Observabilité technique

### Statut Core

```text
DIFFÉRÉ — à finaliser avant exploitation production selon le niveau de service attendu
```

`AuditLog` reste un journal fonctionnel et de sécurité. Il ne doit pas devenir un système de monitoring technique.

### À mettre en place

- collecte structurée des erreurs HTTP 5xx ;
- suivi de latence API ;
- santé et erreurs MongoDB ;
- santé et erreurs SMTP ;
- suivi des jobs asynchrones lorsqu'ils existent ;
- supervision du service antivirus / pipeline File ;
- remontée des erreurs frontend significatives ;
- corrélation par `requestId` ;
- métriques techniques et alertes ;
- tracing distribué lorsque l'architecture du produit le justifie ;
- politique de rétention des logs techniques ;
- absence de secrets et données sensibles non nécessaires dans les logs.

### Invariant

```text
AuditLog.status = failed
→ échec fonctionnel audité

Monitoring / observabilité
→ état technique du système
```

---

## 5. RGPD, cookies, confidentialité et mentions légales

### Statut Core

```text
DIFFÉRÉ — obligatoire à réévaluer avant mise en production selon les traitements réels du produit dérivé
```

Documents de cadrage déjà présents dans le Core :

```text
docs/functional-debt-rgpd-cookies-privacy-legal.md
docs/rgpd-cookies-privacy-technical-cadrage.md
docs/rgpd-data-tracker-inventory.md
```

### À finaliser dans chaque produit dérivé

- inventorier les traitements de données réellement ajoutés par les modules métier ;
- maintenir l'inventaire des trackers et providers externes ;
- définir la politique de cookies en fonction des technologies réellement utilisées ;
- définir le mécanisme de consentement lorsque requis ;
- finaliser la politique de confidentialité ;
- finaliser les mentions légales ;
- définir les durées de conservation applicables ;
- définir les procédures d'exercice des droits ;
- définir anonymisation, suppression ou conservation réglementaire lorsque nécessaire ;
- vérifier les sous-traitants et transferts de données liés aux providers ajoutés ;
- réaliser la validation juridique appropriée avant production.

### Règle de maintenance

Ne jamais introduire silencieusement un nouveau tracker, outil d'analyse ou provider collectant des données sans mettre à jour l'inventaire correspondant.

---

## 6. Politique de rétention, anonymisation et suppression réglementaire

### Statut Core

```text
À CADRER avec les obligations du produit dérivé
```

Le Core distingue déjà le cycle de vie fonctionnel des comptes, l'archivage et le soft delete. Cela ne remplace pas une politique réglementaire de conservation.

### À définir

- durée de rétention des comptes clôturés ;
- durée de rétention des fichiers supprimés ;
- conservation des AuditLogs ;
- conservation des données contractuelles et financières ;
- anonymisation des identifiants personnels lorsque requise ;
- purge définitive et exceptions légales ;
- dépendances entre purge d'un User et conservation des données appartenant au Workspace.

---

## 7. Stockage et exploitation des fichiers en production

### Statut Core

```text
À RÉÉVALUER selon l'hébergement du produit dérivé
```

Le Core possède un pipeline File sécurisé et une abstraction de stockage. Une application dérivée doit confirmer avant production que le provider retenu respecte ses besoins d'exploitation.

### Points à valider

- provider de stockage définitif ;
- sauvegardes ;
- restauration ;
- chiffrement et contrôle d'accès ;
- disponibilité ;
- politique de suppression physique ;
- rétention ;
- supervision antivirus ;
- quotas et coûts ;
- localisation des données si elle devient une contrainte réglementaire ou contractuelle.

---

## 8. Notifications et communications transactionnelles

### Statut Core

```text
OPTIONNEL / À AJOUTER lorsque les parcours du produit le nécessitent
```

Le centre de notifications in-app n'est pas un invariant obligatoire du Core générique.

Lorsqu'un module métier introduit des événements nécessitant une information utilisateur, cadrer :

- notifications in-app ;
- emails transactionnels ;
- destinataires ;
- préférences éventuelles ;
- priorités ;
- historique ;
- anti-spam / anti-abus ;
- audit des événements sensibles.

Ne pas confondre notification produit et observabilité technique.

---

## 9. API Keys et Webhooks

### Statut Core

```text
OPTIONNEL — uniquement si le produit dérivé expose des intégrations externes
```

Si le produit propose un accès machine-to-machine ou des automatisations externes, ajouter les modules dédiés avec au minimum :

- secrets jamais stockés en clair ;
- scopes ;
- expiration / révocation ;
- audit ;
- rate limiting ;
- signature des webhooks ;
- retry et politique d'échec ;
- protection SSRF et validation stricte des URLs de webhook ;
- idempotence lorsque nécessaire.

---

## 10. Observations sur l'authentification avancée

### Statut Core

```text
NON BLOQUANT pour la duplication
```

Les évolutions telles que MFA, passkeys, SSO entreprise ou fournisseurs supplémentaires ne doivent être ajoutées que lorsqu'un besoin produit ou contractuel réel les justifie.

Elles ne doivent pas être introduites dans le Core uniquement pour anticiper un besoin hypothétique.

---

## 11. Validation E2E et exploitation de chaque produit dérivé

Même si le Core est testé, chaque application dérivée modifie le système par ses capacités, permissions et routes métier.

Avant production, ajouter ou rejouer des parcours E2E couvrant au minimum :

- authentification ;
- sélection / accès Workspace ;
- RBAC ;
- entitlement et quotas ;
- parcours métier critique ;
- administration Platform applicable ;
- logout / restauration de session ;
- erreurs et états interdits importants.

Les tests Core ne remplacent pas les tests du produit dérivé.

---

## 12. Déploiement et configuration production

### Statut Core

```text
À FINALISER dans chaque produit dérivé
```

À valider selon l'infrastructure réelle :

- variables d'environnement ;
- secrets ;
- HTTPS ;
- proxy / `trust proxy` ;
- CORS ;
- cookies `Secure` / `SameSite` / domaine ;
- base MongoDB et sauvegardes ;
- provider SMTP ;
- provider de stockage ;
- antivirus ;
- stratégie de déploiement frontend/backend ;
- health checks ;
- logs ;
- monitoring ;
- procédures de rollback.

Aucune valeur de développement ne doit être considérée comme une configuration production par défaut.

---

## 13. Petite dette finale annoncée

### Statut

```text
À PRÉCISER
```

Une petite dette de finition a été annoncée pendant la finalisation du Core, mais son contenu n'a pas encore été communiqué.

Consigne :

- ne pas l'inventer ;
- ne pas la déclarer résolue ;
- compléter cette section uniquement lorsque sa définition explicite sera disponible.

---

## 14. Ce qui n'est pas une dette du Core

Les éléments suivants appartiennent normalement aux applications dérivées et ne doivent pas être ajoutés au Core générique sans justification transverse :

```text
courses
learners
products
suppliers
recipes
contacts
campaigns
projects métier
évaluations
certificats
règles propres à un secteur
```

Règle :

```text
nécessaire à tout SaaS
→ Core

valeur métier spécifique
→ module métier dérivé
```

---

## 15. Checklist obligatoire lors d'une duplication

Lors de la création d'un nouveau SaaS à partir du Core :

- [ ] conserver ce document dans `docs/` ;
- [ ] identifier les chantiers applicables au produit ;
- [ ] documenter les éléments `NON APPLICABLE` ;
- [ ] définir le provider de paiement si commercialisation payante ;
- [ ] compléter les obligations RGPD / cookies / confidentialité ;
- [ ] compléter l'inventaire des trackers et providers ;
- [ ] définir stockage et rétention ;
- [ ] mettre en place l'observabilité nécessaire ;
- [ ] valider la configuration de production ;
- [ ] ajouter les tests E2E métier ;
- [ ] vérifier qu'aucune dette applicable n'est oubliée avant le go-live.

---

## 16. Critère de clôture

Le Core peut être dupliqué avant la résolution de ces chantiers, car plusieurs dépendent du produit, du modèle commercial ou de l'infrastructure choisis.

En revanche, une application dérivée ne doit être déclarée prête pour la production que lorsque :

```text
fonctionnalités Core nécessaires validées
+
modules métier validés
+
dettes transversales applicables traitées ou explicitement acceptées
+
configuration production validée
+
tests de sécurité / intégration / E2E pertinents verts
```

Ce document doit rester vivant pendant toute la vie du produit dérivé.
