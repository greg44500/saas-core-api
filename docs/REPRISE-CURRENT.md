# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse reflète l’état connu de `main`. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment.
>
> **Dernière mise à jour : 2026-09-08**

---

## 1. Hiérarchie d’autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés réellement exécutés et validés ;
3. contrats canoniques ;
4. architecture, sécurité et guidelines canoniques ;
5. `docs/DEBT.md` ;
6. documentation opérationnelle ;
7. présent fichier de reprise.

Le dépôt reste en développement `0.1.0`. Il ne doit pas encore être présenté comme `v1.0.0` ni comme automatiquement prêt pour la production.

---

## 2. État courant et roadmap corrigée

D-020 a été développé puis intégré dans `main` après gate automatisée verte. La validation fonctionnelle manuelle complète reste différée.

Depuis cette intégration, deux décisions produit/sécurité ont été ajoutées **avant D-015** :

```text
D-011 préférences utilisateur / apparence / affichage métier
D-021 gate sécurité Auth / invitations / tokens temporaires
```

Roadmap courante :

```text
D-018 Équipe Platform / RBAC / invitations internes            VALIDÉ
D-019 moteur sécurisé de rétention / purge Core                VALIDÉ
DOC-CODE-1 normalisation documentation source                  VALIDÉ
HOME-CORE accès public login/register                          vérification manuelle à reconfirmer
D-020 invitation commerciale / offre privée découverte         INTÉGRÉ MAIN — MANUEL DIFFÉRÉ
→ D-011 préférences utilisateur / apparence / dashboard        PLANIFIÉ
→ D-021 gate sécurité Auth / invitations / tokens              PLANIFIÉ
→ D-015 versionnement / provenance / migrations / release      PLANIFIÉ
→ D-016 Playwright / E2E Core                                  PLANIFIÉ
→ D-002 corbeille / restauration Files                         OBLIGATOIRE AVANT PREMIÈRE DÉRIVATION
→ audit final architecture / sécurité / qualité
→ D-017 dérivation pilote + upgrade réel du Core
→ release v1.0.0
→ première dérivation métier
```

D-015 ne doit donc **plus** être ouvert immédiatement : D-011 puis D-021 doivent d’abord être cadrées et traitées.

---

## 3. D-020 — état intégré à conserver

Contrat canonique : `docs/contracts/COMMERCIAL-INVITATIONS.md`.

Frontières :

```text
PlatformInvitation
→ collaborateur interne de l’éditeur

CommercialInvitation
→ acquisition initiale / futur client / bêta-testeur

WorkspaceInvitation
→ membre d’un workspace existant
```

D-020 ne rattache jamais une invitation commerciale à un workspace existant. Les offres privées restent séparées du catalogue public. Les règles `fixed`/trial et `open_ended` gratuit durable restent celles du contrat canonique.

Sécurité du secret commercial déjà implémentée :

```text
crypto.randomBytes(32)
→ token brut envoyé uniquement au bénéficiaire
→ SHA-256 persisté
→ URL fragment #token
→ vault JavaScript runtime
```

Le frontend ne persiste pas ce secret dans Redux, localStorage, sessionStorage, history.state ou query string. L’acceptation est authentifiée et atomique.

Permissions Platform :

```text
platform:commercial_invitations:read
platform:commercial_invitations:create
platform:commercial_invitations:resend
platform:commercial_invitations:revoke
```

Patterns frontend : RTK Query, `DataTable` partagé, `EntityDetailsDrawer` partagé, confirmations partagées, React Hook Form + Zod, actions selon permissions.

---

## 4. Gate automatisée D-020

Le 2026-09-08, la gate locale a été confirmée verte :

```text
backend npm run lint      OK
backend npm test          OK
frontend npm run lint     OK
frontend npm test         OK
frontend npm run build    OK
```

Le `format:check` Prettier global reste un chantier outillage séparé : ne pas lancer `prettier --write .` sans configuration canonique décidée.

Validation manuelle D-020 encore à conserver avant release finale : création invitation, email/lien, preview, register/login, changement de compte, acceptation, création du premier workspace, droits du Plan privé, état accepted, trial et offre gratuite durable.

---

## 5. D-011 — prochain bloc fonctionnel avant versionnement

**Statut : PLANIFIÉ — blocker Core 1.0 avant D-015.**

Objectif : fournir au Core un mécanisme générique de préférences utilisateur sans confondre personnalisation et autorisation.

Deux familles obligatoires :

```text
Préférences de confort
→ thème clair / sombre / système
→ police parmi une liste contrôlée
→ palette parmi les palettes fournies par le propriétaire du produit
→ extensions futures d’ergonomie/accessibilité

Préférences d’affichage métier
→ choix des widgets / cartes / KPI à afficher
→ uniquement parmi les éléments déjà accessibles
```

Invariant :

```text
Plan / entitlement effectif + permissions
→ ensemble accessible

ensemble accessible + préférences utilisateur
→ ensemble visible
```

Une préférence ne crée jamais une permission, un entitlement ou une feature. Un KPI/widget inaccessible n’est pas proposé dans les préférences.

Le cadrage D-011 doit déterminer avant code :

- modèle/persistance serveur versus préférences purement locales ;
- validation Zod stricte et valeurs autorisées ;
- contrat extensible pour les modules métier ;
- registre des widgets/KPI ;
- fallbacks si police/palette/widget disparaît ;
- intégration design system sans styles arbitraires dans les composants ;
- composants réutilisables de la page Préférences ;
- tests backend/frontend et non-escalade entitlement/RBAC.

Le Core ne doit pas devenir un constructeur libre de dashboard en V1. Priorité à afficher/masquer et éventuellement ordonner après cadrage.

---

## 6. D-021 — gate sécurité Auth / invitations / tokens avant versionnement

**Statut : PLANIFIÉ — blocker Core 1.0 avant D-015.**

D-021 doit commencer par un **audit de l’existant**. Ne pas recréer des mécanismes déjà corrects.

### 6.1 Invitations

Auditer :

```text
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
```

Politique cible : expiration par défaut de **7 jours**, vérifiée serveur, token à usage unique, révocable, rotation au resend, replay refusé et consommation atomique. Le resend doit créer un nouveau secret plutôt que prolonger l’ancien.

À vérifier : génération cryptographique, hash lorsque pertinent, absence de fuite logs/URL persistante, expiration, révocation, concurrence, audit et tests.

### 6.2 Forgot / reset password

Politique cible :

```text
reset token
→ expiration 15 minutes
→ usage unique
→ nouvelle demande obligatoire après expiration
```

À auditer : token fort/hashé, expiration serveur, consommation atomique, anti-replay, réponse uniforme anti-enumeration, rate limiting, notification après changement et politique d’invalidation des sessions après reset.

### 6.3 Rate limiting et anti-bot

Auditer au minimum : `register`, `login`, `forgot-password`, preview/acceptation d’invitations et endpoints Auth sensibles.

Le CAPTCHA ne doit pas être ajouté systématiquement au login. Il reste une défense complémentaire/adaptative en cas d’abus automatisé, échecs répétés ou besoin produit démontré. L’inscription publique doit être protégée contre création massive de comptes/trials ; `forgot-password` contre le mail bombing.

### 6.4 Google SSO

Décision : **Google SSO reste D-010, non bloquant pour Core 1.0 et D-015.**

Il ne doit pas être ajouté dans D-021. Son futur cadrage devra traiter OIDC/OAuth, liaison avec compte local, collision d’email, révocation et séparation identité externe / autorisations internes.

---

## 7. D-002 — gate avant première dérivation

Aucune première dérivation métier avant validation D-002.

Invariant D-019 : un fichier soft-deleted continue à consommer `storage_bytes` tant que son contenu physique existe ; une restauration avant purge ne réserve pas ce stockage une seconde fois.

---

## 8. Dettes/contrôles différés à conserver

- UI navigation : différencier les icônes répétitives sans modifier permissions/routes/API.
- Prettier global : chantier outillage séparé ; pas de `prettier --write .` global avant convention canonique.
- D-020 : validation fonctionnelle manuelle complète.
- HOME-CORE : login/register public à reconfirmer manuellement.
- D-010 : Google SSO/MFA/passkeys/SSO avancé restent conditionnels et non blockers v1.0.

---

## 9. Prochaine reprise de travail

Le prochain bloc à ouvrir dans une nouvelle conversation est désormais :

```text
D-011 — Préférences utilisateur, apparence et affichage métier
```

### Méthode obligatoire

1. relire `docs/REPRISE-CURRENT.md` ;
2. relire D-011, D-021 et l’ordre de traitement dans `docs/DEBT.md` ;
3. inspecter le code réel avant de proposer une architecture ;
4. identifier les mécanismes déjà présents pour thème, préférences, User, design tokens, dashboard, entitlements et permissions ;
5. **ne rien coder immédiatement** : produire d’abord un état des lieux et un contrat D-011 ;
6. distinguer strictement préférences de confort et préférences métier ;
7. ne jamais transformer une préférence en mécanisme d’autorisation ;
8. préserver les composants réutilisables existants et le design system ;
9. proposer le lot backend/frontend/tests avant implémentation ;
10. après validation D-011, ouvrir D-021 ;
11. seulement après D-021, reprendre D-015 versionnement.

Aucune nouvelle fonctionnalité métier ne doit être mélangée à D-011 ou D-021.
