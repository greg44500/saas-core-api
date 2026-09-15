import { RotateCcw } from 'lucide-react';

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
 * Le tableau s'appuie sur le DataTable partagé du Core. La restauration reste
 * une action métier de la feature Files ; elle n'est pas intégrée au composant
 * générique afin de préserver la séparation des responsabilités.
 */
function FileTrashTable({
  canRestore,
  files,
  onRestore,
  restoringFileId,
}) {
  const columns = [
    {
      id: 'file',
      header: 'Fichier',
      headerClassName: 'w-[34%]',
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
      headerClassName: 'w-[13%]',
      cellClassName: 'truncate',
      cell: (file) => formatFileCategory(file.category),
    },
    {
      id: 'size',
      header: 'Taille',
      headerClassName: 'w-[10%]',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => formatFileSize(file.sizeBytes),
    },
    {
      id: 'deletedAt',
      header: 'Supprimé le',
      headerClassName: 'w-[16%]',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => formatFileDate(file.deletedAt),
    },
    {
      id: 'purgeScheduledAt',
      header: 'Purge prévue',
      headerClassName: 'w-[16%]',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => formatFileDate(file.purgeScheduledAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      headerClassName: 'w-[11%]',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => (
        <DataTableActions className="items-center justify-end">
          {canRestore && (
            <ActionIconButton
              Icon={RotateCcw}
              disabled={restoringFileId === file.id}
              label={`Restaurer ${file.originalName}`}
              onClick={() => onRestore(file)}
              variant="outline"
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
      tableClassName="table-fixed"
    />
  );
}

export { FileTrashTable };
