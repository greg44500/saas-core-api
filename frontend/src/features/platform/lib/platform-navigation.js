import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const platformNavigationSections = Object.freeze([
  Object.freeze({
    id: 'pilotage',
    label: 'Pilotage',
    items: Object.freeze([
      Object.freeze({
        id: 'overview',
        label: 'Vue d’ensemble',
        to: '/platform/overview',
        permission: PLATFORM_PERMISSION.OVERVIEW_READ,
      }),
    ]),
  }),
  Object.freeze({
    id: 'clients',
    label: 'Clients',
    items: Object.freeze([
      Object.freeze({
        id: 'users',
        label: 'Utilisateurs',
        to: '/platform/users',
        permission: PLATFORM_PERMISSION.USERS_READ,
      }),
      Object.freeze({
        id: 'workspaces',
        label: 'Espaces de travail',
        to: '/platform/workspaces',
        permission: PLATFORM_PERMISSION.WORKSPACES_READ,
      }),
    ]),
  }),
  Object.freeze({
    id: 'commercial',
    label: 'Commercial',
    items: Object.freeze([
      Object.freeze({
        id: 'plans',
        label: 'Plans',
        to: '/platform/plans',
        permission: PLATFORM_PERMISSION.PLANS_READ,
      }),
      Object.freeze({
        id: 'subscriptions',
        label: 'Abonnements',
        to: '/platform/subscriptions',
        permission: PLATFORM_PERMISSION.SUBSCRIPTIONS_READ,
      }),
      Object.freeze({
        id: 'entitlement-overrides',
        label: 'Dérogations',
        to: '/platform/entitlement-overrides',
        permission: PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_READ,
      }),
    ]),
  }),
  Object.freeze({
    id: 'organisation',
    label: 'Organisation',
    items: Object.freeze([
      Object.freeze({
        id: 'team',
        label: 'Équipe de la Plateforme',
        to: '/platform/team',
        anyPermission: Object.freeze([
          PLATFORM_PERMISSION.TEAM_READ,
          PLATFORM_PERMISSION.ROLES_READ,
        ]),
      }),
    ]),
  }),
  Object.freeze({
    id: 'supervision',
    label: 'Supervision',
    items: Object.freeze([
      Object.freeze({
        id: 'audit-logs',
        label: 'Journaux d’audit',
        to: '/platform/audit-logs',
        permission: PLATFORM_PERMISSION.AUDIT_LOGS_READ,
      }),
    ]),
  }),
]);

const platformNavigationItems = Object.freeze(
  platformNavigationSections.flatMap((section) => section.items),
);

function canDisplayPlatformNavigationItem(item, permissionSet) {
  if (item.permission) {
    return permissionSet.has(item.permission);
  }

  if (Array.isArray(item.anyPermission)) {
    return item.anyPermission.some((permission) => permissionSet.has(permission));
  }

  return false;
}

function getVisiblePlatformNavigationSections(permissions) {
  const permissionSet = new Set(permissions ?? []);

  return platformNavigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => (
        canDisplayPlatformNavigationItem(item, permissionSet)
      )),
    }))
    .filter((section) => section.items.length > 0);
}

function hasActivePlatformAccess(platformAccess) {
  return platformAccess?.status === 'active'
    && Array.isArray(platformAccess.permissions)
    && platformAccess.permissions.length > 0;
}

function getFirstPlatformDestination(platformAccess) {
  if (!hasActivePlatformAccess(platformAccess)) {
    return null;
  }

  const sections = getVisiblePlatformNavigationSections(
    platformAccess.permissions,
  );

  return sections[0]?.items?.[0]?.to ?? null;
}

export {
  canDisplayPlatformNavigationItem,
  getFirstPlatformDestination,
  getVisiblePlatformNavigationSections,
  hasActivePlatformAccess,
  platformNavigationItems,
  platformNavigationSections,
};
