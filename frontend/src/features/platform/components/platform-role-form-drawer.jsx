import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { FormField } from '@/components/forms/form-field';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreatePlatformRoleMutation,
  useGetPlatformRolePermissionCatalogQuery,
  useUpdatePlatformRoleMutation,
} from '@/features/platform/api/platform-roles-api';
import { PlatformPermissionChecklist } from '@/features/platform/components/platform-permission-checklist';
import {
  isStrictPermissionSubset,
  isSuperAdminAuthorization,
} from '@/features/platform/lib/platform-team-authorization';

const PLATFORM_PERMISSION_PATTERN =
  /^platform:[a-z0-9_]+(?::[a-z0-9_]+)+$/;

const platformRoleFormSchema = z.strictObject({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(100),
  description: z.string().trim().max(500, 'La description ne peut pas dépasser 500 caractères.'),
  permissions: z
    .array(z.string().regex(PLATFORM_PERMISSION_PATTERN))
    .max(200)
    .refine(
      (permissions) => new Set(permissions).size === permissions.length,
      'Une permission ne peut pas être sélectionnée plusieurs fois.',
    ),
});

const EMPTY_FORM = Object.freeze({
  name: '',
  description: '',
  permissions: [],
});

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function PlatformRoleFormDrawer({
  mode = 'create',
  onClose,
  open,
  platformAccess,
  role = null,
}) {
  const isEdit = mode === 'edit';
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const catalogQuery = useGetPlatformRolePermissionCatalogQuery(undefined, {
    skip: !open,
  });
  const [createRole, createState] = useCreatePlatformRoleMutation();
  const [updateRole, updateState] = useUpdatePlatformRoleMutation();
  const mutationPending = createState.isLoading || updateState.isLoading;

  const catalog = catalogQuery.data ?? [];
  const catalogByKey = useMemo(
    () => new Map(catalog.map((permission) => [permission.key, permission])),
    [catalog],
  );
  const assignablePermissions = useMemo(
    () => catalog.filter((permission) => permission.assignable),
    [catalog],
  );

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setSubmitError(null);
      return;
    }

    if (isEdit && role) {
      setForm({
        name: role.name ?? '',
        description: role.description ?? '',
        permissions: [...(role.permissions ?? [])],
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setFieldErrors({});
    setSubmitError(null);
  }, [isEdit, open, role]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
  }

  function togglePermission(permissionKey) {
    const definition = catalogByKey.get(permissionKey);
    if (!definition?.assignable) return;

    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permissionKey)
        ? current.permissions.filter((key) => key !== permissionKey)
        : [...current.permissions, permissionKey],
    }));
    setFieldErrors((current) => ({
      ...current,
      permissions: undefined,
    }));
    setSubmitError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = platformRoleFormSchema.safeParse(form);

    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors(Object.fromEntries(
        Object.entries(flattened).map(([key, messages]) => [
          key,
          messages?.[0],
        ]),
      ));
      return;
    }

    const containsNonAssignablePermission = parsed.data.permissions.some(
      (key) => !catalogByKey.get(key)?.assignable,
    );

    if (containsNonAssignablePermission) {
      setFieldErrors((current) => ({
        ...current,
        permissions:
          'Une permission sélectionnée n’est plus assignable avec votre niveau d’accès actuel.',
      }));
      return;
    }

    if (
      !isSuperAdminAuthorization(platformAccess)
      && !isStrictPermissionSubset(
        parsed.data.permissions,
        platformAccess?.permissions ?? [],
      )
    ) {
      setFieldErrors((current) => ({
        ...current,
        permissions:
          'Un rôle personnalisé doit conserver des droits strictement inférieurs aux vôtres.',
      }));
      return;
    }

    const body = {
      name: parsed.data.name,
      description: parsed.data.description || null,
      permissions: parsed.data.permissions,
    };

    try {
      if (isEdit) {
        await updateRole({ roleId: role.id, body }).unwrap();
        toast({
          title: 'Rôle modifié',
          description: `Le rôle ${body.name} a été mis à jour.`,
          variant: 'success',
        });
      } else {
        await createRole(body).unwrap();
        toast({
          title: 'Rôle créé',
          description: `Le rôle ${body.name} est maintenant disponible.`,
          variant: 'success',
        });
      }

      onClose();
    } catch (error) {
      setSubmitError(getApiMessage(
        error,
        isEdit
          ? 'Impossible de modifier ce rôle.'
          : 'Impossible de créer ce rôle.',
      ));
    }
  }

  return (
    <EntityDetailsDrawer
      description={isEdit
        ? 'Modifiez uniquement le nom, la description et les permissions autorisées. La clé technique reste immuable.'
        : 'Créez un rôle personnalisé à partir du catalogue de permissions autorisées.'}
      onClose={onClose}
      open={open}
      title={isEdit ? 'Modifier le rôle' : 'Créer un rôle'}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <FormField
          error={fieldErrors.name}
          id="platform-role-name"
          label="Nom du rôle"
        >
          <Input
            aria-describedby={fieldErrors.name ? 'platform-role-name-message' : undefined}
            aria-invalid={fieldErrors.name ? 'true' : undefined}
            id="platform-role-name"
            maxLength={100}
            onChange={(event) => updateField('name', event.target.value)}
            value={form.name}
          />
        </FormField>

        <FormField
          error={fieldErrors.description}
          hint="Décrivez clairement la mission de ce rôle pour faciliter son attribution."
          id="platform-role-description"
          label="Description"
        >
          <Textarea
            aria-describedby="platform-role-description-message"
            aria-invalid={fieldErrors.description ? 'true' : undefined}
            id="platform-role-description"
            maxLength={500}
            onChange={(event) => updateField('description', event.target.value)}
            value={form.description}
          />
        </FormField>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Permissions
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Seules les permissions que vous êtes autorisé à déléguer sont proposées.
            </p>
          </div>

          {catalogQuery.isLoading && (
            <p className="text-sm text-muted-foreground">
              Chargement du catalogue…
            </p>
          )}

          {catalogQuery.isError && (
            <p className="text-sm text-destructive" role="alert">
              Impossible de charger le catalogue des permissions.
            </p>
          )}

          {!catalogQuery.isLoading && !catalogQuery.isError && (
            <PlatformPermissionChecklist
              disabled={mutationPending}
              onToggle={togglePermission}
              permissions={assignablePermissions}
              selectedKeys={form.permissions}
            />
          )}

          {fieldErrors.permissions && (
            <p className="text-sm text-destructive" role="alert">
              {fieldErrors.permissions}
            </p>
          )}
        </div>

        {submitError && (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            disabled={mutationPending}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Annuler
          </Button>
          <Button
            disabled={mutationPending || catalogQuery.isLoading || catalogQuery.isError}
            type="submit"
          >
            {mutationPending
              ? 'Enregistrement…'
              : isEdit
                ? 'Enregistrer les modifications'
                : 'Créer le rôle'}
          </Button>
        </div>
      </form>
    </EntityDetailsDrawer>
  );
}

export {
  PlatformRoleFormDrawer,
  platformRoleFormSchema,
};
