import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';

/**
 * Confirme une suppression physique irréversible depuis la Corbeille.
 *
 * Cette action ne doit jamais être confondue avec le soft-delete : elle détruit
 * immédiatement le contenu et libère la consommation de stockage associée.
 */
function FilePermanentDeleteDialog({
  errorMessage,
  file,
  onCancel,
  onConfirm,
  open,
  pending,
}) {
  return (
    <ConfirmationDialog
      confirmLabel="Supprimer définitivement"
      confirmVariant="destructive"
      errorMessage={errorMessage}
      onCancel={onCancel}
      onConfirm={onConfirm}
      open={open && Boolean(file)}
      pending={pending}
      pendingLabel="Suppression définitive…"
      title="Supprimer définitivement ce fichier ?"
    >
      {file ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm">
            <span className="font-medium">{file.originalName}</span> sera supprimé immédiatement.
          </p>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Le contenu ne pourra plus être restauré et l’espace de stockage associé sera libéré.
          </p>
        </div>
      ) : null}
    </ConfirmationDialog>
  );
}

export { FilePermanentDeleteDialog };
