import { cn } from '@/lib/utils';

const STATUS_BADGE_TONE_CLASS = Object.freeze({
  neutral: 'bg-muted text-muted-foreground',
  warning: 'bg-warning/20 text-foreground',
  destructive: 'bg-destructive/20 text-foreground',
  success: 'bg-success/20 text-foreground',
  info: 'bg-info/20 text-foreground',
});

/**
 * Badge sémantique partagé pour les statuts et niveaux de vigilance.
 *
 * Le composant centralise la forme et les tons ; les features choisissent le
 * sens du libellé mais ne réécrivent pas les couleurs d'état dans chaque
 * tableau ou carte. Les fonds colorés restent subtils, tandis que le texte
 * utilise le foreground du thème afin de conserver une lisibilité AA dans les
 * variantes light/dark actuelles.
 */
function StatusBadge({
  children,
  tone = 'neutral',
  className,
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        STATUS_BADGE_TONE_CLASS[tone] ?? STATUS_BADGE_TONE_CLASS.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export { STATUS_BADGE_TONE_CLASS, StatusBadge };
