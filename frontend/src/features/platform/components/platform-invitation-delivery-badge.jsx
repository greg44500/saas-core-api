import { StatusBadge } from '@/components/data-display/status-badge';

const DELIVERY_PRESENTATION = Object.freeze({
  pending: Object.freeze({
    label: 'Envoi en attente',
    tone: 'warning',
  }),
  sent: Object.freeze({
    label: 'Envoyée',
    tone: 'success',
  }),
  failed: Object.freeze({
    label: 'Échec d’envoi',
    tone: 'destructive',
  }),
});

const DELIVERY_LABELS = Object.freeze(
  Object.fromEntries(
    Object.entries(DELIVERY_PRESENTATION).map(([status, presentation]) => [
      status,
      presentation.label,
    ]),
  ),
);

function PlatformInvitationDeliveryBadge({ status }) {
  const presentation = DELIVERY_PRESENTATION[status] ?? {
    label: 'État inconnu',
    tone: 'neutral',
  };

  return (
    <StatusBadge tone={presentation.tone}>
      {presentation.label}
    </StatusBadge>
  );
}

export {
  DELIVERY_LABELS,
  DELIVERY_PRESENTATION,
  PlatformInvitationDeliveryBadge,
};
