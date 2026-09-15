import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';

/**
 * Confirme uniquement le soft-delete du Core.
 *
 * Le backend conserve le contenu physique pendant sa période de rétention avant
 * purge définitive. Tant que la purge n'a pas commencé, l'utilisateur autorisé
 * peut restaurer le fichier depuis la Corbeille.
 *
 * @param {object} props
 * @param {{ id: string, originalName: string } | null} props.file
 * @param {boolean} props.open
 * @param {boolean} props.pending
 * @param {string | null} props.errorMessage
 * @param {() => void} props.onCancel
 * @param {() => void} props.onConfirm
 */
function FileDeleteDialog({
  errorMessage,
  file,
  onCancel,
  onConfirm,
  open,
  pending,
}) {
  return (
    <ConfirmationDialog
      confirmLabel="Retirer le fichier"
      confirmVariant="destructive"
      onCancel={onCancel}
      onConfirm={onConfirm}
      open={open && Boolean(file)}
      pending={pending}
      pendingLabel="Suppression…"
      title="Retirer ce fichier ?"
    >
      {file && (
        <div className="mt-3 space-y-3">
          <p className="text-sm">
            <span className="font-medium">{file.originalName}</span> sera retiré des fichiers actifs.
          </p>
          <p className="text-sm text-muted-foreground">
            Le contenu est conservé temporairement pendant au maximum 30 jours avant sa purge
            définitive. Vous pourrez le restaurer depuis la Corbeille tant que la purge n’a pas commencé.
          </p>
        </div>
      )}

      {errorMessage && (
        <p
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </ConfirmationDialog>
  );
}

export { FileDeleteDialog };
