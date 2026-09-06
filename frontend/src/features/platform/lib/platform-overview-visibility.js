const OVERVIEW_SECTION_KEYS = Object.freeze([
  'users',
  'workspaces',
  'plans',
  'subscriptions',
  'overrides',
  'usage',
  'files',
  'audit',
]);

function resolvePlatformOverviewVisibility(availableSections) {
  const source = availableSections && typeof availableSections === 'object'
    ? availableSections
    : {};

  return Object.fromEntries(
    OVERVIEW_SECTION_KEYS.map((key) => [key, source[key] === true]),
  );
}

function hasAnyPlatformOverviewSection(sections) {
  return OVERVIEW_SECTION_KEYS.some((key) => sections?.[key] === true);
}

function buildPlatformOverviewAttentionItems({ attention, sections }) {
  const items = [];

  if (sections?.subscriptions) {
    items.push(
      {
        key: 'past-due',
        label: 'Abonnements en retard',
        value: attention?.counts?.pastDueSubscriptions ?? 0,
        tone: 'warning',
      },
      {
        key: 'trials-expiring',
        label: 'Essais arrivant à échéance',
        value: attention?.counts?.trialsExpiringNext7Days ?? 0,
        tone: 'warning',
      },
    );
  }

  if (sections?.workspaces) {
    items.push({
      key: 'suspended-workspaces',
      label: 'Espaces de travail suspendus',
      value: attention?.counts?.suspendedWorkspaces ?? 0,
      tone: 'warning',
    });
  }

  if (sections?.overrides) {
    items.push({
      key: 'overrides-expiring',
      label: 'Dérogations arrivant à échéance',
      value: attention?.counts?.overridesExpiringNext7Days ?? 0,
      tone: 'warning',
    });
  }

  if (sections?.audit) {
    items.push({
      key: 'failed-audits',
      label: 'Audits en échec',
      value: attention?.counts?.failedAuditEvents ?? 0,
      tone: 'warning',
    });
  }

  return items;
}

export {
  OVERVIEW_SECTION_KEYS,
  buildPlatformOverviewAttentionItems,
  hasAnyPlatformOverviewSection,
  resolvePlatformOverviewVisibility,
};
