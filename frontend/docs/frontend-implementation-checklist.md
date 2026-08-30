# SAAS-CORE-API — Checklist d’implémentation Frontend Core V1

**Statut :** initialisation F0  
**Dernière consolidation :** 30 août 2026

## 1. Rôle du document

Cette checklist est le garde-fou opérationnel du frontend.

Elle doit permettre de savoir :

- ce qui est décidé ;
- ce qui reste à cadrer ;
- ce qui est implémenté ;
- ce qui est testé ;
- ce qui est volontairement différé ;
- quelles évolutions peuvent provoquer des effets de bord.

Elle sera mise à jour à la fin de chaque lot, comme la checklist backend.

### Statuts

- `[x] TERMINÉ` — décision ou implémentation validée selon le contexte ;
- `[ ] À CADRER` — décision nécessaire avant implémentation ;
- `[ ] À FAIRE` — implémentation planifiée et suffisamment cadrée ;
- `[ ] DETTE` — volontairement différé mais nécessaire avant production ;
- `[ ] DIFFÉRÉ` — non nécessaire au lot/Core actuel ;
- `[ ] HORS V1` — explicitement exclu du périmètre.

---

## 2. F0 — Cadrage et fondations

- [x] TERMINÉ — React + Vite retenus.
- [x] TERMINÉ — JavaScript uniquement ; aucun TypeScript.
- [x] TERMINÉ — Tailwind CSS retenu.
- [x] TERMINÉ — shadcn/ui retenu en JavaScript.
- [x] TERMINÉ — Lucide retenu pour les icônes.
- [x] TERMINÉ — dark mode prévu dès l’architecture.
- [x] TERMINÉ — design system basé sur variables/tokens sémantiques.
- [x] TERMINÉ — palette personnalisée à intégrer via les tokens, sans couleurs de marque dispersées en dur.
- [x] TERMINÉ — priorité explicite à la maintenabilité, la sécurité et la réutilisabilité.
- [x] TERMINÉ — registre de cadrage `frontend-cadrage-ux-ui.md` créé.
- [x] TERMINÉ — principes d’architecture/sécurité documentés.
- [ ] À CADRER — utilisateurs de référence et densité UX.
- [ ] À CADRER — structure globale de navigation.
- [ ] À CADRER — responsive cible.
- [ ] À CADRER — identité visuelle et palette.
- [ ] À CADRER — typographie.
- [ ] À CADRER — conventions de spacing, radius, ombres et densité.
- [ ] À CADRER — choix de la librairie/stratégie de formulaires.
- [ ] À CADRER — stratégie de notifications/toasts.
- [ ] À CADRER — stratégie d’erreur globale.
- [ ] À CADRER — routing et guards.
- [ ] À CADRER — persistance client autorisée.
- [ ] À CADRER — stratégie de tests et seuil de couverture pertinent.
- [ ] À FAIRE — initialiser le projet Vite frontend après validation des décisions structurantes minimales.
- [ ] À FAIRE — installer/configurer Tailwind CSS.
- [ ] À FAIRE — installer/configurer shadcn/ui en JavaScript.
- [ ] À FAIRE — installer Lucide.
- [ ] À FAIRE — créer les tokens clair/sombre.
- [ ] À FAIRE — configurer les aliases nécessaires sans TypeScript.
- [ ] À FAIRE — créer la structure de dossiers réellement utile au premier lot.

## 3. Architecture applicative

- [ ] À CADRER — router retenu et conventions de routes.
- [ ] À CADRER — layouts Public / Authenticated / Workspace / Platform.
- [ ] À CADRER — conventions d’import et aliases.
- [ ] À CADRER — frontières `components/ui`, `shared`, `forms`, `data-display`, `features`.
- [ ] À CADRER — conventions de nommage.
- [ ] À CADRER — stratégie de gestion des erreurs React.
- [ ] À FAIRE — configurer Redux Toolkit.
- [ ] À FAIRE — configurer RTK Query.
- [ ] À FAIRE — créer la base API centralisée.
- [ ] À FAIRE — centraliser l’URL API via environnement client autorisé.
- [ ] À FAIRE — définir les tags RTK Query par domaine au fur et à mesure.
- [ ] À FAIRE — garantir qu’aucun endpoint n’est dispersé en dur dans les composants.

## 4. Design system

- [ ] À CADRER — palette claire.
- [ ] À CADRER — palette sombre.
- [ ] À CADRER — couleurs sémantiques de statut : success, warning, info, destructive si extension nécessaire.
- [ ] À CADRER — typographie.
- [ ] À CADRER — échelle de spacing.
- [ ] À CADRER — radius.
- [ ] À CADRER — ombres.
- [ ] À CADRER — densité des tableaux et formulaires.
- [ ] À FAIRE — configurer les tokens CSS.
- [ ] À FAIRE — implémenter le switch de thème selon la stratégie retenue.
- [ ] À FAIRE — vérifier contrastes clair/sombre.
- [ ] À FAIRE — intégrer les primitives shadcn nécessaires progressivement, jamais en masse sans besoin.
- [ ] À FAIRE — utiliser Lucide avec conventions cohérentes de taille et accessibilité.

## 5. Zone publique et authentification

- [ ] À CADRER — structure UX des pages publiques/auth.
- [ ] À CADRER — comportement après login.
- [ ] À CADRER — comportement après register.
- [ ] À CADRER — messages d’erreur Auth.
- [ ] À CADRER — stratégie de refresh et bootstrap de session.
- [ ] À FAIRE — page login.
- [ ] À FAIRE — page register.
- [ ] À FAIRE — forgot password.
- [ ] À FAIRE — reset password.
- [ ] À FAIRE — profil utilisateur.
- [ ] À FAIRE — change password.
- [ ] À FAIRE — logout.
- [ ] À FAIRE — logout-all.
- [ ] À FAIRE — bootstrap `/api/auth/me`/session selon contrat réel.
- [ ] À FAIRE — gestion centralisée 401/refresh.
- [ ] À FAIRE — prévention des boucles de refresh.
- [ ] À FAIRE — redirections protégées.
- [ ] À FAIRE — tests Auth unitaires/intégration/E2E selon le lot.

## 6. Navigation et contexte Workspace

- [ ] À CADRER — sélection du workspace actif.
- [ ] À CADRER — persistance éventuelle du workspace actif.
- [ ] À CADRER — comportement lorsqu’un utilisateur n’a aucun workspace.
- [ ] À CADRER — comportement multi-workspaces.
- [ ] À CADRER — navigation selon permissions.
- [ ] À FAIRE — workspace switcher.
- [ ] À FAIRE — chargement du contexte workspace.
- [ ] À FAIRE — guards de routes workspace.
- [ ] À FAIRE — gestion 403 et contexte inaccessible.

## 7. Dashboard Workspace

- [ ] À CADRER — objectifs du dashboard.
- [ ] À CADRER — informations réellement disponibles via le backend.
- [ ] À CADRER — différence de contenu selon rôles/permissions.
- [ ] À FAIRE — layout du dashboard.
- [ ] À FAIRE — composants KPI uniquement pour données réellement exposées.
- [ ] À FAIRE — empty/loading/error states.

## 8. Membres / Invitations / Roles

- [ ] À CADRER — UX des listes et actions.
- [ ] À CADRER — confirmation des actions sensibles.
- [ ] À CADRER — visualisation des permissions d’un rôle.
- [ ] À FAIRE — liste membres paginée.
- [ ] À FAIRE — invitation.
- [ ] À FAIRE — resend/revoke invitation.
- [ ] À FAIRE — changement de rôle.
- [ ] À FAIRE — suspension/retrait.
- [ ] À FAIRE — CRUD rôles selon permissions backend.
- [ ] À FAIRE — transfert d’ownership avec confirmation renforcée.
- [ ] À FAIRE — tests de visibilité/action selon permissions.

## 9. Files

- [ ] À CADRER — représentation liste/table/cartes selon responsive.
- [ ] À CADRER — UX upload et progression.
- [ ] À CADRER — erreurs taille/type/quota/feature.
- [ ] À FAIRE — listing.
- [ ] À FAIRE — upload.
- [ ] À FAIRE — download.
- [ ] À FAIRE — soft delete.
- [ ] À FAIRE — états vides, erreurs et quotas.
- [ ] DIFFÉRÉ — trash/restore tant que dette backend correspondante n’est pas implémentée.

## 10. Plans / Subscription / Trial

- [ ] À CADRER — affichage du plan courant et entitlement effectif.
- [ ] À CADRER — UX trial.
- [ ] À CADRER — UX annulation programmée/downgrade.
- [ ] À CADRER — distinction entre fonctions Core actuelles et futur Billing réel.
- [ ] À FAIRE — lecture abonnement workspace.
- [ ] À FAIRE — actions trial prévues par le contrat.
- [ ] À FAIRE — cancellation/downgrade et révocations prévues par le contrat.
- [ ] DETTE — paiement réel, moyens de paiement, TVA, factures et `past_due` définitif selon dette backend.

## 11. AuditLog Workspace

- [ ] À CADRER — affichage timeline ou table.
- [ ] À CADRER — filtres utiles.
- [ ] À FAIRE — listing paginé.
- [ ] À FAIRE — filtres selon contrat.
- [ ] À FAIRE — gestion de l’accès owner/admin selon backend actuel.

## 12. Platform SUPER_ADMIN

- [x] TERMINÉ — principe d’une console Platform distincte retenu comme exigence de cadrage.
- [ ] À CADRER — layout/navigation Platform.
- [ ] À CADRER — dashboard Platform et métriques réellement disponibles.
- [ ] À CADRER — priorisation des opérations de pilotage.
- [ ] À FAIRE — Platform Users.
- [ ] À FAIRE — Platform Workspaces.
- [ ] À FAIRE — Platform Plans.
- [ ] À FAIRE — Platform Subscriptions.
- [ ] À FAIRE — Platform AuditLogs.
- [ ] À FAIRE — guards SUPER_ADMIN.
- [ ] À FAIRE — états d’erreur et confirmations des opérations sensibles.
- [ ] DIFFÉRÉ — analytics non exposées par le backend jusqu’à définition d’endpoints dédiés.

## 13. UX transversale

- [ ] À CADRER — loaders : spinner, skeleton, progressive loading.
- [ ] À CADRER — empty states.
- [ ] À CADRER — toasts.
- [ ] À CADRER — erreurs inline vs globales.
- [ ] À CADRER — confirmations destructrices.
- [ ] À CADRER — dirty forms / navigation avec changements non sauvegardés.
- [ ] À CADRER — pagination.
- [ ] À CADRER — recherche et debounce.
- [ ] À CADRER — filtres et synchronisation éventuelle avec URL.
- [ ] À CADRER — breadcrumbs.

## 14. Responsive et accessibilité

- [ ] À CADRER — breakpoints fonctionnels et comportement de navigation.
- [ ] À CADRER — adaptation tableaux mobile.
- [ ] À CADRER — stratégie sidebar/drawer.
- [ ] À FAIRE — navigation clavier.
- [ ] À FAIRE — focus visible.
- [ ] À FAIRE — labels et descriptions accessibles.
- [ ] À FAIRE — contrastes clair/sombre.
- [ ] À FAIRE — états non dépendants uniquement de la couleur.
- [ ] À FAIRE — tests manuels clavier et lecteurs d’écran sur parcours critiques.

## 15. Sécurité frontend

- [x] TERMINÉ — principe : aucun secret dans le bundle client.
- [x] TERMINÉ — principe : l’UI ne remplace jamais l’autorisation backend.
- [x] TERMINÉ — principe : minimiser la persistance navigateur.
- [ ] À CADRER — données autorisées en localStorage/sessionStorage, si nécessaire.
- [ ] À CADRER — stratégie CSP/headers côté déploiement frontend lorsque l’hébergement sera défini.
- [ ] À FAIRE — gestion sûre des erreurs API.
- [ ] À FAIRE — audit des usages HTML brut.
- [ ] À FAIRE — audit des variables `VITE_*` avant production.
- [ ] À FAIRE — vérifier absence de PII/secrets dans logs client.

## 16. Tests et qualité

- [ ] À CADRER — organisation des tests frontend.
- [ ] À CADRER — stratégie de mocks API.
- [ ] À CADRER — couverture cible utile sans métrique artificielle.
- [ ] À FAIRE — Vitest configuré.
- [ ] À FAIRE — React Testing Library configuré.
- [ ] À FAIRE — Playwright configuré.
- [ ] À FAIRE — helpers de render avec providers centralisés.
- [ ] À FAIRE — tests Auth critiques.
- [ ] À FAIRE — tests permissions/guards.
- [ ] À FAIRE — tests workspace context.
- [ ] À FAIRE — tests thème clair/sombre si logique client.
- [ ] À FAIRE — parcours E2E critiques.

## 17. Performance et maintenance

- [ ] À CADRER — stratégie de code splitting par routes/features.
- [ ] À CADRER — invalidation/cache RTK Query.
- [ ] À CADRER — conventions d’optimisation React sans memoization prématurée.
- [ ] À FAIRE — éviter les appels API dupliqués.
- [ ] À FAIRE — éviter la duplication de composants et logique.
- [ ] À FAIRE — vérifier les effets de bord lors des changements de contrats API.
- [ ] À FAIRE — maintenir les dépendances frontend maîtrisées ; pas d’ajout de librairie sans besoin clair.

## 18. Documentation et futurs modules métier

- [x] TERMINÉ — OpenAPI n’est pas requis pendant la phase actuelle ; contrats Markdown backend/frontend utilisés.
- [ ] À CADRER — contrat UI/UX frontend consolidé après les blocs de cadrage structurants.
- [ ] À FAIRE — documenter les conventions réutilisables pour les futurs modules métier.
- [ ] À FAIRE — maintenir cette checklist à chaque lot.
- [ ] À FAIRE — toute modification backend observable doit entraîner la revue du contrat et du frontend impacté.

## 19. Ordre de travail initial

```text
F0.1  Cadrage UX/UI et design system
F0.2  Architecture frontend, routing et état
F0.3  Auth/session foundation
F0.4  Layouts, navigation et workspace context
F0.5  Console Platform foundation
Puis fonctionnalités métier Core, un domaine à la fois
```

Cet ordre reste provisoire jusqu’à la fin du cadrage des décisions structurantes.

## 20. Règle de fin de lot

Chaque lot suit :

```text
cadrage
→ décision documentée
→ implémentation limitée au périmètre
→ tests ciblés
→ validation manuelle UX/UI/responsive/accessibilité
→ contrôle sécurité et effets de bord
→ mise à jour contrats si nécessaire
→ mise à jour checklist
→ commit
```

Aucun lot ne doit introduire silencieusement une nouvelle convention globale.