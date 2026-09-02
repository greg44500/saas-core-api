const WORKSPACE_STATUS_LABEL = Object.freeze({
  active: 'Actif',
  suspended: 'Suspendu',
  archived: 'Archivé',
});

function formatWorkspaceStatus(status) {
  return WORKSPACE_STATUS_LABEL[status] ?? status ?? 'Non renseigné';
}

function formatDashboardCount(value) {
  if (!Number.isFinite(value) || value < 0) return '—';
  return new Intl.NumberFormat('fr-FR').format(value);
}

export {
  WORKSPACE_STATUS_LABEL,
  formatDashboardCount,
  formatWorkspaceStatus,
};
