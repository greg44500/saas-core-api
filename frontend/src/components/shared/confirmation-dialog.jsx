import { useRef } from 'react';

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

/**
 * Cadre partagé des confirmations bloquantes du Core.
 *
 * Les règles métier, les libellés et le contenu restent dans la feature. Base UI
 * porte désormais la mécanique transversale de la modale : focus, Escape,
 * boucle Tab, restauration du focus et verrouillage du scroll.
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
  const cancelButtonRef = useRef(null);

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) {
          onCancel();
        }
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent initialFocus={cancelButtonRef}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription render={<div />}>
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>

          {children}

          {errorMessage ? (
            <div className="mt-3 text-sm text-destructive" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose
              disabled={pending}
              ref={cancelButtonRef}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button
              disabled={pending}
              onClick={onConfirm}
              type="button"
              variant={confirmVariant}
            >
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ConfirmationDialog };
