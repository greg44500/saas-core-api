import { useEffect, useMemo, useRef, useState } from 'react';

import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CORE_PERMISSION_LABELS,
  DOMAIN_LABELS,
} from '@/features/workspace-roles/components/permission-list';

const RESERVED_PERMISSIONS = new Set(['workspace:ownership:transfer']);

function groupPermissionOptions(permissions) {
  return permissions.reduce((groups, permission) => {
    const domain = permission.split(':')[0];
    const label = DOMAIN_LABELS[domain] ?? domain;

    if (!groups[label]) groups[label] = [];
    groups[label].push(permission);
    return groups;
  }, {});
}

function RoleFormDrawer({ actorPermissions, mode, onClose, onSubmit, open, pending, role = null }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const presentationRef = useRef({ mode, role });

  /*
   * Le parent réinitialise mode et role dès la demande de fermeture. Leur
   * dernière valeur reste utilisée uniquement pour la présentation pendant la
   * sortie, afin d'éviter que le titre change avant la fin de l'animation.
   */
  if (open) {
    presentationRef.current = { mode, role };
  }

  const displayedMode = open ? mode : presentationRef.current.mode;
  const displayedRole = open ? role : presentationRef.current.role;

  const availablePermissions = useMemo(
    () =>
      [...new Set(actorPermissions ?? [])]
        .filter((permission) => !RESERVED_PERMISSIONS.has(permission))
        .sort(),
    [actorPermissions],
  );

  const groupedOptions = useMemo(
    () => groupPermissionOptions(availablePermissions),
    [availablePermissions],
  );

  useEffect(() => {
    if (!open) return;

    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setSelectedPermissions(role?.permissions ?? []);
  }, [open, role]);

  function togglePermission(permission) {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      permissions: selectedPermissions,
    });
  }

  const editing = displayedMode === 'edit';

  return (
    <EntityDetailsDrawer
      description={
        editing
          ? 'Modifiez uniquement les permissions que vous êtes vous-même autorisé à déléguer.'
          : 'Créez un rôle personnalisé à partir de vos permissions délégables.'
      }
      onClose={onClose}
      open={open}
      title={editing ? `Modifier ${displayedRole?.name ?? 'le rôle'}` : 'Créer un rôle'}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="role-name">
            Nom du rôle
          </label>
          <Input
            id="role-name"
            maxLength={80}
            minLength={2}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="role-description">
            Description
          </label>
          <textarea
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="role-description"
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </div>

        <fieldset className="space-y-5">
          <legend className="text-sm font-semibold">Permissions</legend>
          <p className="text-sm text-muted-foreground">
            Seules vos permissions délégables sont proposées. Le backend revérifie ce périmètre à l’enregistrement.
          </p>

          {Object.entries(groupedOptions).map(([group, permissions]) => (
            <section className="space-y-2" key={group}>
              <h3 className="text-sm font-semibold">{group}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {permissions.map((permission) => (
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm"
                    key={permission}
                  >
                    <input
                      checked={selectedPermissions.includes(permission)}
                      className="mt-1"
                      onChange={() => togglePermission(permission)}
                      type="checkbox"
                    />
                    <span>
                      <span className="block font-medium">
                        {CORE_PERMISSION_LABELS[permission] ?? permission}
                      </span>
                      <span className="block text-xs text-muted-foreground">{permission}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button disabled={pending} onClick={onClose} type="button" variant="outline">
            Annuler
          </Button>
          <Button disabled={pending || name.trim().length < 2} type="submit">
            {pending ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer le rôle'}
          </Button>
        </div>
      </form>
    </EntityDetailsDrawer>
  );
}

export { RESERVED_PERMISSIONS, RoleFormDrawer, groupPermissionOptions };
