import { cn } from '@/lib/utils';

const STATUS_BADGE_TONE_CLASS = Object.freeze({
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  neutral: 'border-border bg-muted text-muted-foreground',
});

/**
 * Badge de statut générique basé sur les tons sémantiques du Design System.
 *
 * Le composant ne déduit jamais un ton à partir d'un libellé métier : chaque
 * domaine reste responsable de mapper ses propres états vers une sémantique UI.
 */
function StatusBadge({ children, className, tone = 'neutral' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        STATUS_BADGE_TONE_CLASS[tone] ?? STATUS_BADGE_TONE_CLASS.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export { StatusBadge, STATUS_BADGE_TONE_CLASS };
