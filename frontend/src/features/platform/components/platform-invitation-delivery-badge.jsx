const DELIVERY_LABELS = Object.freeze({
  pending: 'Envoi en attente',
  sent: 'Envoyée',
  failed: 'Échec d’envoi',
});

const DELIVERY_CLASSES = Object.freeze({
  pending: 'border-muted-foreground/25 bg-muted text-muted-foreground',
  sent: 'border-primary/30 bg-primary/10 text-primary',
  failed: 'border-destructive/30 bg-destructive/10 text-destructive',
});

function PlatformInvitationDeliveryBadge({ status }) {
  const label = DELIVERY_LABELS[status] ?? 'État inconnu';
  const className = DELIVERY_CLASSES[status]
    ?? DELIVERY_CLASSES.pending;

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

export {
  DELIVERY_LABELS,
  PlatformInvitationDeliveryBadge,
};
