# SAAS-CORE-API — Reprise courante

> **Statut : document temporaire de développement**
>
> Cette synthèse décrit l’état réel du Core au 2026-09-12 après clôture technique de D-022. Le code, les contraintes DB, les tests réellement exécutés et les contrats canoniques priment toujours sur ce document.
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

Branche de clôture D-022 :

```text
feature/d-022-entitlement-override-groups
```

Dernier HEAD fonctionnel testé avant la documentation finale :

```text
d82c8fe1795e7c169adb54f11377b77353fa11e7
test(entitlements): prove deterministic override precedence
```

Les commits documentaires de clôture viennent ensuite sur la même branche. Le SHA final de `main` doit être relu après fusion.

---

## 3. Gates réellement validées

La clôture D-022 repose sur des exécutions locales explicitement confirmées :

```text
tests ciblés backend Entitlement          → VERT
tests ciblés frontend Entitlement         → VERT
backend tests globaux                     → VERT
frontend tests globaux                    → VERT
lint applicable                           → VERT
frontend build                            → VERT
```

Aucun résultat n’est déduit d’une exécution non réalisée.

---

## 4. D-021 — Gate sécurité Auth, invitations et tokens temporaires

**État : VALIDÉE le 2026-09-12.**

Invariants à conserver :

```text
WorkspaceInvitation
PlatformInvitation
CommercialInvitation
→ expiration par défaut : 7 jours
→ secret serveur 32 octets
→ SHA-256 uniquement en persistance
→ rotation au resend
→ single-use atomique
→ replay/concurrence refusés
```

Les liens sensibles utilisent `#token=...`; le frontend capture le secret en mémoire puis nettoie l’URL. Aucun secret temporaire ne doit être persisté dans Redux, `localStorage`, `sessionStorage` ou `history.state`.

Password reset : token aléatoire 32 octets, hash SHA-256, expiration 15 minutes, usage unique atomique, révocation des sessions après succès et protections d’anti-enumeration/rate limiting validées.

Google SSO reste volontairement dans D-010 et ne bloque pas Core 1.0.

---

## 5. D-022 — Intégrité des Entitlement Override Groups

**État : VALIDÉE le 2026-09-12 ; `docs/DEBT.md` porte le statut canonique.**

Le problème traité était un risque de désynchronisation entre une décision commerciale groupée et les mutations unitaires historiques.

Contrat désormais protégé :

```text
Décision commerciale groupée
├── FEATURE principale
├── LIMIT(s) associée(s)
├── période
├── origine
└── lifecycle
```

Invariants validés :

- création groupée transactionnelle ;
- modification groupée ;
- révocation groupée atomique ;
- même métadonnée de révocation pour tous les membres ;
- audit de chaque override ;
- update/revoke unitaire interdit au niveau service pour tout document possédant `groupId` ;
- `relatedLimits` conserve une sémantique de patch partiel : une limite omise reste inchangée ;
- mutation RTK Query dédiée pour la révocation de groupe ;
- page Platform routant automatiquement un groupe vers la mutation groupée ;
- précédence du resolver explicitement déterministe : `startsAt`, puis `createdAt`, puis `_id`, tous décroissants.

Les enfants LIMIT d’un groupe restent des données techniques de résolution/audit et ne doivent pas être présentés comme plusieurs décisions commerciales indépendantes dans la vue principale.

---

## 6. D-020 — Invitation commerciale

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

## 7. Blocs déjà validés à conserver

```text
D-001 fermeture Account / Workspace                         VALIDÉ
D-011 Design System + préférences                           VALIDÉ
D-014 points d’extension métier                             VALIDÉ
D-018 Équipe Platform / RBAC / invitations                  VALIDÉ
D-019 moteur sécurisé de rétention / purge Core             VALIDÉ
DOC-CODE-1 documentation source                             VALIDÉ
D-021 sécurité Auth / invitations / tokens temporaires      VALIDÉ
D-022 intégrité Entitlement Override Groups                 VALIDÉ
```

Le Design System reste basé sur Tailwind CSS v4, shadcn/ui et les primitives Base UI du dépôt. Les composants génériques doivent être réutilisés avant toute création locale ; les tests doivent protéger l’invariant utilisateur/métier plutôt qu’un détail interne de primitive.

Les sidebars Workspace/Platform restent un sujet de convergence frontend distinct : leur éventuel alignement avec le composant Sidebar shadcn/ui ne doit pas être mélangé rétroactivement à D-022.

---

## 8. Roadmap immédiate avant Core 1.0

État après clôture D-022 :

```text
D-020 invitation commerciale / offre privée découverte      EN COURS — clôture manuelle finale restante
D-021 gate sécurité Auth / invitations / tokens             VALIDÉ — 2026-09-12
D-022 intégrité Entitlement Override Groups                 VALIDÉ — 2026-09-12
D-015 release/version/provenance/migrations                 PLANIFIÉ
D-016 Playwright E2E Core                                   PLANIFIÉ
D-002 corbeille / restauration Files                        PLANIFIÉ — avant première dérivation
D-017 dérivation + upgrade pilote                           PLANIFIÉ
```

Ordre recommandé :

```text
1. fusionner D-022 dans main ;
2. vérifier le HEAD réel de main après fusion ;
3. traiter les questions fonctionnelles identifiées avant d’ouvrir une nouvelle dette ;
4. clôturer ou reclassifier explicitement D-020 ;
5. seulement ensuite décider l’ouverture de D-015 ;
6. ne pas lancer une nouvelle dette sans relire DEBT.md et cette reprise.
```

---

## 9. Reprise dans une nouvelle conversation

Après fusion D-022, toute reprise doit commencer par :

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
