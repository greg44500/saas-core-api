import { useState } from 'react';

import { DEFAULT_DATA_PAGE_SIZE } from '@/components/data-display/data-pagination-config';
import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTableSkeleton } from '@/components/data-display/data-table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { useToast } from '@/components/shared/toast-provider';
import {
  useListWorkspaceFileTrashQuery,
  useRestoreWorkspaceFileMutation,
} from '@/features/files/api/files-api';
import { FileTrashTable } from '@/features/files/components/file-trash-table';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { useDataPagination } from '@/hooks/use-data-pagination';

const PAGE_SIZE = DEFAULT_DATA_PAGE_SIZE;

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function WorkspaceFileTrashPage({ embedded = false }) {
  const { workspace, can } = useWorkspaceContext();
  const { toast } = useToast();
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useDataPagination({ initialPageSize: PAGE_SIZE });
  const [restoringFileId, setRestoringFileId] = useState(null);

  const trashQuery = useListWorkspaceFileTrashQuery({
    workspaceId: workspace.id,
    page,
    limit: pageSize,
  });
  const [restoreWorkspaceFile] = useRestoreWorkspaceFileMutation();

  const files = trashQuery.data?.files ?? [];
  const pagination = trashQuery.data?.pagination;
  const totalFiles = pagination?.total ?? files.length;
  const canRestore = can(WORKSPACE_PERMISSION.FILE_RESTORE);

  async function handleRestore(file) {
    setRestoringFileId(file.id);

    try {
      await restoreWorkspaceFile({
        workspaceId: workspace.id,
        fileId: file.id,
      }).unwrap();

      // Une restauration peut supprimer la dernière ligne d'une page. Revenir
      // à la première évite de conserver une pagination devenue hors bornes.
      setPage(1);
      toast({
        title: 'Fichier restauré',
        description: `${file.originalName} est de nouveau disponible dans les fichiers actifs.`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Restauration impossible',
        description: getApiMessage(
          error,
          'Le fichier n’a pas pu être restauré.',
        ),
        variant: 'error',
      });
    } finally {
      setRestoringFileId(null);
    }
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex items-center gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Corbeille</h1>
          <InfoTooltip
            content={`Consultez les fichiers supprimés de ${workspace.name} avant leur purge définitive.`}
            label="À propos de la corbeille"
          />
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Fichiers supprimés</h2>
          {!trashQuery.isLoading && !trashQuery.error && (
            <p className="mt-1 text-xs text-muted-foreground">
              {totalFiles} fichier{totalFiles === 1 ? '' : 's'} — purge automatique à l’échéance indiquée
            </p>
          )}
        </div>

        {trashQuery.isLoading ? (
          <DataTableSkeleton columns={6} rows={6} />
        ) : trashQuery.error ? (
          <ErrorState
            description="Impossible de charger la corbeille du workspace."
            onRetry={trashQuery.refetch}
            title="Corbeille indisponible"
          />
        ) : files.length === 0 ? (
          <EmptyState
            description="Les fichiers supprimés apparaîtront ici jusqu’à leur purge définitive."
            title="La corbeille est vide"
          />
        ) : (
          <>
            <FileTrashTable
              canRestore={canRestore}
              files={files}
              onRestore={handleRestore}
              restoringFileId={restoringFileId}
            />

            <div className="px-5 pb-5">
              <DataPagination
                ariaLabel="Pagination de la corbeille du workspace"
                disabled={trashQuery.isFetching}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                page={page}
                pageSize={pageSize}
                pagination={pagination}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export {
  PAGE_SIZE,
  WorkspaceFileTrashPage,
  getApiMessage,
};
