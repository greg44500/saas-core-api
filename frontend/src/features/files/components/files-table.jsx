import { Download, Trash2 } from 'lucide-react';

import { DATA_TABLE_STYLES } from '@/components/data-display/data-table-styles';
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className={`${DATA_TABLE_STYLES.headerCell} font-medium`}>Fichier</th>
            <th className={`${DATA_TABLE_STYLES.headerCell} font-medium`}>Catégorie</th>
            <th className={`${DATA_TABLE_STYLES.headerCell} font-medium`}>Type</th>
            <th className={`${DATA_TABLE_STYLES.headerCell} font-medium`}>Taille</th>
            <th className={`${DATA_TABLE_STYLES.headerCell} font-medium`}>Ajouté le</th>
            <th className={`${DATA_TABLE_STYLES.headerCell} font-medium`}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {files.map((file) => (
            <tr key={file.id}>
              <td className={`max-w-80 ${DATA_TABLE_STYLES.bodyCell}`}>
                <p className="truncate font-medium" title={file.originalName}>
                  {file.originalName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{file.mimeType}</p>
              </td>
              <td className={DATA_TABLE_STYLES.bodyCell}>{formatFileCategory(file.category)}</td>
              <td className={DATA_TABLE_STYLES.bodyCell}>{formatFileType(file)}</td>
              <td className={`whitespace-nowrap ${DATA_TABLE_STYLES.bodyCell}`}>
                {formatFileSize(file.sizeBytes)}
              </td>
              <td className={`whitespace-nowrap ${DATA_TABLE_STYLES.bodyCell}`}>
                {formatFileDate(file.createdAt)}
              </td>
              <td className={DATA_TABLE_STYLES.bodyCell}>
                <div className={`flex items-center ${DATA_TABLE_STYLES.actionGroup}`}>
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { FilesTable };
