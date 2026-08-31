# SAAS-CORE-API — F2 Design system de base

**Date :** 31 août 2026  
**Lot :** F2  
**Statut :** implémenté sur GitHub — validation locale requise

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

## Validation locale requise

Après `git pull`, depuis `frontend/` :

```bash
npm install
npm run test
npm run build
npm run dev
```

Le `npm install` doit mettre à jour `frontend/package-lock.json` avec les dépendances F2. Le lockfile modifié doit être versionné après validation.

Vérifier visuellement :

1. l’affichage en Inter ;
2. les quatre variantes de boutons présentées ;
3. le passage clair → sombre et retour ;
4. recharger la page après sélection du thème sombre et vérifier que le thème sombre est restauré ;
5. l’absence de flash ou d’élément illisible évident ;
6. le comportement responsive simple de l’écran F2.

Puis depuis la racine :

```bash
npm test
```

Cette commande confirme l’absence de régression backend.

## Critères de clôture

F2 pourra passer à `TERMINÉ` lorsque :

- `npm install` réussit et met à jour le lockfile ;
- les tests frontend sont verts ;
- le build Vite est vert ;
- le serveur de développement démarre ;
- le thème clair/sombre fonctionne visuellement ;
- le thème choisi est restauré après rechargement ;
- l’isolation des préférences entre scopes est couverte par test ;
- les tests backend restent verts ;
- le lockfile F2 est versionné ;
- le working tree est clean.
