function toLabelMap(items) {
  return new Map(
    (Array.isArray(items) ? items : [])
      .filter((item) => item?.value && item?.label)
      .map((item) => [item.value, item.label]),
  );
}

function createAuditMetadataLabelMaps(metadata) {
  return {
    actions: toLabelMap(metadata?.actions),
    entityTypes: toLabelMap(metadata?.entityTypes),
    statuses: toLabelMap(metadata?.statuses),
  };
}

function getAuditActionLabel(action, labelMaps) {
  return labelMaps?.actions?.get(action) ?? 'Action inconnue';
}

function getAuditEntityTypeLabel(entityType, labelMaps) {
  return labelMaps?.entityTypes?.get(entityType) ?? 'Ressource inconnue';
}

function getAuditStatusLabel(status, labelMaps) {
  return labelMaps?.statuses?.get(status) ?? 'Statut inconnu';
}

function getAuditActorLabel(actor) {
  if (!actor) return 'Système';

  const fullName = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim();
  return fullName || actor.email || 'Utilisateur';
}

function formatAuditAbsoluteDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatAuditRelativeDate(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  const differenceInSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absoluteDifference = Math.abs(differenceInSeconds);

  if (absoluteDifference < 45) return 'À l’instant';

  const units = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];

  const [unit, secondsPerUnit] = units.find(([, seconds]) => absoluteDifference >= seconds) ?? [
    'second',
    1,
  ];

  return new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' }).format(
    Math.round(differenceInSeconds / secondsPerUnit),
    unit,
  );
}

function dateInputToIsoBoundary(value, boundary) {
  if (!value) return undefined;

  const time = boundary === 'end' ? '23:59:59.999' : '00:00:00.000';
  const date = new Date(`${value}T${time}`);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export {
  createAuditMetadataLabelMaps,
  dateInputToIsoBoundary,
  formatAuditAbsoluteDate,
  formatAuditRelativeDate,
  getAuditActionLabel,
  getAuditActorLabel,
  getAuditEntityTypeLabel,
  getAuditStatusLabel,
  toLabelMap,
};
