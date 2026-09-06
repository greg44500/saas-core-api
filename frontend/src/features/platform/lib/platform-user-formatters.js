const PLATFORM_USER_STATUS_LABEL = Object.freeze({
  active: 'Actif',
  disabled: 'Désactivé',
  deletion_requested: 'Clôture demandée',
  closed: 'Clôturé',
});

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatPlatformUserStatus(status) {
  return PLATFORM_USER_STATUS_LABEL[status] ?? status ?? '—';
}

function formatPlatformUserDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return dateTimeFormatter.format(date);
}

function formatPlatformUserName(user) {
  if (!user) return 'Utilisateur';

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user.email || 'Utilisateur';
}

export {
  formatPlatformUserDate,
  formatPlatformUserName,
  formatPlatformUserStatus,
};
