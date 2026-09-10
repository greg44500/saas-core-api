import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const PLATFORM_DASHBOARD_WIDGETS = Object.freeze([
  Object.freeze({
    id: 'platform.users',
    label: 'Utilisateurs',
    description: 'Nombre de comptes et évolution des inscriptions.',
    configurable: true,
    requiredSections: Object.freeze(['users']),
  }),
  Object.freeze({
    id: 'platform.workspaces',
    label: 'Espaces de travail',
    description: 'Nombre de workspaces et évolution des créations.',
    configurable: true,
    requiredSections: Object.freeze(['workspaces']),
  }),
  Object.freeze({
    id: 'platform.subscriptions',
    label: 'Abonnements',
    description: 'Abonnements actifs et valeur mensuelle contractuelle estimée.',
    configurable: true,
    requiredSections: Object.freeze(['subscriptions']),
  }),
  Object.freeze({
    id: 'platform.growth',
    label: 'Croissance de la plateforme',
    description: 'Comparaison des créations avec la période précédente.',
    configurable: true,
    anySections: Object.freeze(['users', 'workspaces']),
  }),
  Object.freeze({
    id: 'platform.plan-distribution',
    label: 'Répartition par plan',
    description: 'Répartition des workspaces par plan effectivement appliqué.',
    configurable: true,
    requiredSections: Object.freeze(['plans']),
  }),
  Object.freeze({
    id: 'platform.team',
    label: 'Équipe de la Plateforme',
    description: 'Effectif interne, statuts d’accès et répartition par rôle.',
    configurable: true,
    requiredPermissions: Object.freeze([PLATFORM_PERMISSION.TEAM_READ]),
  }),
  Object.freeze({
    id: 'platform.usage',
    label: 'Usage de la plateforme',
    description: 'Consommation fonctionnelle et stockage des fichiers.',
    configurable: true,
    anySections: Object.freeze(['usage', 'files']),
  }),
  Object.freeze({
    id: 'platform.commercial-health',
    label: 'Échéances et exceptions',
    description: 'Échéances commerciales et dérogations de droits.',
    configurable: true,
    anySections: Object.freeze(['subscriptions', 'overrides']),
  }),
  Object.freeze({
    id: 'platform.attention',
    label: 'Points nécessitant une attention',
    description: 'Signaux administratifs nécessitant une vérification.',
    configurable: true,
    anySections: Object.freeze([
      'subscriptions',
      'workspaces',
      'overrides',
      'audit',
    ]),
  }),
]);

function getAccessiblePlatformDashboardWidgets(
  widgets,
  { sections, permissions = [] },
) {
  const grantedPermissions = new Set(permissions);

  return widgets.filter((widget) => {
    const requiredSections = widget.requiredSections ?? [];
    const anySections = widget.anySections ?? [];
    const requiredPermissions = widget.requiredPermissions ?? [];

    return requiredSections.every((section) => sections?.[section] === true)
      && (anySections.length === 0
        || anySections.some((section) => sections?.[section] === true))
      && requiredPermissions.every((permission) => grantedPermissions.has(permission));
  });
}

function getVisiblePlatformDashboardWidgetIds(
  accessibleWidgets,
  hiddenWidgetIds = [],
) {
  const hiddenIds = new Set(hiddenWidgetIds);

  return new Set(
    accessibleWidgets
      .filter((widget) => !hiddenIds.has(widget.id))
      .map((widget) => widget.id),
  );
}

export {
  PLATFORM_DASHBOARD_WIDGETS,
  getAccessiblePlatformDashboardWidgets,
  getVisiblePlatformDashboardWidgetIds,
};
