import { cn } from '@/lib/utils';

function resolveComparisonMax(items) {
  return items.reduce(
    (max, item) => Math.max(max, item.current ?? 0, item.previous ?? 0),
    0,
  );
}

function toBarWidth(value, max) {
  if (!Number.isFinite(value) || value <= 0 || max <= 0) return 0;
  return (value / max) * 100;
}

/**
 * Compare deux périodes à partir de valeurs déjà fournies par le backend.
 *
 * Le composant calcule uniquement une largeur relative pour le rendu visuel ;
 * il ne recalcule aucun taux de croissance métier. Les valeurs textuelles
 * restent toujours visibles afin que le graphique soit exploitable sans
 * dépendre de la perception des longueurs ou des couleurs.
 */
function ComparisonBarChart({
  items = [],
  currentLabel = 'Période actuelle',
  previousLabel = 'Période précédente',
  emptyMessage = 'Aucune donnée disponible.',
  className,
  'aria-label': ariaLabel = 'Comparaison de périodes',
}) {
  if (items.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {emptyMessage}
      </p>
    );
  }

  const max = resolveComparisonMax(items);
  const formatter = new Intl.NumberFormat('fr-FR');

  return (
    <div aria-label={ariaLabel} className={cn('space-y-5', className)} role="img">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
          {currentLabel}
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-muted-foreground/40" />
          {previousLabel}
        </span>
      </div>

      {items.map((item) => (
        <div className="space-y-2" key={item.key}>
          <p className="text-sm font-medium">{item.label}</p>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${toBarWidth(item.current, max)}%` }}
              />
            </div>
            <span className="min-w-10 text-right text-sm font-medium">
              {formatter.format(item.current ?? 0)}
            </span>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-muted-foreground/40 transition-[width] duration-300"
                style={{ width: `${toBarWidth(item.previous, max)}%` }}
              />
            </div>
            <span className="min-w-10 text-right text-sm text-muted-foreground">
              {formatter.format(item.previous ?? 0)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export {
  ComparisonBarChart,
  resolveComparisonMax,
  toBarWidth,
};
