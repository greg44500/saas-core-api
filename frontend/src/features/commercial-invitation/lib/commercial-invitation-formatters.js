const COMMERCIAL_INVITATION_STATUS_LABELS = Object.freeze({
  pending: 'En attente',
  accepted: 'Acceptée',
  declined: 'Refusée',
  expired: 'Expirée',
  revoked: 'Révoquée',
});

const COMMERCIAL_INVITATION_DELIVERY_LABELS = Object.freeze({
  pending: 'En attente',
  sent: 'Envoyée',
  failed: 'Échec',
});

function formatCommercialInvitationStatus(status) {
  return COMMERCIAL_INVITATION_STATUS_LABELS[status] ?? status ?? '—';
}

function formatCommercialInvitationDeliveryStatus(status) {
  return COMMERCIAL_INVITATION_DELIVERY_LABELS[status] ?? status ?? '—';
}

function formatCommercialInvitationDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatCommercialInvitationPrice(amountMinor, currency = 'EUR') {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) return '—';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amountMinor / 100);
}

function formatCommercialInvitationBillingInterval(value) {
  const labels = {
    none: 'Sans périodicité',
    monthly: 'Mensuelle',
    yearly: 'Annuelle',
  };

  return labels[value] ?? value ?? '—';
}

export {
  COMMERCIAL_INVITATION_DELIVERY_LABELS,
  COMMERCIAL_INVITATION_STATUS_LABELS,
  formatCommercialInvitationBillingInterval,
  formatCommercialInvitationDate,
  formatCommercialInvitationDeliveryStatus,
  formatCommercialInvitationPrice,
  formatCommercialInvitationStatus,
};
