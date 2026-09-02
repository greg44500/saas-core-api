import { Button } from '@/components/ui/button';

/**
 * Cadre de confirmation propre aux transitions Subscription. Le contenu métier
 * reste fourni par le composant appelant afin que cette brique ne décide jamais
 * elle-même de la validité d'une résiliation ou d'un changement de plan.
 */
function CommercialActionDialog({
  children,
  confirmLabel,
  confirmVariant = 'default',
  description,
  onCancel,
  onConfirm,
  pending,
  title,
  validationMessage,
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 px-4" role="presentation">
      <section
        aria-labelledby="commercial-action-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl"
        role="dialog"
      >
        <div className="space-y-2">
          <h3 id="commercial-action-title" className="text-lg font-semibold">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {children}

        {validationMessage && (
          <p className="mt-3 text-sm text-destructive" role="alert">{validationMessage}</p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={pending} onClick={onCancel} type="button" variant="outline">
            Annuler
          </Button>
          <Button
            disabled={pending}
            onClick={onConfirm}
            type="button"
            variant={confirmVariant}
          >
            {pending ? 'Traitement…' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

export { CommercialActionDialog };
