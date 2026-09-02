import { useEffect, useId, useRef } from 'react';

import { Button } from '@/components/ui/button';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Cadre partagé des confirmations bloquantes du Core.
 *
 * Les règles métier, les libellés et le contenu restent dans la feature. Cette
 * primitive ne possède que la mécanique transversale d'une modale : structure
 * accessible, focus, Escape, boucle Tab et verrouillage du scroll.
 */
function ConfirmationDialog({
  children = null,
  confirmLabel = 'Confirmer',
  confirmVariant = 'destructive',
  description,
  errorMessage = null,
  onCancel,
  onConfirm,
  open = true,
  pending = false,
  pendingLabel = 'Traitement…',
  title,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    cancelButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancelRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [],
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-black/50 px-4"
      role="presentation"
    >
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="space-y-2">
          <h2 className="text-lg font-semibold" id={titleId}>
            {title}
          </h2>
          {description && (
            <div className="text-sm text-muted-foreground" id={descriptionId}>
              {description}
            </div>
          )}
        </div>

        {children}

        {errorMessage && (
          <div className="mt-3 text-sm text-destructive" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            disabled={pending}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
            variant="outline"
          >
            Annuler
          </Button>
          <Button
            disabled={pending}
            onClick={onConfirm}
            type="button"
            variant={confirmVariant}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

export { ConfirmationDialog };
