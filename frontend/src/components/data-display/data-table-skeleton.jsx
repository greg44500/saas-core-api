import { DATA_TABLE_STYLES } from '@/components/data-display/data-table-styles';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Composition de chargement alignée sur la géométrie du DataTable partagé.
 *
 * Le nombre de lignes/colonnes reste un détail de présentation : aucune donnée
 * métier factice n'est injectée dans le tableau pendant le chargement.
 */
function DataTableSkeleton({ columns = 4, rows = 5, density = 'default' }) {
  const headerCellClassName = density === 'compact'
    ? DATA_TABLE_STYLES.compactHeaderCell
    : DATA_TABLE_STYLES.headerCell;
  const bodyCellClassName = density === 'compact'
    ? DATA_TABLE_STYLES.compactBodyCell
    : DATA_TABLE_STYLES.bodyCell;

  return (
    <div aria-live="polite" role="status">
      <span className="sr-only">Chargement du tableau…</span>
      <div aria-hidden="true" className="overflow-x-hidden">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              {Array.from({ length: columns }, (_, columnIndex) => (
                <th className={headerCellClassName} key={`header-${columnIndex}`}>
                  <Skeleton className="h-4 w-3/4" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: rows }, (_, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {Array.from({ length: columns }, (_, columnIndex) => (
                  <td className={bodyCellClassName} key={`cell-${rowIndex}-${columnIndex}`}>
                    <Skeleton className={columnIndex === 0 ? 'h-4 w-4/5' : 'h-4 w-3/5'} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { DataTableSkeleton };
