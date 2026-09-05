import { Download, Trash2 } from 'lucide-react';

import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import {
  formatFileCategory,
  formatFileDate,
  formatFileSize,
} from '@/features/files/lib/file-formatters';

/**
 * Affiche uniquement des fichiers actifs.
 *
 * Les actions sont pilotées par les permissions déjà résolues dans le contexte
 * Workspace pour guider l'UX ; le backend reste l'autorité et revérifie chaque
 * permission sur les endpoints concernés.
 *
 * Le tableau reste volontairement compact : le MIME et le type technique sont
 * conservés dans les données mais ne sont pas répétés dans la liste utilisateur.
 * Le nom est la seule cellule compressible et expose sa valeur complète via le
 * title natif lorsqu'il est tronqué.
 *
 * @param {object} props
 * @param {Array<object>} props.files
 * @param {string | null} props.downloadingFileId
 * @param {boolean} props.canDelete
 * @param {(file: object) => void} props.onDownload
 * @param {(file: object) => void} props.onDelete
 */
function FilesTable({ canDelete, downloadingFileId, files, onDelete, onDownload }) {
  const columns = [
    {
      id: 'file',
      header: 'Fichier',
      headerClassName: 'w-[46%]',
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
      headerClassName: 'w-[14%]',
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
      id: 'createdAt',
      header: 'Ajouté le',
      headerClassName: 'w-[18%]',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => formatFileDate(file.createdAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      headerClassName: 'w-[12%]',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => (
        <DataTableActions className="items-center justify-end">
          <ActionIconButton
            Icon={Download}
            disabled={downloadingFileId === file.id}
            label={`Télécharger ${file.originalName}`}
            onClick={() => onDownload(file)}
            variant="outline"
          />
          {canDelete && (
            <ActionIconButton
              Icon={Trash2}
              label={`Retirer ${file.originalName}`}
              onClick={() => onDelete(file)}
              variant="destructive"
            />
          )}
        </DataTableActions>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={files}
      getRowKey={(file) => file.id}
      tableClassName="table-fixed"
    />
  );
}

export { FilesTable };
