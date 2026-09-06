const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;

const invitationDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const invitationRelativeTimeFormatter = new Intl.RelativeTimeFormat('fr-FR', {
  numeric: 'always',
});

function parseInvitationDate(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatInvitationDate(value) {
  const date = parseInvitationDate(value);
  return date ? invitationDateFormatter.format(date) : '—';
}

function formatInvitationRelativeTime(value, { now = new Date() } = {}) {
  const date = parseInvitationDate(value);
  const referenceDate = parseInvitationDate(now);

  if (!date || !referenceDate) return null;

  const differenceMs = date.getTime() - referenceDate.getTime();
  const absoluteDifferenceMs = Math.abs(differenceMs);

  if (absoluteDifferenceMs < MINUTE_IN_MS) {
    return differenceMs >= 0
      ? 'dans moins d’une minute'
      : 'il y a moins d’une minute';
  }

  let unit = 'minute';
  let unitInMs = MINUTE_IN_MS;

  if (absoluteDifferenceMs >= 2 * DAY_IN_MS) {
    unit = 'day';
    unitInMs = DAY_IN_MS;
  } else if (absoluteDifferenceMs >= 2 * HOUR_IN_MS) {
    unit = 'hour';
    unitInMs = HOUR_IN_MS;
  }

  const relativeValue = Math.round(differenceMs / unitInMs);

  return invitationRelativeTimeFormatter.format(
    relativeValue === 0 ? (differenceMs >= 0 ? 1 : -1) : relativeValue,
    unit,
  );
}

function getInvitationAgeLabel(invitation, { now = new Date() } = {}) {
  const relative = formatInvitationRelativeTime(invitation?.createdAt, { now });
  return relative ? `Créée ${relative}` : 'Date de création indisponible';
}

function getInvitationDeliveryTimeLabel(invitation, { now = new Date() } = {}) {
  if (invitation?.deliveryStatus === 'sent') {
    const relative = formatInvitationRelativeTime(
      invitation.deliveredAt ?? invitation.lastDeliveryAttemptAt,
      { now },
    );

    return relative
      ? `Dernier envoi réussi ${relative}`
      : 'Dernier envoi réussi non daté';
  }

  if (invitation?.deliveryStatus === 'failed') {
    const relative = formatInvitationRelativeTime(
      invitation.lastDeliveryAttemptAt,
      { now },
    );

    return relative
      ? `Dernière tentative ${relative}`
      : 'Dernière tentative non datée';
  }

  if (invitation?.deliveryStatus === 'pending') {
    const relative = formatInvitationRelativeTime(
      invitation.lastDeliveryAttemptAt,
      { now },
    );

    return relative
      ? `Dernière tentative ${relative}`
      : 'En attente du premier envoi';
  }

  return 'Historique d’envoi indisponible';
}

function getInvitationExpirationPresentation(
  invitation,
  { now = new Date() } = {},
) {
  const expiresAt = parseInvitationDate(invitation?.expiresAt);
  const referenceDate = parseInvitationDate(now);

  if (!expiresAt || !referenceDate) {
    return {
      absoluteLabel: '—',
      relativeLabel: 'Expiration indisponible',
    };
  }

  const relative = formatInvitationRelativeTime(expiresAt, {
    now: referenceDate,
  });
  const expired = expiresAt.getTime() <= referenceDate.getTime();

  return {
    absoluteLabel: formatInvitationDate(expiresAt),
    relativeLabel: `${expired ? 'Expirée' : 'Expire'} ${relative}`,
  };
}

export {
  formatInvitationDate,
  formatInvitationRelativeTime,
  getInvitationAgeLabel,
  getInvitationDeliveryTimeLabel,
  getInvitationExpirationPresentation,
};
