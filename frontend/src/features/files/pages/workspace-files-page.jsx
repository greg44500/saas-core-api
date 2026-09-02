import { useState } from 'react';
import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  useDownloadWorkspaceFileMutation,
  useListWorkspaceFilesQuery,
} from '@/features/files/api/files-api';
import { FileUploadDialog } from '@/features/files/components/file-upload-dialog';
import { FilesPagination } from '@/features/files/components/files-pagination';
import { FilesTable } from '@/features/files/components/files-table';
import { downloadBlob } from '@/features/files/lib/download-blob';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const PAGE_SIZE = 20;

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function WorkspaceFilesPage() {
  const { workspace, can } = useWorkspaceContext();
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const filesQuery = useListWorkspaceFilesQuery({
    workspaceId: workspace.id,
    page,
    limit: PAGE_SIZE,
  });
  const [downloadWorkspaceFile] = useDownloadWorkspaceFileMutation();

  async function handleDownload(file) {
    setFeedback(null);
    setDownloadingFileId(file.id);

    try {
      const blob = await downloadWorkspaceFile({
        workspaceId: workspace.id,
        fileId: file.id,
      }).unwrap();

      downloadBlob(blob, file.originalName);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getApiMessage(error, 'Le téléchargement du fichier a échoué.'),
      });
    } finally {
      setDownloadingFileId(null);
    }
  }

  if (filesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement des fichiers…</p>;
  }

  if (filesQuery.error) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Fichiers</h1>
        <p className="text-sm text-destructive">
          Impossible de charger les fichiers du workspace.
        </p>
        <Button type="button" variant="outline" onClick={filesQuery.refetch}>
          Réessayer
        </Button>
      </section>
    );
  }

  const files = filesQuery.data?.files ?? [];
  const pagination = filesQuery.data?.pagination;
  const totalFiles = pagination?.total ?? files.length;
  const canUpload = can(WORKSPACE_PERMISSION.FILE_UPLOAD);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fichiers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultez et téléchargez les fichiers actifs de {workspace.name}.
          </p>
        </div>

        {canUpload && (
          <Button
            onClick={() => {
              setFeedback(null);
              setUploadDialogOpen(true);
            }}
            type="button"
          >
            <Upload aria-hidden="true" className="size-4" />
            Ajouter un fichier
          </Button>
        )}
      </div>

      {feedback && (
        <p
          className={`rounded-md border p-3 text-sm ${
            feedback.type === 'error'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-success/30 bg-success/10'
          }`}
          role="status"
        >
          {feedback.message}
        </p>
      )}

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">Fichiers actifs</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalFiles} fichier{totalFiles === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="p-5">
            <p className="text-sm font-medium">Aucun fichier actif</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucun fichier n’est actuellement disponible dans ce workspace.
            </p>
          </div>
        ) : (
          <FilesTable
            downloadingFileId={downloadingFileId}
            files={files}
            onDownload={handleDownload}
          />
        )}

        <div className="px-5 pb-5">
          <FilesPagination
            page={page}
            pagination={pagination}
            onPageChange={setPage}
          />
        </div>
      </section>

      {canUpload && (
        <FileUploadDialog
          onClose={() => setUploadDialogOpen(false)}
          onUploaded={(uploadedFile) => {
            setPage(1);
            setFeedback({
              type: 'success',
              message: uploadedFile?.originalName
                ? `${uploadedFile.originalName} a été ajouté.`
                : 'Le fichier a été ajouté.',
            });
          }}
          open={uploadDialogOpen}
        />
      )}
    </div>
  );
}

export { PAGE_SIZE, WorkspaceFilesPage, getApiMessage };
