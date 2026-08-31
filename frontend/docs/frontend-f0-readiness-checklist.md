# SAAS-CORE-API — Checklist de clôture F0 Frontend

**Statut :** F0 clôturé — prêt pour implémentation  
**Date :** 31 août 2026

## Décisions finales figées

- [x] Architecture frontend organisée par responsabilités et features.
- [x] Alias unique `@/` vers `src/`.
- [x] Pas de multiplication d'aliases sans besoin réel.
- [x] Composants React en PascalCase.
- [x] Hooks/utilitaires en camelCase ; hooks préfixés par `use`.
- [x] Routes/URLs en kebab-case lorsqu'elles comportent plusieurs mots.
- [x] `components/ui` réservé aux primitives shadcn/design system génériques.
- [x] `components/shared` réservé aux assemblages réellement transverses.
- [x] `components/forms` pour les composants de formulaire réutilisables.
- [x] `components/data-display` pour tableaux, états, badges et indicateurs transverses.
- [x] `features/<feature>` pour le code métier d'un domaine.
- [x] `services/api` pour l'infrastructure RTK Query transverse.
- [x] `store` pour Redux Toolkit et l'état client global justifié.
- [x] `app` pour providers, routing, layouts et bootstrap.
- [x] Tests frontend : Vitest + React Testing Library + user-event.
- [x] Tests E2E : Playwright dans `frontend/e2e`.
- [x] Tests unitaires/composants colocés avec le code lorsque pertinent.
- [x] Tests orientés comportements utilisateur, pas détails d'implémentation.
- [x] Sélecteurs accessibles privilégiés ; `data-testid` en dernier recours.
- [x] Aucun seuil global arbitraire de couverture au démarrage.
- [x] Couverture renforcée sur Auth/session, permissions, onboarding, subscription, mutations sensibles et composants partagés complexes.
- [x] Mocking limité aux frontières nécessaires ; pas de second backend fictif complexe.
- [x] Lint/formatage automatisés et cohérents avec le projet.
- [x] Pas de nouvelle abstraction ou dépendance sans problème concret identifié.
- [x] Les détails non bloquants restants sont décidés dans le lot qui les rencontre.

## Ordre d'implémentation validé

```text
F1 — Initialiser React + Vite
F2 — Tailwind + shadcn/ui + tokens de base
F3 — Router + providers + layouts minimaux
F4 — Redux Toolkit + RTK Query + infrastructure Auth/session
F5 — Login/Register + bootstrap de session
F6 — Onboarding Workspace avec Free actif
F7 — Workspace shell + navigation + premières pages Core
```

## Tests à mettre en place dès le socle

- [ ] configuration Vitest/jsdom ;
- [ ] setup React Testing Library ;
- [ ] setup user-event ;
- [ ] configuration Playwright ;
- [ ] premier test de rendu applicatif ;
- [ ] premier test de routing ;
- [ ] premier test E2E de smoke lorsque l'application est exécutable.

## Critère de sortie F0

Le cadrage transversal est suffisamment précis pour commencer le code sans nouvelle phase générale de conception.

À partir de F1, toute décision nouvelle doit être rattachée au lot fonctionnel qui la nécessite et ne doit pas retarder artificiellement les autres lots.
