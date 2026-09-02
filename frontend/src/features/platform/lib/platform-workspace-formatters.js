const PLATFORM_WORKSPACE_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
  CLOSED: 'closed',
});

const PLATFORM_WORKSPACE_STATUS_REASON = Object.freeze({
  PAYMENT_FAILURE: 'payment_failure',
  PAYMENT_DISPUTE: 'payment_dispute',
  TERMS_VIOLATION: 'terms_violation',
  SECURITY_INCIDENT: 'security_incident',
  ADMINISTRATIVE_REVIEW: 'administrative_review',
  OWNER_REQUEST: 'owner_request',
  PLATFORM_DECISION: 'platform_decision',
  OTHER: 'other',
});

const PLATFORM_WORKSPACE_STATUS_LABEL = Object.freeze({
  active: 'Actif',
  suspended: 'Suspendu',
  archived: 'Archivé',
  closed: 'Clôturé',
});

const PLATFORM_WORKSPACE_STATUS_REASON_LABEL = Object.freeze({
  payment_failure: 'Échec de paiement',
  payment_dispute: 'Litige de paiement',
  terms_violation: 'Non-respect des conditions',
  security_incident: 'Incident de sécurité',
  administrative_review: 'Revue administrative',
  owner_request: 'Demande du propriétaire',
  platform_decision: 'Décision de la plateforme',
  other: 'Autre motif',
});

function formatPlatformWorkspaceStatus(status) {
  return PLATFORM_WORKSPACE_STATUS_LABEL[status] ?? status ?? '—';
}

function formatPlatformWorkspaceStatusReason(reason) {
  return PLATFORM_WORKSPACE_STATUS_REASON_LABEL[reason] ?? reason ?? '—';
}

function formatPlatformWorkspaceDate(value) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export {
  PLATFORM_WORKSPACE_STATUS,
  PLATFORM_WORKSPACE_STATUS_REASON,
  PLATFORM_WORKSPACE_STATUS_REASON_LABEL,
  formatPlatformWorkspaceDate,
  formatPlatformWorkspaceStatus,
  formatPlatformWorkspaceStatusReason,
};
