import { Button } from '@/components/ui/button';

function AuditLogPagination({ page, pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {pagination.page} sur {pagination.totalPages} · {pagination.total} événement
        {pagination.total === 1 ? '' : 's'}
      </p>

      <div className="flex gap-2">
        <Button
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          type="button"
          variant="outline"
        >
          Précédent
        </Button>
        <Button
          disabled={page >= pagination.totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
          variant="outline"
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}

export { AuditLogPagination };
