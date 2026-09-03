import { cn } from '@/lib/utils';

const STATUS_BADGE_TONE_CLASS = Object.freeze({
  neutral: 'bg-muted text-muted-foreground',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/15 text-destructive',
  success: 'bg-success/15 text-success',
  info: 'bg-info/15 text-info',
});

/**
 * Badge sémantique partagé pour les statuts et niveaux de vigilance.
 *
 * Le composant centralise la forme et les tons ; les features choisissent le
 * sens du libellé mais ne réécrivent pas les couleurs d'état dans chaque
 * tableau ou carte.
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
