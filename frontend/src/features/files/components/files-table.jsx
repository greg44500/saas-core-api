import { Download } from 'lucide-react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import {
  formatFileCategory,
  formatFileDate,
  formatFileSize,
  formatFileType,
} from '@/features/files/lib/file-formatters';

function FilesTable({ downloadingFileId, files, onDownload }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-medium">Fichier</th>
            <th className="px-5 py-3 font-medium">Catégorie</th>
            <th className="px-5 py-3 font-medium">Type</th>
            <th className="px-5 py-3 font-medium">Taille</th>
            <th className="px-5 py-3 font-medium">Ajouté le</th>
            <th className="px-5 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {files.map((file) => (
            <tr key={file.id}>
              <td className="max-w-80 px-5 py-4">
                <p className="truncate font-medium" title={file.originalName}>
                  {file.originalName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{file.mimeType}</p>
              </td>
              <td className="px-5 py-4">{formatFileCategory(file.category)}</td>
              <td className="px-5 py-4">{formatFileType(file)}</td>
              <td className="whitespace-nowrap px-5 py-4">{formatFileSize(file.sizeBytes)}</td>
              <td className="whitespace-nowrap px-5 py-4">{formatFileDate(file.createdAt)}</td>
              <td className="px-5 py-4">
                <ActionIconButton
                  Icon={Download}
                  disabled={downloadingFileId === file.id}
                  label={`Télécharger ${file.originalName}`}
                  onClick={() => onDownload(file)}
                  variant="outline"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { FilesTable };
