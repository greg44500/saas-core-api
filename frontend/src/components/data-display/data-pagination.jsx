import {
  DATA_PAGE_SIZE_OPTIONS,
  DEFAULT_DATA_PAGE_SIZE,
} from '@/components/data-display/data-pagination-config';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Pagination partagée pour les listes serveur paginées.
 *
 * La feature reste responsable de persister la page et la taille choisies puis
 * de les transmettre à RTK Query. Le composant ne gère que l'interaction et la
 * présentation afin que toutes les listes conservent le même contrat UX.
 */
function DataPagination({
  ariaLabel = 'Pagination',
  buttonSize,
  className = 'flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between',
  disabled = false,
  nextLabel = 'Suivant',
  onPageChange,
  onPageSizeChange = null,
  page,
  pageSize = null,
  pageSizeOptions = DATA_PAGE_SIZE_OPTIONS,
  pagination,
  previousLabel = 'Précédent',
  summary,
}) {
  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.page ?? page ?? 1;
  const total = pagination?.total ?? 0;
  const resolvedPageSize = pageSize ?? pagination?.limit ?? null;
  const showNavigation = totalPages > 1;
  const showPageSize = Boolean(onPageSizeChange && resolvedPageSize && total > 0);
  const pageSizeItems = pageSizeOptions.map((option) => ({
    value: String(option),
    label: String(option),
  }));

  if (!showNavigation && !showPageSize) return null;

  return (
    <nav aria-label={ariaLabel} className={className}>
      <div className="flex flex-wrap items-center gap-3">
        {showPageSize && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Afficher</span>
            <Select
              items={pageSizeItems}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              value={String(resolvedPageSize)}
            >
              <SelectTrigger
                aria-label="Nombre de lignes par page"
                className="h-9 w-20"
                disabled={disabled}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>par page</span>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          {summary ?? (
            showNavigation
              ? `Page ${currentPage} sur ${totalPages} · ${total} résultat${total > 1 ? 's' : ''}`
              : `${total} résultat${total > 1 ? 's' : ''}`
          )}
        </div>
      </div>

      {showNavigation && (
        <div className="flex gap-2">
          <Button
            disabled={disabled || currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            size={buttonSize}
            type="button"
            variant="outline"
          >
            {previousLabel}
          </Button>
          <Button
            disabled={disabled || currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            size={buttonSize}
            type="button"
            variant="outline"
          >
            {nextLabel}
          </Button>
        </div>
      )}
    </nav>
  );
}

export {
  DATA_PAGE_SIZE_OPTIONS,
  DEFAULT_DATA_PAGE_SIZE,
  DataPagination,
};
