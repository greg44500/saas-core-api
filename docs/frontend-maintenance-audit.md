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

## Cohérence linguistique et densité UX

L'interface utilisateur du Core est francophone. Cette règle concerne toute chaîne réellement visible par l'utilisateur :

- labels ;
- placeholders ;
- aides de formulaire ;
- boutons ;
- messages d'état ;
- statuts affichés ;
- textes issus d'un contrôle navigateur lorsqu'ils peuvent être remplacés par une UI maîtrisée.

Les clés techniques du contrat (`active`, `pending`, `subscription:read`, `monthly`, etc.) restent inchangées côté API et dans le code. Lorsqu'elles doivent être présentées, une couche de formatage frontend fournit leur libellé français sans modifier la valeur métier.

Un contrôle natif dont le texte dépend du navigateur ou du système d'exploitation, comme `<input type="file">`, ne doit pas imposer une interface partiellement anglaise. Si son libellé visible n'est pas maîtrisable, le contrôle natif reste accessible mais son habillage visible est remplacé par une UI française.

### Politique des dates et calendriers

Les champs de date ne doivent pas dépendre du rendu local du navigateur via un `<input type="date">` lorsque l'interface doit garantir une présentation française.

La primitive partagée de référence est :

```text
frontend/src/components/forms/date-picker.jsx
```

Règles obligatoires :

- affichage utilisateur au format `jj/mm/aaaa` ;
- placeholder visible `jj/mm/aaaa` ;
- noms des mois, jours de semaine, boutons et libellés du calendrier en français ;
- valeur échangée avec les features et les API sous forme ISO `YYYY-MM-DD` ;
- validation d'une vraie date calendrier avant émission de la valeur ;
- aucune feature ou page ne recrée son propre calendrier si le composant partagé couvre le besoin ;
- toute extension future (date min/max, date-heure, intervalle, sélection multiple) doit d'abord être étudiée comme évolution du composant partagé ou comme nouvelle primitive commune clairement distincte.

La séparation affichage français / valeur ISO évite que la localisation de l'interface contamine les contrats techniques ou les comparaisons de dates.

Les tableaux ne doivent pas répéter des états techniques sans valeur décisionnelle. Par exemple, une règle serveur qui rend une ligne non modifiable ne justifie pas nécessairement l'affichage de « Protégé » à chaque ligne : l'absence d'action, accompagnée d'une explication globale lorsqu'elle est utile, est préférable.

Cette simplification visuelle ne remplace jamais la sécurité backend : masquer une action est uniquement une décision UX.

## Périmètre de l'audit F8-AUDIT

Auditer au minimum :

- `frontend/src/app/` ;
- `frontend/src/components/` ;
- `frontend/src/features/auth/` ;
- `frontend/src/features/account/` ;
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
- [ ] Toutes les chaînes réellement visibles sont en français, sauf terme produit volontairement conservé.
- [ ] Les contrôles natifs dont le texte visible n'est pas maîtrisable disposent d'un habillage localisé lorsque nécessaire.
- [ ] Les champs de date visibles utilisent une primitive partagée garantissant `jj/mm/aaaa` et un calendrier français lorsque le besoin correspond au composant commun.
- [ ] Aucune page ne contient une implémentation locale du calendrier sans justification architecturale explicite.
- [ ] Les clés/statuts techniques visibles passent par un formateur de présentation adapté.
- [ ] Les tableaux n'affichent pas de badges ou mentions techniques répétitives sans utilité pour l'utilisateur.
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
