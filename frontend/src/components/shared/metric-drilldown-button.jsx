import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Rend une valeur de dashboard actionnable uniquement lorsqu'un drill-down a
 * un contenu utile. Le contrôle reste compact et réutilisable dans les cartes
 * de synthèse sans transformer un tooltip en liste interactive.
 */
function MetricDrilldownButton({
  ariaLabel,
  className,
  disabled = false,
  onClick,
  value,
}) {
  if (disabled) {
    return <span className={cn('font-semibold', className)}>{value}</span>;
  }

  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        'group inline-flex items-center gap-1 rounded-sm font-semibold text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      onClick={onClick}
      type="button"
    >
      <span>{value}</span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </button>
  );
}

export { MetricDrilldownButton };
