import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDownloadWorkspaceFileMutation } from '@/features/files/api/files-api';

function getPreviewErrorMessage(error) {
  return error?.data?.message ?? 'La prévisualisation du fichier a échoué.';
}

/**
 * Prévisualise un fichier actif sans exposer son endpoint authentifié dans le DOM.
 *
 * Le contenu passe d'abord par RTK Query, puis par une URL Blob locale au navigateur.
 * Cette URL est révoquée dès que la modale se ferme pour ne pas conserver inutilement
 * le contenu du fichier en mémoire.
 */
function FilePreviewDialog({ file, onClose, open, workspaceId }) {
  const [loadWorkspaceFilePreview, previewState] = useDownloadWorkspaceFileMutation();
  const [sourceUrl, setSourceUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!open || !file) {
      setSourceUrl(null);
      setErrorMessage(null);
      return undefined;
    }

    let active = true;
    let objectUrl = null;

    async function loadPreview() {
      setSourceUrl(null);
      setErrorMessage(null);

      try {
        const blob = await loadWorkspaceFilePreview({
          workspaceId,
          fileId: file.id,
        }).unwrap();

        if (!active) return;

        objectUrl = URL.createObjectURL(blob);
        setSourceUrl(objectUrl);
      } catch (error) {
        if (active) {
          setErrorMessage(getPreviewErrorMessage(error));
        }
      }
    }

    void loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file, loadWorkspaceFilePreview, open, workspaceId]);

  const isImage = file?.mimeType === 'image/jpeg' || file?.mimeType === 'image/png';
  const isPdf = file?.mimeType === 'application/pdf';

  return (
    <DialogRoot
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={open && Boolean(file)}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border p-5">
            <DialogTitle>{file?.originalName ?? 'Prévisualisation du fichier'}</DialogTitle>
            <DialogDescription>
              Aperçu temporaire du fichier. Fermez cette fenêtre pour libérer son contenu local.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-96 items-center justify-center bg-muted/20 p-4">
            {previewState.isLoading ? (
              <p className="text-sm text-muted-foreground" role="status">
                Chargement de la prévisualisation…
              </p>
            ) : null}

            {!previewState.isLoading && errorMessage ? (
              <p
                className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            {!previewState.isLoading && !errorMessage && sourceUrl && isImage ? (
              <img
                alt={`Prévisualisation de ${file.originalName}`}
                className="max-h-[70vh] max-w-full object-contain"
                src={sourceUrl}
              />
            ) : null}

            {!previewState.isLoading && !errorMessage && sourceUrl && isPdf ? (
              <object
                aria-label={`Prévisualisation de ${file.originalName}`}
                className="h-[70vh] w-full rounded-md border border-border bg-background"
                data={sourceUrl}
                type="application/pdf"
              >
                <p className="p-4 text-sm text-muted-foreground">
                  Votre navigateur ne permet pas d’afficher ce PDF directement. Utilisez le
                  téléchargement depuis la liste des fichiers.
                </p>
              </object>
            ) : null}

            {!previewState.isLoading
              && !errorMessage
              && sourceUrl
              && !isImage
              && !isPdf ? (
                <p className="text-sm text-muted-foreground">
                  Ce type de fichier ne peut pas être prévisualisé.
                </p>
              ) : null}
          </div>

          <DialogFooter className="mt-0 border-t border-border p-4">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Fermer
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { FilePreviewDialog, getPreviewErrorMessage };
