const PLATFORM_PERMISSION_SENSITIVITY_LABEL = Object.freeze({
  delegable: 'Déléguable',
  sensitive: 'Sensible',
  reserved: 'Réservée',
});

function groupPlatformPermissions(permissions = []) {
  const groups = new Map();

  for (const permission of permissions) {
    const key = permission.category ?? 'other';

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: permission.categoryLabel ?? 'Autres',
        permissions: [],
      });
    }

    groups.get(key).permissions.push(permission);
  }

  return [...groups.values()];
}

function formatPlatformPermissionSensitivity(value) {
  return PLATFORM_PERMISSION_SENSITIVITY_LABEL[value] ?? value ?? '—';
}

export {
  PLATFORM_PERMISSION_SENSITIVITY_LABEL,
  formatPlatformPermissionSensitivity,
  groupPlatformPermissions,
};
