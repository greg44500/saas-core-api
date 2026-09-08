import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const platformNavigationSections = Object.freeze([
  Object.freeze({
    type: 'item',
    id: 'overview',
    label: 'Vue d’ensemble',
    to: '/platform/overview',
    permission: PLATFORM_PERMISSION.OVERVIEW_READ,
  }),
  Object.freeze({
    type: 'group',
    id: 'clients',
    label: 'Gestion clients',
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
    type: 'group',
    id: 'commercial',
    label: 'Offre commerciale',
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
        id: 'commercial-invitations',
        label: 'Invitations commerciales',
        to: '/platform/commercial-invitations',
        permission: PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_READ,
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
    type: 'group',
    id: 'platform-team',
    label: 'Équipe Platform',
    items: Object.freeze([
      Object.freeze({
        id: 'team',
        label: 'Gestion des membres',
        to: '/platform/team',
        anyPermission: Object.freeze([
          PLATFORM_PERMISSION.TEAM_READ,
          PLATFORM_PERMISSION.ROLES_READ,
        ]),
      }),
    ]),
  }),
  Object.freeze({
    type: 'group',
    id: 'security-data',
    label: 'Sécurité & données',
    items: Object.freeze([
      Object.freeze({
        id: 'audit-logs',
        label: 'Journaux d’audit',
        to: '/platform/audit-logs',
        permission: PLATFORM_PERMISSION.AUDIT_LOGS_READ,
      }),
      Object.freeze({
        id: 'retention',
        label: 'Rétention & purge',
        to: '/platform/retention',
        permission: PLATFORM_PERMISSION.RETENTION_READ,
      }),
    ]),
  }),
]);

const platformNavigationItems = Object.freeze(
  platformNavigationSections.flatMap((entry) => (
    entry.type === 'group' ? entry.items : [entry]
  )),
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

  return platformNavigationSections.flatMap((entry) => {
    if (entry.type !== 'group') {
      return canDisplayPlatformNavigationItem(entry, permissionSet)
        ? [entry]
        : [];
    }

    const items = entry.items.filter((item) => (
      canDisplayPlatformNavigationItem(item, permissionSet)
    ));

    return items.length > 0 ? [{ ...entry, items }] : [];
  });
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

  const entries = getVisiblePlatformNavigationSections(
    platformAccess.permissions,
  );
  const firstEntry = entries[0];

  return firstEntry?.type === 'group'
    ? firstEntry.items[0]?.to ?? null
    : firstEntry?.to ?? null;
}

function getPlatformNavigationItemForPath(pathname) {
  if (typeof pathname !== 'string' || pathname.length === 0) {
    return null;
  }

  const normalizedPathname = pathname.length > 1
    ? pathname.replace(/\/+$/, '')
    : pathname;

  return platformNavigationItems.find(({ to }) => (
    normalizedPathname === to
    || normalizedPathname.startsWith(`${to}/`)
  )) ?? null;
}

function getActivePlatformNavigationGroupId(navigation, pathname) {
  const activeItem = getPlatformNavigationItemForPath(pathname);
  if (!activeItem) return null;

  return navigation.find((entry) => (
    entry.type === 'group'
    && entry.items.some((item) => item.id === activeItem.id)
  ))?.id ?? null;
}

function canAccessPlatformPath(pathname, platformAccess) {
  if (!hasActivePlatformAccess(platformAccess)) {
    return false;
  }

  const navigationItem = getPlatformNavigationItemForPath(pathname);

  if (!navigationItem) {
    // Les routes Platform ajoutées par une application dérivée ne sont pas
    // connues du registre de navigation Core. Leur autorisation fine reste à
    // la charge du module d'extension, tandis que ce guard impose au minimum
    // une appartenance Platform active.
    return true;
  }

  return canDisplayPlatformNavigationItem(
    navigationItem,
    new Set(platformAccess.permissions),
  );
}

export {
  canAccessPlatformPath,
  canDisplayPlatformNavigationItem,
  getActivePlatformNavigationGroupId,
  getFirstPlatformDestination,
  getPlatformNavigationItemForPath,
  getVisiblePlatformNavigationSections,
  hasActivePlatformAccess,
  platformNavigationItems,
  platformNavigationSections,
};
