# SAAS-CORE-API — Audit obligatoire de maintenabilité frontend

## Statut

**À EXÉCUTER APRÈS FINALISATION DU BLOC F8 ET AVANT F9.**

Ce checkpoint est bloquant pour considérer le frontend Core comme suffisamment documenté et maintenable.

## Pourquoi cet audit existe

Le contrat de développement du projet impose que le code soit maintenable par un développeur qui n'a pas participé à son écriture. Le frontend a correctement progressé sur l'architecture, les permissions, RTK Query et les tests, mais la documentation dans le code n'a pas été appliquée avec la même rigueur que sur le backend.

Cette dette est donc une dette de conformité au contrat du projet, pas une amélioration cosmétique.

## Règle de documentation à appliquer

Les commentaires doivent expliquer **pourquoi** une décision existe, jamais paraphraser ce que fait une ligne évidente.

À documenter lorsqu'une responsabilité ou un invariant n'est pas évident :

- frontière entre `useState`, Redux Toolkit et RTK Query ;
- choix de cache et invalidations RTK Query ;
- règles de permissions et distinction entre masquage UX et autorité backend ;
- choix de sécurité côté fichiers, authentification et reauth ;
- comportements de navigation non triviaux ;
- compatibilité avec les contrats backend ;
- raisons des transformations de payload ou de réponse ;
- contournements techniques nécessaires et leurs limites ;
- composants réutilisables dont les props ou invariants méritent un contrat explicite.

Ne pas ajouter de commentaires du type :

```js
// Met à jour la page
setPage(2);
```

Préférer, lorsque nécessaire :

```js
// Une mutation peut modifier le nombre total de pages ; revenir à la première
// évite de conserver une page devenue vide après invalidation du cache.
setPage(1);
```

## JSDoc

Ajouter du JSDoc lorsque cela améliore réellement le contrat de maintenance, notamment pour :

- helpers réutilisables ;
- composants partagés avec plusieurs props structurantes ;
- fonctions manipulant des objets métier non triviaux ;
- factories ou adaptateurs ;
- fonctions dont les effets secondaires ne sont pas évidents.

Ne pas transformer chaque fonction React simple en bloc JSDoc inutile.

## Périmètre de l'audit F8-AUDIT

Auditer au minimum :

- `frontend/src/app/` ;
- `frontend/src/components/` ;
- `frontend/src/features/auth/` ;
- `frontend/src/features/workspace/` ;
- `frontend/src/features/workspace-members/` ;
- `frontend/src/features/workspace-roles/` ;
- `frontend/src/features/workspace-invitation/` ;
- `frontend/src/features/files/` ;
- `frontend/src/features/plan/` ;
- `frontend/src/features/platform/` ;
- `frontend/src/services/api/` ;
- `frontend/src/store/` ;
- `frontend/src/hooks/` ;
- `frontend/src/lib/` ;
- `frontend/src/utils/`.

Le périmètre devra être étendu à tout nouveau fichier créé pendant la suite du bloc F8.

## Checklist de validation

- [ ] Chaque fichier frontend a été relu au moins une fois dans le cadre de l'audit.
- [ ] Les responsabilités non évidentes sont expliquées.
- [ ] Les invariants sécurité et permissions importants sont documentés.
- [ ] Les choix RTK Query et invalidations non triviaux sont documentés.
- [ ] Les composants réutilisables pertinents ont un contrat JSDoc lorsque nécessaire.
- [ ] Aucun commentaire ne paraphrase inutilement le code.
- [ ] Aucun commentaire obsolète ou contradictoire avec le backend n'est conservé.
- [ ] Les commentaires ne décrivent jamais le backend comme une sécurité secondaire : le serveur reste l'autorité.
- [ ] La documentation `docs/` associée au frontend est cohérente avec le code réel.
- [ ] Les tests frontend ciblés restent verts après l'audit.
- [ ] La suite frontend globale reste verte.
- [ ] Le build Vite reste vert.

## Ordre de production

```text
F8.x      Finalisation fonctionnelle du frontend Core
F8-AUDIT  Audit maintenabilité + documentation/commentaires frontend  OBLIGATOIRE
F9.x      Platform Admin frontend réel
```

F9 ne doit pas être considéré comme le bloc suivant tant que `F8-AUDIT` n'a pas été exécuté et validé.
