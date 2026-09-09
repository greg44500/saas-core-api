import { Skeleton } from '@/components/ui/skeleton';

function normalizeRows(rowsPerSection, sectionIndex) {
  const requestedRows = Array.isArray(rowsPerSection)
    ? rowsPerSection[sectionIndex]
    : rowsPerSection;

  return Number.isInteger(requestedRows) && requestedRows > 0
    ? requestedRows
    : 4;
}

/**
 * Composition de chargement commune aux vues de détail asynchrones.
 *
 * Les drawers conservent leur propre titre/description et cette composition
 * reproduit uniquement la structure du contenu attendu. Elle n'injecte aucune
 * donnée métier fictive et reste réutilisable par les futurs modules.
 */
function EntityDetailsSkeleton({
  label = 'Chargement des détails…',
  rowsPerSection = 4,
  sections = 2,
  showActions = true,
}) {
  const sectionCount = Number.isInteger(sections) && sections > 0 ? sections : 1;

  return (
    <div aria-live="polite" role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-6">
        {Array.from({ length: sectionCount }, (_, sectionIndex) => (
          <section key={`details-section-${sectionIndex}`}>
            <Skeleton className="h-4 w-32" />
            <div className="mt-2">
              {Array.from(
                { length: normalizeRows(rowsPerSection, sectionIndex) },
                (_, rowIndex) => (
                  <div
                    className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4"
                    key={`details-row-${sectionIndex}-${rowIndex}`}
                  >
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ),
              )}
            </div>
          </section>
        ))}

        {showActions && (
          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-32" />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export { EntityDetailsSkeleton };
