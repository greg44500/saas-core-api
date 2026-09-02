import { Download, Trash2 } from 'lucide-react';

import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import {
  formatFileCategory,
  formatFileDate,
  formatFileSize,
  formatFileType,
} from '@/features/files/lib/file-formatters';

/**
 * Affiche uniquement des fichiers actifs.
 *
 * Les actions sont pilotées par les permissions déjà résolues dans le contexte
 * Workspace pour guider l'UX ; le backend reste l'autorité et revérifie chaque
 * permission sur les endpoints concernés.
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
      cellClassName: 'max-w-80',
      cell: (file) => (
        <>
          <p className="truncate font-medium" title={file.originalName}>
            {file.originalName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{file.mimeType}</p>
        </>
      ),
    },
    {
      id: 'category',
      header: 'Catégorie',
      cell: (file) => formatFileCategory(file.category),
    },
    {
      id: 'type',
      header: 'Type',
      cell: (file) => formatFileType(file),
    },
    {
      id: 'size',
      header: 'Taille',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => formatFileSize(file.sizeBytes),
    },
    {
      id: 'createdAt',
      header: 'Ajouté le',
      cellClassName: 'whitespace-nowrap',
      cell: (file) => formatFileDate(file.createdAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (file) => (
        <DataTableActions className="items-center">
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

  return <DataTable columns={columns} data={files} getRowKey={(file) => file.id} />;
}

export { FilesTable };
