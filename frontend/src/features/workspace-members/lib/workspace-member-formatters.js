const MEMBER_STATUS_LABEL = Object.freeze({
  active: 'Actif',
  suspended: 'Suspendu',
  removed: 'Retiré',
});

const INVITATION_STATUS_LABEL = Object.freeze({
  pending: 'En attente',
  accepted: 'Acceptée',
  revoked: 'Révoquée',
  expired: 'Expirée',
});

const INVITATION_DELIVERY_STATUS_LABEL = Object.freeze({
  pending: 'En attente',
  sent: 'Envoyée',
  failed: 'Échec',
});

/**
 * Les statuts HTTP restent des clés stables en anglais dans le contrat API.
 * Cette couche de présentation les traduit sans modifier leur valeur métier et
 * conserve une valeur future inconnue pour ne pas casser l'extensibilité.
 */
function formatMemberStatus(status) {
  return MEMBER_STATUS_LABEL[status] ?? status ?? 'Non renseigné';
}

function formatInvitationStatus(status) {
  return INVITATION_STATUS_LABEL[status] ?? status ?? 'Non renseigné';
}

function formatInvitationDeliveryStatus(status) {
  return INVITATION_DELIVERY_STATUS_LABEL[status] ?? status ?? 'Non renseigné';
}

export {
  INVITATION_DELIVERY_STATUS_LABEL,
  INVITATION_STATUS_LABEL,
  MEMBER_STATUS_LABEL,
  formatInvitationDeliveryStatus,
  formatInvitationStatus,
  formatMemberStatus,
};
