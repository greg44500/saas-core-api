import { Button } from '@/components/ui/button';

/**
 * Pagination partagée pour les listes serveur paginées.
 *
 * La navigation précédente/suivante ne dépend d'aucun métier : les features
 * fournissent seulement la page courante, les métadonnées du backend et, si
 * nécessaire, un résumé ou des libellés contextualisés. Cela évite que chaque
 * écran réimplémente les mêmes bornes et les mêmes boutons.
 */
function DataPagination({
  buttonSize,
  className = 'flex items-center justify-between gap-3 pt-4',
  disabled = false,
  nextLabel = 'Suivant',
  onPageChange,
  page,
  pagination,
  previousLabel = 'Précédent',
  summary,
}) {
  const totalPages = pagination?.totalPages ?? 1;
  const displayedPage = pagination?.page ?? page;

  if (totalPages <= 1) return null;

  return (
    <div className={className}>
      <div className="text-sm text-muted-foreground">
        {summary ?? `Page ${displayedPage} sur ${totalPages}`}
      </div>

      <div className="flex gap-2">
        <Button
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          size={buttonSize}
          type="button"
          variant="outline"
        >
          {previousLabel}
        </Button>
        <Button
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          size={buttonSize}
          type="button"
          variant="outline"
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

export { DataPagination };
