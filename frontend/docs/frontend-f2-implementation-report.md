# SAAS-CORE-API — F2 Design system de base

**Date :** 31 août 2026  
**Lot :** F2  
**Statut :** TERMINÉ — validé localement

## Objectif

Installer et configurer le socle visuel du frontend Core V1 sans introduire le routing, Redux, RTK Query ou l’authentification.

## Implémenté

- Tailwind CSS v4 via le plugin Vite officiel ;
- configuration shadcn/ui JavaScript avec `components.json` et `tsx: false` ;
- Lucide comme bibliothèque d’icônes ;
- Inter Variable auto-hébergée via Fontsource ;
- helper `cn` partagé basé sur `clsx` et `tailwind-merge` ;
- première primitive shadcn `Button` dans `components/ui` ;
- variantes `default`, `secondary`, `outline`, `ghost`, `destructive`, `link` ;
- tailles `default`, `sm`, `lg`, `icon` ;
- tokens sémantiques light/dark centralisés dans `src/index.css` ;
- tokens fonctionnels `success`, `warning`, `info`, `destructive`, `invalid`, `disabled` séparés de la marque ;
- radius normalisés 6/8/12/16 px ;
- dark mode fondé sur la classe `.dark` ;
- `ThemeProvider` partagé responsable de l’état du thème et de sa persistance locale ;
- préférence persistée dans `localStorage` sous une clé scopée `saas-core:theme:<scope>` ;
- scope `anonymous` utilisé avant disponibilité de l’identité authentifiée ;
- architecture prête à fournir ultérieurement un scope utilisateur distinct lorsque l’authentification exposera l’identité courante ;
- `ThemeToggle` partagé avec icônes Lucide et nom accessible ;
- écran F2 minimal démontrant les primitives et tokens sans anticiper les pages métier ;
- tests RTL couvrant le rendu du design system, le basculement du thème, sa restauration après remontage et l’isolation entre scopes utilisateur.

## Politique de persistance du thème

Le thème est une préférence UX explicitement choisie par l’utilisateur et doit survivre aux rechargements et nouvelles ouvertures de l’application sur le même navigateur.

La persistance locale est donc autorisée pour cette préférence précise.

La clé de stockage est volontairement scopée :

```text
saas-core:theme:anonymous
saas-core:theme:<user-scope futur>
```

Cela évite une préférence globale unique partagée par plusieurs comptes utilisant le même navigateur.

Le Core ne dispose pas encore d’un champ ou endpoint backend de préférence d’apparence. La persistance multi-appareils n’est donc pas couverte par F2. Si elle est retenue, elle nécessitera une préférence utilisateur côté backend et une synchronisation frontend lors des lots Auth/Profile.

## Palette de marque appliquée

Les références de marque restent centralisées dans les tokens :

```text
primary    → #137C8B
secondary  → #709CA7
muted      → dérivé de #B8CBD0
accent     → dérivé de #7A90A4
foreground → #344D59 en light
```

Le thème sombre utilise des variantes dérivées afin de préserver la lisibilité plutôt qu’une inversion mécanique des couleurs.

## Contraste vérifié

Les paires principales ont été vérifiées avant intégration :

```text
light primary / primary-foreground  → 4.90:1
light background / foreground       → 8.51:1
dark background / foreground        → 13.95:1
dark primary / primary-foreground    → 6.59:1
```

Ces paires dépassent le seuil WCAG AA de 4.5:1 pour le texte normal.

## Validation locale obtenue

Validations remontées le 31 août 2026 :

- `npm install` : réussi ;
- tests frontend : verts ;
- build Vite : vert ;
- serveur de développement : fonctionnel ;
- thème clair/sombre : validé visuellement ;
- restauration du thème après rechargement : validée ;
- isolation des préférences entre scopes : couverte par test ;
- tests backend : verts ;
- `frontend/package-lock.json` : synchronisé avec les dépendances F2 ;
- working tree local : clean.

## Volontairement exclu de F2

- React Router et layouts applicatifs ;
- providers applicatifs généraux hors thème ;
- Redux Toolkit ;
- RTK Query ;
- infrastructure Auth/session ;
- synchronisation serveur de la préférence d’apparence ;
- formulaires métier ;
- DataTable et familles UI non encore requises par un écran réel.

Ces responsabilités restent affectées à F3 et aux lots suivants.

## Critères de clôture

Tous les critères de clôture de F2 sont satisfaits. Le lot est terminé et ne porte pas de dette bloquante pour F3.
