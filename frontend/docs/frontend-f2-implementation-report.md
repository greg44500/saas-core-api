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
- `ThemeToggle` partagé avec icônes Lucide et nom accessible ;
- aucune persistance `localStorage`/`sessionStorage` introduite ;
- écran F2 minimal démontrant les primitives et tokens sans anticiper les pages métier ;
- tests RTL couvrant le rendu du design system et le basculement du thème.

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
- providers applicatifs généraux ;
- Redux Toolkit ;
- RTK Query ;
- infrastructure Auth/session ;
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
4. l’absence de flash ou d’élément illisible évident ;
5. le comportement responsive simple de l’écran F2.

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
- les tests backend restent verts ;
- le lockfile F2 est versionné ;
- le working tree est clean.
