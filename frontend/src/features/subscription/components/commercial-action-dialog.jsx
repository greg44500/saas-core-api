import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';

/**
 * Adapte la confirmation partagée aux transitions Subscription. Le contenu
 * métier reste fourni par le composant appelant afin que cette brique ne décide
 * jamais elle-même de la validité d'une résiliation ou d'un changement de plan.
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
    <ConfirmationDialog
      confirmLabel={confirmLabel}
      confirmVariant={confirmVariant}
      description={description}
      errorMessage={validationMessage}
      onCancel={onCancel}
      onConfirm={onConfirm}
      pending={pending}
      title={title}
    >
      {children}
    </ConfirmationDialog>
  );
}

export { CommercialActionDialog };
