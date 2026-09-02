import { Button } from '@/components/ui/button';

/**
 * Confirme uniquement le soft-delete du Core.
 *
 * L'interface évite volontairement le mot « corbeille » tant que le listing et
 * la restauration des fichiers supprimés ne sont pas réellement disponibles.
 * Le backend conserve néanmoins le contenu physique pendant sa période de
 * rétention avant purge définitive.
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
  if (!open || !file) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/50 px-4"
      role="presentation"
    >
      <section
        aria-labelledby="file-delete-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl"
        role="dialog"
      >
        <div className="space-y-3">
          <h2 id="file-delete-title" className="text-lg font-semibold">
            Retirer ce fichier ?
          </h2>
          <p className="text-sm">
            <span className="font-medium">{file.originalName}</span> sera retiré des fichiers actifs.
          </p>
          <p className="text-sm text-muted-foreground">
            Le contenu est conservé temporairement pendant au maximum 30 jours avant sa purge
            définitive. La restauration utilisateur n’est pas encore disponible dans cette version.
          </p>
        </div>

        {errorMessage && (
          <p
            className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? 'Suppression…' : 'Retirer le fichier'}
          </Button>
        </div>
      </section>
    </div>
  );
}

export { FileDeleteDialog };
