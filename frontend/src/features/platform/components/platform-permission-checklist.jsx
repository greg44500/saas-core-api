import { CheckboxField } from '@/components/forms/checkbox-field';
import {
  formatPlatformPermissionSensitivity,
  groupPlatformPermissions,
} from '@/features/platform/lib/platform-permission-catalog';

function PlatformPermissionChecklist({
  disabled = false,
  onToggle,
  permissions,
  selectedKeys,
}) {
  const selected = new Set(selectedKeys ?? []);
  const groups = groupPlatformPermissions(permissions ?? []);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune permission disponible.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <fieldset className="space-y-2" key={group.key}>
          <legend className="text-sm font-semibold text-foreground">
            {group.label}
          </legend>

          <div className="grid gap-2 lg:grid-cols-2">
            {group.permissions.map((permission) => {
              const permissionDisabled = disabled || !permission.assignable;
              const sensitivity = formatPlatformPermissionSensitivity(
                permission.sensitivity,
              );

              return (
                <CheckboxField
                  checked={selected.has(permission.key)}
                  description={`${permission.description} · ${sensitivity}${
                    !permission.assignable ? ' · Non assignable' : ''
                  }`}
                  disabled={permissionDisabled}
                  id={`platform-permission-${permission.key.replaceAll(':', '-')}`}
                  key={permission.key}
                  label={permission.label}
                  onChange={() => onToggle(permission.key)}
                />
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export { PlatformPermissionChecklist };
