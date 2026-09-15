import { RotateCcw, Trash2 } from 'lucide-react';

import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import {
  formatFileCategory,
  formatFileDate,
  formatFileSize,
} from '@/features/files/lib/file-formatters';

/**
 * Affiche les fichiers soft-deleted encore conservés physiquement par D-019.
 *
 * Le tableau s'appuie sur le DataTable partagé du Core. Les actions de cycle de
 * vie restent dans la feature Files afin de préserver la séparation des
 * responsabilités avec le composant de tableau générique.
 */
function FileTrashTable({
  canDeletePermanently,
  canRestore,
  deletingFileId,
  files,
  onDeletePermanently,
  onRestore,
  restoringFileId,
}) {
  const columns = [
    {
      id: 'file',
      header: 'Fichier',
      headerClassName: 'w-[31%]',
      cellClassName: 'min-w-0',
      cell: (file) => (
        <p className="truncate font-medium" title={file.originalName}>
          {file.originalName}
        </p>
      ),
    },
    {
      id: 'category',
      header: 'Catégorie',
      headerClassName: 'w-[12%]',
      cellClassName: 'truncate',
      cell: (file) => formatFileCategory(file.category),
    },
    {
      id: 'size',
      header: 'Taille',
      headerClassName: 'w-[9%]',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => formatFileSize(file.sizeBytes),
    },
    {
      id: 'deletedAt',
      header: 'Supprimé le',
      headerClassName: 'w-[15%]',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => formatFileDate(file.deletedAt),
    },
    {
      id: 'purgeScheduledAt',
      header: 'Suppression définitive prévue',
      headerClassName: 'w-[20%]',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => formatFileDate(file.purgeScheduledAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      headerClassName: 'w-[13%]',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => (
        <DataTableActions className="items-center justify-end">
          {canRestore && (
            <ActionIconButton
              Icon={RotateCcw}
              disabled={restoringFileId === file.id || deletingFileId === file.id}
              label={`Restaurer ${file.originalName}`}
              onClick={() => onRestore(file)}
              tooltipLabel="Restaurer"
              variant="outline"
            />
          )}

          {canDeletePermanently && (
            <ActionIconButton
              Icon={Trash2}
              disabled={deletingFileId === file.id || restoringFileId === file.id}
              label={`Supprimer définitivement ${file.originalName}`}
              onClick={() => onDeletePermanently(file)}
              tooltipLabel="Supprimer définitivement"
              variant="destructive"
            />
          )}
        </DataTableActions>
      ),
    },
  ];

  return (
    <DataTable
      caption="Corbeille des fichiers du workspace"
      columns={columns}
      data={files}
      getRowKey={(file) => file.id}
      rowClassName="transition-colors hover:bg-accent/40 focus-within:bg-accent/40"
      tableClassName="table-fixed"
    />
  );
}

export { FileTrashTable };
