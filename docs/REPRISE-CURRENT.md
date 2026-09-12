# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état réel du Core au 2026-09-12 après clôture technique de D-021. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
>
> **Dernière mise à jour : 2026-09-12**

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

## 2. État Git de référence

Branche de clôture fonctionnelle D-021 :

```text
feature/d-021-auth-hardening-registration-security
```

HEAD fonctionnel validé avant la mise à jour documentaire :

```text
a755fca39bf78adb313419df1117d2849323c03d
test(frontend): stabilize Base UI pagination select
```

À ce point, la branche était :

```text
267 commits devant main
0 commit derrière main
merge-base = main
```

La mise à jour documentaire de clôture est volontairement portée par une sous-branche dédiée avant fusion. Le SHA final de `main` doit donc être relu après fusion ; le SHA ci-dessus désigne le dernier état fonctionnel effectivement testé.

---

## 3. Gates réellement validées

La clôture D-021 repose sur les gates locales effectivement exécutées et confirmées :

```text
backend npm test          → VERT
frontend npm run lint     → VERT
frontend npm test         → VERT
frontend npm run build    → VERT
```

Les correctifs de gate intermédiaires ont été diagnostiqués puis intégrés avant ces validations globales. Aucun résultat vert n’est déduit d’une CI inexistante ou d’une exécution non confirmée.

---

## 4. D-021 — Gate sécurité Auth, invitations et tokens temporaires

**État : techniquement validée le 2026-09-12 ; `docs/DEBT.md` porte le statut canonique.**

Périmètre audité et durci :

```text
Auth
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
liens sensibles temporaires
```

### 4.1 Password recovery

Contrat validé :

```text
reset token
→ 32 octets cryptographiquement aléatoires
→ token brut jamais persisté
→ SHA-256 persisté
→ expiration serveur 15 minutes
→ usage unique atomique
→ replay/concurrence refusés
```

Une nouvelle demande révoque les tokens de reset actifs précédents. En cas d’échec SMTP lors de `forgot-password`, le token non remis est révoqué en compensation sans casser l’anti-enumeration.

Le reset réussi :

- met à jour le credential local dans une transaction ;
- consomme le token atomiquement ;
- révoque toutes les sessions utilisateur existantes ;
- audite `PASSWORD_RESET_COMPLETED` ;
- envoie ensuite une notification de changement de mot de passe ;
- ne rollbacke pas le changement si cette notification SMTP échoue.

`forgot-password` conserve une réponse publique générique pour compte inconnu, provider non local, compte en fermeture et panne SMTP. Une compensation temporelle réduit les différences observables entre branches.

### 4.2 Invitations

Les trois familles utilisent une expiration par défaut de 7 jours :

```text
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
```

Invariants validés :

- secret généré côté serveur à partir de 32 octets aléatoires ;
- SHA-256 uniquement en persistance ;
- expiration vérifiée côté serveur ;
- acceptation atomique et single-use ;
- protection replay/concurrence ;
- révocation explicite ;
- resend avec rotation du secret et nouvelle expiration ;
- audit des opérations critiques ;
- ancien lien invalidé après rotation.

Les liens Workspace, Platform et Commercial transportent le secret dans le fragment `#token=...`, jamais en query string.

Le frontend capture ce fragment dans un vault runtime en mémoire puis nettoie immédiatement l’URL. Le secret n’est pas stocké dans Redux, `localStorage`, `sessionStorage` ou `history.state`.

### 4.3 Anti-automation / rate limiting

Protections ciblées validées :

```text
register
→ limite IP dédiée avant validation

login
→ limite IP sur échecs
→ limite identité email pseudonymisée sur échecs

forgot-password
→ limite IP
→ limite email pseudonymisée
→ protections avant validation

reset-password
→ limite IP dédiée avant validation

WorkspaceInvitation accept / accept-new
→ limite IP dédiée avant auth/validation

PlatformInvitation accept
→ limite dédiée existante

CommercialInvitation preview / accept
→ limite dédiée existante
```

Le CAPTCHA/challenge anti-bot n’est pas imposé systématiquement : l’audit n’a pas démontré de besoin justifiant cette friction dans le Core. Il reste une défense adaptative possible pour un produit dérivé ou un contexte d’abus réel.

Google SSO reste volontairement hors D-021 dans D-010 et ne bloque pas la stabilisation actuelle du Core.

### 4.4 Point mineur non bloquant

`WorkspaceInvitation.tokenHash` impose une longueur de 64 caractères dans Mongoose mais ne duplique pas la regex hexadécimale déjà garantie par la génération serveur et la validation d’entrée. Ce point d’uniformité interne n’a pas été retenu comme blocker D-021.

---

## 5. D-020 — Invitation commerciale

D-020 est intégrée dans `main` et ses gates automatisées applicables sont vertes.

Le parcours nominal a été validé manuellement jusqu’à :

```text
lien d’invitation
→ preview
→ inscription / connexion
→ acceptation
→ création du premier workspace
→ rôle Owner
→ Plan privé effectif
```

D-020 reste cependant `EN COURS` dans `docs/DEBT.md` tant que les contrôles manuels négatifs restants n’ont pas été explicitement clôturés.

Contrôles à confirmer avant de passer D-020 à `VALIDÉ` :

```text
mauvaise identité
→ aucune création/acceptation indue

refus bénéficiaire
→ invitation declined
→ acceptation ultérieure impossible
→ secret runtime nettoyé
→ session courante fermée comme prévu
```

D-020 reste donc le blocker immédiat à traiter ou reclasser avant d’ouvrir D-015.

---

## 6. Blocs déjà validés à conserver

```text
D-001 fermeture Account / Workspace                         VALIDÉ
D-011 Design System + préférences                           VALIDÉ
D-014 points d’extension métier                             VALIDÉ
D-018 Équipe Platform / RBAC / invitations                  VALIDÉ
D-019 moteur sécurisé de rétention / purge Core             VALIDÉ
DOC-CODE-1 documentation source                             VALIDÉ
D-021 sécurité Auth / invitations / tokens temporaires      VALIDÉ
```

Le Design System reste basé sur Tailwind CSS v4, shadcn/ui et les primitives Base UI du dépôt. Les composants génériques doivent être réutilisés avant toute création locale ; les tests doivent protéger l’invariant utilisateur/métier plutôt qu’un détail interne de primitive.

Pour les `Select` Base UI sous JSDOM, une géométrie d’ancre `0 × 0` peut masquer le popup. Le test de pagination validé simule localement une géométrie réelle du trigger sans modifier le harness global.

---

## 7. Points techniques hors D-021 à ne pas perdre

Le sous-système Platform Entitlement Overrides a reçu des évolutions récentes mais certains risques de lifecycle restent explicitement **hors clôture D-021**.

Direction produit à conserver :

```text
Décision commerciale
├── feature
├── limites associées
├── période
├── origine
└── lifecycle
```

Les enfants LIMIT d’un groupe restent des données techniques de résolution/audit et ne doivent pas être présentés comme plusieurs décisions commerciales indépendantes dans la vue principale.

Points encore à vérifier avant de considérer ce sous-système comme totalement finalisé :

```text
révocation atomique d’un groupe
protection contre update/revoke direct d’un enfant groupé
couverture dédiée du service de groupe
cohérence lifecycle complète
validation resolver / precedence
```

Ces points ne doivent pas être déclarés résolus sur la seule base de la clôture D-021. S’ils doivent devenir un travail planifié, leur statut doit être cadré dans `docs/DEBT.md` avant implémentation.

---

## 8. Roadmap immédiate avant Core 1.0

État à la clôture D-021 :

```text
D-020 invitation commerciale / offre privée découverte      EN COURS — clôture manuelle finale restante
D-021 gate sécurité Auth / invitations / tokens             VALIDÉ — 2026-09-12
D-015 release/version/provenance/migrations                 PLANIFIÉ
D-016 Playwright E2E Core                                   PLANIFIÉ
D-002 corbeille / restauration Files                        PLANIFIÉ — avant première dérivation
D-017 dérivation + upgrade pilote                           PLANIFIÉ
```

Ordre recommandé avant toute nouvelle implémentation importante :

```text
1. fusionner la clôture D-021 dans main ;
2. vérifier main après fusion ;
3. clôturer ou reclassifier explicitement D-020 ;
4. décider ensuite l’ouverture de D-015 ;
5. ne pas lancer une nouvelle dette sans relire DEBT.md et cette reprise.
```

---

## 9. Reprise dans une nouvelle conversation

Une nouvelle conversation est recommandée après la fusion D-021 dans `main`.

Première étape obligatoire de la nouvelle conversation :

```text
1. se connecter au dépôt greg44500/saas-core-api ;
2. travailler depuis main ;
3. lire docs/REPRISE-CURRENT.md ;
4. lire docs/DEBT.md ;
5. vérifier le HEAD réel de main ;
6. inspecter D-020 avant toute ouverture de D-015 ;
7. ne modifier aucun fichier avant ce contrôle.
```

Le présent document est une synthèse de reprise et non une source supérieure au code, aux tests ou aux contrats canoniques.
