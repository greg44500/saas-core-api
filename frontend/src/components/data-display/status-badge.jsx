import { cn } from '@/lib/utils';

const STATUS_BADGE_TONE_CLASS = Object.freeze({
  neutral: 'bg-muted text-muted-foreground',
  archive: 'bg-muted text-muted-foreground',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/15 text-destructive',
  success: 'bg-success/15 text-success',
  info: 'bg-info/15 text-info',
});

/**
 * Badge sémantique partagé pour les statuts et niveaux de vigilance.
 *
 * `archive` distingue explicitement un état historique d'un état simplement
 * neutre, même lorsque les deux utilisent volontairement une teinte discrète.
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
