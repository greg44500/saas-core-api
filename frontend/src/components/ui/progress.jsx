import { Progress as BaseProgress } from '@base-ui/react/progress';

import { cn } from '@/lib/utils';

/**
 * Barre de progression canonique du frontend.
 *
 * Base UI porte la sémantique progressbar et les attributs ARIA ; le Core ne
 * conserve ici que le style et le bornage visuel de la valeur.
 */
function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}) {
  const visualValue = value === null
    ? 0
    : Math.min(Math.max(value, 0), 100);

  return (
    <BaseProgress.Root
      className={cn('w-full', className)}
      value={value}
      {...props}
    >
      <BaseProgress.Track
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        data-slot="progress-track"
      >
        <BaseProgress.Indicator
          className={cn(
            'h-full rounded-full transition-[width,background-color] duration-300 ease-out',
            indicatorClassName,
          )}
          data-slot="progress-indicator"
          style={{ width: `${visualValue}%` }}
        />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}

export { Progress };
