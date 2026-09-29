# SAAS-CORE-API — Reprise courante

**Dernière mise à jour :** 2026-09-29  
**Baseline stable :** v1.2.1  
**Commit de départ :** d90d8f1e6034cbbf4f63de2be7312eae69b1d698  
**Lot courant :** offset sticky générique sous la topbar Workspace  
**Branche :** `fix/workspace-sticky-offset`  
**Release cible :** aucune — commit post-tag compatible

## Besoin générique

Les SaaS dérivés peuvent posséder des cockpits ou barres métier `sticky` qui
doivent rester visibles immédiatement sous la `WorkspaceTopbar`.

La hauteur de cette topbar était jusque-là une donnée interne exprimée par
`min-h-16`. Un dérivé ne doit pas recopier cette valeur, car cela créerait
un couplage fragile avec l'implémentation Core.

## Contrat retenu

Le Core expose désormais :

~~~css
--workspace-topbar-height: 4rem;
~~~

La `WorkspaceTopbar` consomme elle-même ce token.

Un contenu dérivé peut donc utiliser :

~~~css
top: var(--workspace-topbar-height);
~~~

Aucune règle métier ni API backend n'est modifiée.

## Compatibilité et provenance

Ce changement est compatible avec Core v1.2.1 et ne nécessite :

- aucune migration ;
- aucune variable d'environnement ;
- aucun changement DB ;
- aucun bump de version uniquement pour ce lot.

Après merge validé, un SaaS dérivé peut intégrer le SHA exact descendant de
`v1.2.1` en conservant :

~~~text
version = 1.2.1
tag     = v1.2.1
commit  = SHA post-tag exact intégré
~~~

conformément à `docs/releases/RELEASE-POLICY.md`.

## Validation attendue

La PR doit passer la Core Gate canonique :

~~~bash
npm run release:check
~~~

Le test `workspace-topbar.test.jsx` vérifie que la topbar consomme bien le
token de hauteur.

Principe directeur :

~~~text
Core = fondations génériques
Produit = métier
~~~
