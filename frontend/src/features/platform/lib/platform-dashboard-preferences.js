import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const PLATFORM_DASHBOARD_WIDGETS = Object.freeze([
  Object.freeze({
    id: 'platform.users',
    label: 'Utilisateurs',
    description: 'Comptes inscrits et évolution des inscriptions.',
    configurable: true,
    sectionKeys: Object.freeze(['users']),
    requiredPermissions: Object.freeze([PLATFORM_PERMISSION.USERS_READ]),
  }),
  Object.freeze({
    id: 'platform.workspaces',
    label: 'Espaces de travail',
    description: 'Workspaces, croissance et signaux associés.',
    configurable: true,
    sectionKeys: Object.freeze(['workspaces']),
    requiredPermissions: Object.freeze([PLATFORM_PERMISSION.WORKSPACES_READ]),
  }),
  Object.freeze({
    id: 'platform.plans',
    label: 'Répartition par plan',
    description: 'Répartition des workspaces par plan effectivement appliqué.',
    configurable: true,
    sectionKeys: Object.freeze(['plans']),
    requiredPermissions: Object.freeze([
      PLATFORM_PERMISSION.PLANS_READ,
      PLATFORM_PERMISSION.WORKSPACES_READ,
    ]),
  }),
  Object.freeze({
    id: 'platform.subscriptions',
    label: 'Abonnements',
    description: 'Abonnements, valeur contractuelle et échéances associées.',
    configurable: true,
    sectionKeys: Object.freeze(['subscriptions']),
    requiredPermissions: Object.freeze([PLATFORM_PERMISSION.SUBSCRIPTIONS_READ]),
  }),
  Object.freeze({
    id: 'platform.overrides',
    label: 'Dérogations de droits',
    description: 'Dérogations actives, programmées et arrivant à échéance.',
    configurable: true,
    sectionKeys: Object.freeze(['overrides']),
    requiredPermissions: Object.freeze([
      PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_READ,
    ]),
  }),
  Object.freeze({
    id: 'platform.usage',
    label: 'Usage et fichiers',
    description: 'Consommation fonctionnelle, fichiers actifs et stockage.',
    configurable: true,
    sectionKeys: Object.freeze(['usage', 'files']),
    requiredPermissions: Object.freeze([PLATFORM_PERMISSION.WORKSPACES_READ]),
  }),
  Object.freeze({
    id: 'platform.audit',
    label: 'Audit et signaux associés',
    description: 'Événements d’audit et alertes administratives associées.',
    configurable: true,
    sectionKeys: Object.freeze(['audit']),
    requiredPermissions: Object.freeze([PLATFORM_PERMISSION.AUDIT_LOGS_READ]),
  }),
  Object.freeze({
    id: 'platform.team',
    label: 'Équipe de la Plateforme',
    description: 'Effectif interne, statuts d’accès et répartition par rôle.',
    configurable: true,
    sectionKeys: Object.freeze([]),
    requiredPermissions: Object.freeze([PLATFORM_PERMISSION.TEAM_READ]),
  }),
]);

function getAccessiblePlatformDashboardWidgets(widgets, permissions = []) {
  const grantedPermissions = new Set(permissions);

  return widgets.filter((widget) => (
    (widget.requiredPermissions ?? [])
      .every((permission) => grantedPermissions.has(permission))
  ));
}

function getHiddenPlatformSectionKeys(hiddenWidgetIds = []) {
  const hiddenIds = new Set(hiddenWidgetIds);

  return new Set(
    PLATFORM_DASHBOARD_WIDGETS
      .filter((widget) => hiddenIds.has(widget.id))
      .flatMap((widget) => widget.sectionKeys),
  );
}

function applyPlatformDashboardPreferences(overview, hiddenWidgetIds = []) {
  if (!overview?.availableSections) return overview;

  const hiddenSectionKeys = getHiddenPlatformSectionKeys(hiddenWidgetIds);

  return {
    ...overview,
    availableSections: Object.fromEntries(
      Object.entries(overview.availableSections).map(([key, isAvailable]) => [
        key,
        isAvailable === true && !hiddenSectionKeys.has(key),
      ]),
    ),
  };
}

function isPlatformDashboardWidgetVisible(widgetId, hiddenWidgetIds = []) {
  return !new Set(hiddenWidgetIds).has(widgetId);
}

export {
  PLATFORM_DASHBOARD_WIDGETS,
  applyPlatformDashboardPreferences,
  getAccessiblePlatformDashboardWidgets,
  getHiddenPlatformSectionKeys,
  isPlatformDashboardWidgetVisible,
};
