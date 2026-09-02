import { useState } from 'react';
import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useUploadWorkspaceFileMutation } from '@/features/files/api/files-api';
import {
  FILE_INPUT_ACCEPT,
  FILE_UPLOAD_CATEGORY_OPTIONS,
} from '@/features/files/constants/file-upload.constants';
import { validateFileUpload } from '@/features/files/validation/file-upload-schema';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function getUploadErrorMessage(error) {
  return error?.data?.message ?? 'Le fichier n’a pas pu être téléversé.';
}

function FileUploadDialog({ onClose, onUploaded, open }) {
  const { workspace } = useWorkspaceContext();
  const [category, setCategory] = useState('other');
  const [file, setFile] = useState(null);
  const [validationMessage, setValidationMessage] = useState(null);
  const [serverMessage, setServerMessage] = useState(null);
  const [uploadWorkspaceFile, uploadState] = useUploadWorkspaceFileMutation();

  function resetForm() {
    setCategory('other');
    setFile(null);
    setValidationMessage(null);
    setServerMessage(null);
  }

  function handleClose() {
    if (uploadState.isLoading) return;
    resetForm();
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationMessage(null);
    setServerMessage(null);

    const validation = validateFileUpload({ category, file });

    if (!validation.success) {
      setValidationMessage(validation.error.issues[0]?.message ?? 'Le formulaire est invalide.');
      return;
    }

    try {
      const uploadedFile = await uploadWorkspaceFile({
        workspaceId: workspace.id,
        file: validation.data.file,
        category: validation.data.category,
      }).unwrap();

      resetForm();
      onClose();
      onUploaded(uploadedFile);
    } catch (error) {
      setServerMessage(getUploadErrorMessage(error));
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/50 px-4"
      role="presentation"
    >
      <section
        aria-labelledby="file-upload-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl"
        role="dialog"
      >
        <div className="space-y-2">
          <h2 id="file-upload-title" className="text-lg font-semibold">
            Ajouter un fichier
          </h2>
          <p className="text-sm text-muted-foreground">
            PDF, JPG et PNG sont acceptés. Le serveur vérifie ensuite le type réel,
            la taille, l’antivirus et les quotas du workspace.
          </p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <p className="text-sm font-medium">Fichier</p>

            {/*
             * Le libellé natif d'un input file dépend du navigateur et du système
             * d'exploitation. Le contrôle reste accessible mais est masqué afin de
             * garantir une interface française quel que soit l'environnement client.
             */}
            <input
              accept={FILE_INPUT_ACCEPT}
              aria-label="Fichier"
              className="sr-only"
              disabled={uploadState.isLoading}
              id="workspace-file-upload"
              name="file"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setValidationMessage(null);
                setServerMessage(null);
              }}
              type="file"
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button asChild type="button" variant="outline">
                <label
                  aria-disabled={uploadState.isLoading || undefined}
                  className={uploadState.isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  htmlFor="workspace-file-upload"
                >
                  Choisir un fichier
                </label>
              </Button>
              <p
                className="min-w-0 truncate text-sm text-muted-foreground"
                title={file?.name ?? undefined}
              >
                {file?.name ?? 'Aucun fichier sélectionné.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="workspace-file-category">
              Catégorie
            </label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={uploadState.isLoading}
              id="workspace-file-category"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              {FILE_UPLOAD_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {(validationMessage || serverMessage) && (
            <p
              className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {validationMessage ?? serverMessage}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              disabled={uploadState.isLoading}
              onClick={handleClose}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button disabled={uploadState.isLoading} type="submit">
              <Upload aria-hidden="true" className="size-4" />
              {uploadState.isLoading ? 'Téléversement…' : 'Téléverser'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export { FileUploadDialog, getUploadErrorMessage };
