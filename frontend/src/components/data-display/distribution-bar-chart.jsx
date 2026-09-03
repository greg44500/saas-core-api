import { cn } from '@/lib/utils';

function clampPercentage(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Affiche une distribution déjà calculée par le backend sans reconstruire la
 * sémantique métier côté React. La barre ne sert qu'à la représentation : le
 * libellé, la valeur et le pourcentage restent présents en texte pour garantir
 * une lecture complète sans dépendre du rendu visuel.
 */
function DistributionBarChart({
  items = [],
  emptyMessage = 'Aucune donnée disponible.',
  formatValue = (item) => String(item.value ?? '—'),
  className,
  'aria-label': ariaLabel = 'Répartition',
}) {
  if (items.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div aria-label={ariaLabel} className={cn('space-y-4', className)} role="group">
      {items.map((item) => {
        const percentage = clampPercentage(item.percentage);

        return (
          <div className="space-y-2" key={item.key}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="min-w-0 truncate font-medium">{item.label}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatValue(item)} · {new Intl.NumberFormat('fr-FR').format(percentage)} %
              </span>
            </div>
            <div
              aria-hidden="true"
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { DistributionBarChart, clampPercentage };
