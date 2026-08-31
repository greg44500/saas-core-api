# SAAS-CORE-API — Checklist d’implémentation Frontend Core V1

**Statut :** initialisation F0  
**Dernière consolidation :** 31 août 2026

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
- [x] TERMINÉ — dark mode obligatoire dès l’architecture.
- [x] TERMINÉ — design system basé sur variables/tokens sémantiques.
- [x] TERMINÉ — thème de couleurs de marque à intégrer via les tokens, sans couleurs de marque dispersées en dur.
- [x] TERMINÉ — priorité explicite à la maintenabilité, la sécurité et la réutilisabilité.
- [x] TERMINÉ — règle de documentation concise du code : commenter le pourquoi, les contraintes et invariants, jamais le code évident.
- [x] TERMINÉ — JSDoc réservé aux APIs de composants/hooks/utilitaires non triviales, sans documentation mécanique.
- [x] TERMINÉ — registre de cadrage `frontend-cadrage-ux-ui.md` créé.
- [x] TERMINÉ — principes d’architecture/sécurité documentés.
- [x] TERMINÉ — politique normative de gestion d’état documentée dans `frontend-state-management-policy.md`.
- [x] TERMINÉ — politique routing/navigation/layouts documentée.
- [x] TERMINÉ — politique dashboard/activité/panneaux contextuels documentée.
- [x] TERMINÉ — utilisateur de référence : professionnel métier non nécessairement technique.
- [x] TERMINÉ — densité UX professionnelle intermédiaire par défaut ; Platform potentiellement plus dense.
- [x] TERMINÉ — responsive complet desktop/tablette/mobile comme exigence fonctionnelle.
- [x] TERMINÉ — principe d’une sidebar gauche rétractable pour les interfaces authentifiées.
- [x] TERMINÉ — principe d’un bandeau supérieur avec contexte utilisateur, accès profil et déconnexion rapide.
- [x] TERMINÉ — principe d’usage des modales lorsque l’interaction courte, sensible ou contextuelle le justifie.
- [x] TERMINÉ — principe d’usage d’un panneau latéral contextuel réutilisable pour consultation/édition rapide d’une entité.
- [x] TERMINÉ — Inter retenue comme police principale du Core.
- [x] TERMINÉ — échelle de spacing, radius, ombres discrètes et densité intermédiaire figées.
- [ ] À CADRER — valeurs finales des tokens clair/sombre et validation de contraste.
- [ ] À CADRER — choix de la librairie/stratégie de formulaires.
- [ ] À CADRER — stratégie de notifications/toasts détaillée.
- [ ] À CADRER — stratégie d’erreur globale.
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

- [x] TERMINÉ — server state attribué à RTK Query.
- [x] TERMINÉ — global client state attribué à Redux Toolkit uniquement lorsqu’il est réellement transverse et non couvert par une meilleure source de vérité.
- [x] TERMINÉ — local UI state attribué à `useState`/`useReducer`.
- [x] TERMINÉ — navigation state partageable/rechargeable attribué à l’URL/router.
- [x] TERMINÉ — données dérivables non dupliquées dans le store.
- [x] TERMINÉ — TanStack Query non retenu parallèlement à RTK Query.
- [x] TERMINÉ — React Router retenu.
- [x] TERMINÉ — routes structurées par contextes Public/Auth, Account, Workspace et Platform.
- [x] TERMINÉ — `workspaceId` dans l’URL comme source de vérité du contexte navigué.
- [x] TERMINÉ — layouts Public / Auth / Workspace / Platform distincts.
- [x] TERMINÉ — guards Authentication / Workspace / Permission / Platform distincts.
- [x] TERMINÉ — lazy loading des routes Auth / Workspace / Platform retenu.
- [ ] À CADRER — conventions d’import et aliases.
- [ ] À CADRER — frontières `components/ui`, `shared`, `forms`, `data-display`, `features` dans le code concret.
- [ ] À CADRER — conventions de nommage.
- [ ] À CADRER — stratégie de gestion des erreurs React.
- [ ] À FAIRE — configurer Redux Toolkit.
- [ ] À FAIRE — configurer RTK Query.
- [ ] À FAIRE — créer la base API centralisée.
- [ ] À FAIRE — centraliser l’URL API via environnement client autorisé.
- [ ] À FAIRE — définir les tags RTK Query par domaine au fur et à mesure.
- [ ] À FAIRE — garantir qu’aucun endpoint n’est dispersé en dur dans les composants.

## 4. Design system

- [x] TERMINÉ — palette de marque fournie : `#137C8B`, `#709CA7`, `#B8CBD0`, `#7A90A4`, `#344D59`.
- [x] TERMINÉ — répartition de référence : primary / secondary / muted / accent / brand-dark.
- [x] TERMINÉ — états fonctionnels séparés de la palette de marque : success, warning, info, destructive, invalid, disabled ; critical seulement si besoin métier réel.
- [x] TERMINÉ — police principale `Inter`.
- [x] TERMINÉ — hiérarchie typographique limitée et cohérente.
- [x] TERMINÉ — spacing de référence : 4/8/12/16/20/24/32/40/48/64 px.
- [x] TERMINÉ — radius de référence : 6/8/12/16 px selon niveau.
- [x] TERMINÉ — ombres discrètes ; structure visuelle basée prioritairement sur surfaces/bordures/spacing/contraste.
- [x] TERMINÉ — densité intermédiaire par défaut avec variante partagée `compact` si nécessaire.
- [x] TERMINÉ — réutilisation UI exigée : une intention visuelle doit utiliser une famille de composants partagée.
- [x] TERMINÉ — tableaux métier construits à partir d’une base `DataTable`/primitives communes.
- [x] TERMINÉ — pagination intégrée comme comportement standard des DataTables métier.
- [x] TERMINÉ — pagination serveur privilégiée pour datasets non trivialement bornés.
- [x] TERMINÉ — actions de ligne uniquement si opération backend disponible, permission suffisante et action pertinente.
- [x] TERMINÉ — aucune colonne d’actions artificielle pour une table purement informative.
- [x] TERMINÉ — panneaux de détail construits à partir d’une primitive/famille partagée.
- [x] TERMINÉ — variantes de boutons standardisées : primary/default, secondary, outline, ghost, destructive, link.
- [x] TERMINÉ — cards utilisées avec parcimonie, sans imbrication décorative systématique.
- [x] TERMINÉ — famille de loaders/skeletons partagée.
- [x] TERMINÉ — conventions de taille et d’accessibilité Lucide figées.
- [x] TERMINÉ — responsive défini par comportement des composants et non simple réduction visuelle.
- [ ] À CADRER — palette sombre finale dérivée et contrastes.
- [ ] À CADRER — couleurs fonctionnelles finales et contrastes.
- [ ] À FAIRE — configurer les tokens CSS.
- [ ] À FAIRE — implémenter le switch de thème selon la stratégie retenue.
- [ ] À FAIRE — vérifier contrastes clair/sombre.
- [ ] À FAIRE — intégrer les primitives shadcn nécessaires progressivement, jamais en masse sans besoin.
- [ ] À FAIRE — implémenter la base `DataTable` partagée avec pagination, états et actions conditionnelles.
- [ ] À FAIRE — utiliser Lucide avec conventions cohérentes de taille et accessibilité.

## 5. Zone publique et authentification

- [ ] À CADRER — structure UX des pages publiques/auth.
- [x] TERMINÉ — redirection post-login déterministe : retour vers URL protégée initialement demandée si toujours autorisée ; sinon résolution du contexte workspace.
- [ ] À CADRER — comportement après register.
- [ ] À CADRER — messages d’erreur Auth.
- [ ] À CADRER — stratégie de refresh et bootstrap de session.
- [x] TERMINÉ — menu utilisateur : accès profil/sécurité depuis avatar/pastille, logout rapidement accessible.
- [x] TERMINÉ — logout-all réservé à la zone sécurité/session plutôt qu’au menu principal.
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

- [x] TERMINÉ — sidebar gauche rétractable sur les interfaces authentifiées.
- [x] TERMINÉ — sidebar ouverte : icônes + libellés ; rétractée : icônes + identification accessible.
- [x] TERMINÉ — bandeau supérieur avec contexte utilisateur et actions globales.
- [x] TERMINÉ — arborescence Workspace cible : Dashboard, Members, Invitations, Roles, Files, Subscription, Audit, Settings.
- [x] TERMINÉ — workspace switcher en haut de sidebar.
- [x] TERMINÉ — changement de workspace par navigation vers une URL contenant le nouvel identifiant.
- [x] TERMINÉ — comportement 0/1/N workspaces à traiter explicitement.
- [x] TERMINÉ — navigation adaptée aux permissions, sans remplacer l’autorisation backend.
- [ ] À CADRER — persistance éventuelle d’une préférence « dernier workspace utilisé » si réellement nécessaire.
- [ ] À FAIRE — workspace switcher.
- [ ] À FAIRE — chargement du contexte workspace.
- [ ] À FAIRE — guards de routes workspace.
- [ ] À FAIRE — gestion 403 et contexte inaccessible.

## 7. Dashboard Workspace

- [x] TERMINÉ — objectif : synthèse opérationnelle, pas collection décorative de KPI.
- [x] TERMINÉ — structure commune avec blocs/actions conditionnels selon permissions.
- [x] TERMINÉ — accueil contextuel fondé uniquement sur des données fiables disponibles.
- [x] TERMINÉ — structure cible : accueil, éléments à traiter/surveiller, indicateurs Core utiles, actions rapides, activité récente, widgets métier futurs.
- [x] TERMINÉ — indicateurs Core potentiels : membres, stockage, uploads, plan, trial/subscription, invitations si API disponible.
- [x] TERMINÉ — capacités/quotas via composant/famille réutilisable de type `UsageIndicator`.
- [x] TERMINÉ — activité récente basée sur AuditLog backend avec messages humains et temps relatif.
- [x] TERMINÉ — date absolue disponible lorsque précision audit nécessaire.
- [x] TERMINÉ — dashboard extensible par composition pour les futurs widgets métier.
- [x] TERMINÉ — empty states guidés et actionnables selon permissions.
- [x] TERMINÉ — responsive ordonné selon priorité informationnelle.
- [ ] À CADRER — données exactes réellement disponibles pour la première implémentation du dashboard Core.
- [ ] À FAIRE — layout du dashboard.
- [ ] À FAIRE — `DashboardSkeleton` partagé.
- [ ] À FAIRE — `UsageIndicator`/équivalent partagé.
- [ ] À FAIRE — bloc activité récente si endpoint/permissions compatibles.
- [ ] À FAIRE — états empty/loading/error contextualisés.

## 8. Membres / Invitations / Roles

- [x] TERMINÉ — panneau latéral contextuel recommandé pour consultation/édition rapide d’un membre.
- [x] TERMINÉ — rôle exclusif édité via Select ; Combobox si catalogue de rôles devient long/recherchable.
- [x] TERMINÉ — Switch réservé aux valeurs booléennes.
- [x] TERMINÉ — changement de rôle significatif : sauvegarde explicite, pas d’enregistrement implicite à la fermeture.
- [x] TERMINÉ — actions destructrices ou à fort impact : confirmation supplémentaire via modal lorsque pertinent.
- [x] TERMINÉ — mutations réussies confirmables par toast ; erreurs de champs inline.
- [x] TERMINÉ — les actions de ligne Membres sont conditionnées par endpoints, permissions et état de la ressource.
- [ ] À CADRER — visualisation détaillée des permissions d’un rôle.
- [ ] À FAIRE — liste membres paginée via base DataTable partagée.
- [ ] À FAIRE — `MemberDetailsPanel` composé depuis la primitive de panneau partagée.
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
- [ ] À FAIRE — listing paginé lorsque l’API le permet, via la base DataTable partagée si représentation tabulaire retenue.
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

- [x] TERMINÉ — principe : activité récente du dashboard dérivée de l’AuditLog backend, jamais reconstruite artificiellement depuis le client.
- [x] TERMINÉ — codes d’audit techniques traduits en libellés humains.
- [x] TERMINÉ — activité synthétique sur dashboard distincte de l’historique complet.
- [ ] À CADRER — affichage complet timeline ou table.
- [ ] À CADRER — filtres utiles.
- [ ] À FAIRE — listing paginé.
- [ ] À FAIRE — filtres selon contrat.
- [ ] À FAIRE — gestion de l’accès owner/admin selon backend actuel.

## 12. Platform SUPER_ADMIN

- [x] TERMINÉ — console Platform distincte.
- [x] TERMINÉ — périmètre minimal : Overview, Users, Workspaces, Plans, Subscriptions, Audit Logs.
- [x] TERMINÉ — aucun KPI ou état métier inventé côté frontend sans exposition backend correspondante.
- [x] TERMINÉ — Platform Overview défini comme centre de pilotage global.
- [x] TERMINÉ — tant qu’aucun endpoint agrégé n’existe, Overview reste un hub utile sans faux KPI.
- [x] TERMINÉ — le frontend ne charge pas de grandes listes seulement pour calculer des compteurs Platform.
- [x] TERMINÉ — listes Platform basées sur DataTable partagée avec pagination et actions conditionnelles.
- [ ] DETTE — envisager un endpoint backend agrégé de type `GET /api/platform/overview` avant métriques globales réelles.
- [ ] À CADRER — dashboard Platform : métriques exactes lorsque l’API agrégée sera définie.
- [ ] À CADRER — priorisation des opérations de pilotage.
- [ ] À FAIRE — Platform Users.
- [ ] À FAIRE — Platform Workspaces.
- [ ] À FAIRE — Platform Plans.
- [ ] À FAIRE — Platform Subscriptions.
- [ ] À FAIRE — Platform AuditLogs.
- [ ] À FAIRE — guards SUPER_ADMIN.
- [ ] À FAIRE — états d’erreur et confirmations des opérations sensibles.
- [ ] DIFFÉRÉ — analytics avancées non exposées par le backend jusqu’à définition d’endpoints dédiés.

## 13. UX transversale

- [x] TERMINÉ — modales utilisées uniquement lorsque pertinentes pour interaction courte, indépendante ou sensible.
- [x] TERMINÉ — panneau latéral contextuel préféré pour consultation/édition rapide sans perdre le contexte de liste.
- [x] TERMINÉ — tâche longue/complexe : page dédiée ou parcours guidé plutôt que modale/panneau forcé.
- [x] TERMINÉ — formulaires guidés avec labels explicites, placeholders utiles seulement, erreurs proches du champ.
- [x] TERMINÉ — PageLoader pour lazy route ; skeleton pour chargement structurant ; feedback local pour mutation/refetch local.
- [x] TERMINÉ — empty states guidés.
- [x] TERMINÉ — autosave réservé aux changements de faible risque et sans ambiguïté.
- [x] TERMINÉ — modifications significatives avec dirty state et actions Annuler/Enregistrer.
- [x] TERMINÉ — perte importante de travail non sauvegardé protégée de façon proportionnée.
- [x] TERMINÉ — pagination DataTable standardisée ; pagination serveur par défaut pour jeux de données non bornés.
- [ ] À CADRER — implémentation exacte du système de toasts.
- [ ] À CADRER — erreurs inline vs globales détaillées.
- [ ] À CADRER — confirmations destructrices détaillées par niveau de risque.
- [ ] À CADRER — recherche et debounce.
- [ ] À CADRER — filtres et synchronisation avec URL.
- [ ] À CADRER — breadcrumbs.

## 14. Responsive et accessibilité

- [x] TERMINÉ — responsive complet desktop/tablette/mobile comme exigence générale.
- [x] TERMINÉ — desktop contexte principal des écrans professionnels complexes sans rendre les fonctions essentielles inutilisables sur tablette/mobile.
- [x] TERMINÉ — panneau latéral desktop adapté en panneau large/quasi plein écran ou plein écran sur mobile si nécessaire.
- [x] TERMINÉ — responsive des DataTables défini par priorisation/condensation/scroll ou représentation alternative, pas simple écrasement du tableau.
- [ ] À CADRER — breakpoints fonctionnels et comportement précis de navigation.
- [ ] À CADRER — stratégie sidebar/drawer sur tablette/mobile.
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
- [x] TERMINÉ — refresh token jamais exposé au state JavaScript ; cookie HttpOnly selon contrat backend.
- [x] TERMINÉ — access token non persisté dans le navigateur ; stratégie mémoire à finaliser pendant Auth/session.
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
- [ ] À FAIRE — tests composants partagés DataTable / DetailsPanel / UsageIndicator selon leur lot.
- [ ] À FAIRE — tester DataTable : pagination, loading/empty/error, visibilité des actions selon permissions et absence de colonne d’actions sans opération disponible.
- [ ] À FAIRE — tests thème clair/sombre si logique client.
- [ ] À FAIRE — parcours E2E critiques.

## 17. Performance et maintenance

- [x] TERMINÉ — route-level code splitting retenu.
- [x] TERMINÉ — large datasets : pagination/recherche/tri/filtres serveur par défaut.
- [x] TERMINÉ — infinite loading seulement lorsque l’UX le justifie.
- [x] TERMINÉ — virtualisation seulement lorsque le volume rendu le nécessite.
- [ ] À CADRER — invalidation/cache RTK Query détaillée par domaine.
- [ ] À CADRER — conventions d’optimisation React sans memoization prématurée.
- [ ] À FAIRE — éviter les appels API dupliqués.
- [ ] À FAIRE — éviter la duplication de composants et logique.
- [ ] À FAIRE — revoir la responsabilité d’un fichier lorsqu’il devient long ou mélange plusieurs préoccupations, plutôt qu’imposer un nombre arbitraire de lignes.
- [ ] À FAIRE — maintenir des commentaires concis expliquant uniquement les décisions, contraintes, invariants et effets de bord non évidents.
- [ ] À FAIRE — ne pas commenter mécaniquement `useState`, `useEffect`, handlers, JSX ou appels de hooks lorsque le code est auto-explicatif.
- [ ] À FAIRE — utiliser JSDoc lorsque l’API d’un composant, hook ou utilitaire réutilisable mérite un contrat explicite.
- [ ] À FAIRE — vérifier les effets de bord lors des changements de contrats API.
- [ ] À FAIRE — maintenir les dépendances frontend maîtrisées ; pas d’ajout de librairie sans besoin clair.

## 18. Documentation et futurs modules métier

- [x] TERMINÉ — OpenAPI non requis pendant la phase actuelle ; contrats Markdown backend/frontend utilisés.
- [x] TERMINÉ — politique de state management consolidée et normative.
- [x] TERMINÉ — politique routing/navigation consolidée et normative.
- [x] TERMINÉ — politique dashboard/activité/panneaux contextuels consolidée et normative.
- [x] TERMINÉ — politique design system détaillée et normative.
- [x] TERMINÉ — dashboard prévu comme surface extensible par composition pour futurs modules métier.
- [ ] À CADRER — contrat UI/UX frontend consolidé après les blocs de cadrage structurants.
- [ ] À FAIRE — documenter les conventions réutilisables supplémentaires au fil des futurs modules métier.
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