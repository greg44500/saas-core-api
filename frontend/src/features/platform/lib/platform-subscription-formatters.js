const STATUS_LABELS = Object.freeze({
  trialing: 'Trial',
  active: 'Actif',
  past_due: 'Paiement en retard',
  canceled: 'Annulé',
  expired: 'Expiré',
});

const KIND_LABELS = Object.freeze({
  baseline: 'Socle',
  commercial: 'Commercial',
});

const BILLING_LABELS = Object.freeze({
  none: 'Aucune',
  monthly: 'Mensuelle',
  yearly: 'Annuelle',
});

const DISCOUNT_LABELS = Object.freeze({
  none: 'Aucune',
  percentage: 'Pourcentage',
  fixed_amount: 'Montant fixe',
});

function formatPlatformSubscriptionStatus(status) {
  return STATUS_LABELS[status] ?? status ?? '—';
}

function formatPlatformSubscriptionKind(kind) {
  return KIND_LABELS[kind] ?? kind ?? '—';
}

function formatPlatformSubscriptionBillingInterval(interval) {
  return BILLING_LABELS[interval] ?? interval ?? '—';
}

function formatPlatformSubscriptionDiscountType(type) {
  return DISCOUNT_LABELS[type] ?? type ?? '—';
}

function formatPlatformSubscriptionPrice(value, currency = 'EUR') {
  if (!Number.isInteger(value)) return '—';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(value / 100);
}

function formatPlatformSubscriptionDiscountValue(type, value, currency = 'EUR') {
  if (type === 'none') return '—';
  if (!Number.isInteger(value)) return '—';
  if (type === 'percentage') return `${value} %`;
  if (type === 'fixed_amount') return formatPlatformSubscriptionPrice(value, currency);
  return String(value);
}

function formatPlatformSubscriptionDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export {
  formatPlatformSubscriptionBillingInterval,
  formatPlatformSubscriptionDate,
  formatPlatformSubscriptionDiscountType,
  formatPlatformSubscriptionDiscountValue,
  formatPlatformSubscriptionKind,
  formatPlatformSubscriptionPrice,
  formatPlatformSubscriptionStatus,
};
