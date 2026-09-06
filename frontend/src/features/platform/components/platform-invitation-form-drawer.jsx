import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { FormField } from '@/components/forms/form-field';
import { SelectField } from '@/components/forms/select-field';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCreatePlatformTeamInvitationMutation,
} from '@/features/platform/api/platform-invitations-api';
import { useListPlatformRolesQuery } from '@/features/platform/api/platform-roles-api';
import {
  getAssignablePlatformRoles,
} from '@/features/platform/lib/platform-team-authorization';

const platformInvitationFormSchema = z.strictObject({
  firstName: z.string().trim().min(1, 'Le prénom est requis.').max(100),
  lastName: z.string().trim().min(1, 'Le nom est requis.').max(100),
  email: z.string().trim().email('Saisissez une adresse email valide.').max(254),
  roleId: z.string().regex(/^[a-f\d]{24}$/i, 'Choisissez un rôle valide.'),
});

const EMPTY_FORM = Object.freeze({
  firstName: '',
  lastName: '',
  email: '',
  roleId: '',
});

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function PlatformInvitationFormDrawer({
  onClose,
  open,
  platformAccess,
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const rolesQuery = useListPlatformRolesQuery(
    { page: 1, limit: 100, status: 'active' },
    { skip: !open },
  );
  const [createInvitation, createState] =
    useCreatePlatformTeamInvitationMutation();

  const assignableRoles = useMemo(
    () => getAssignablePlatformRoles({
      currentRoleId: null,
      platformAccess,
      roles: rolesQuery.data?.roles ?? [],
    }),
    [platformAccess, rolesQuery.data?.roles],
  );

  const roleOptions = assignableRoles.map((role) => ({
    value: role.id,
    label: role.name,
  }));

  useEffect(() => {
    if (open) return;

    setForm(EMPTY_FORM);
    setFieldErrors({});
    setSubmitError(null);
  }, [open]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setSubmitError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = platformInvitationFormSchema.safeParse(form);

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

    try {
      await createInvitation(parsed.data).unwrap();
      toast({
        title: 'Invitation envoyée',
        description: `${parsed.data.firstName} ${parsed.data.lastName} a été invité à rejoindre l’équipe de la Plateforme.`,
        variant: 'success',
      });
      onClose();
    } catch (error) {
      setSubmitError(getApiMessage(
        error,
        'Impossible d’envoyer cette invitation pour le moment.',
      ));
    }
  }

  return (
    <EntityDetailsDrawer
      description="Invitez un collaborateur interne avec un rôle autorisé par votre propre niveau d’accès."
      onClose={onClose}
      open={open}
      title="Inviter un membre"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            error={fieldErrors.firstName}
            id="platform-invitation-first-name"
            label="Prénom"
          >
            <Input
              aria-describedby={fieldErrors.firstName
                ? 'platform-invitation-first-name-message'
                : undefined}
              aria-invalid={fieldErrors.firstName ? 'true' : undefined}
              autoComplete="given-name"
              id="platform-invitation-first-name"
              maxLength={100}
              onChange={(event) => updateField('firstName', event.target.value)}
              value={form.firstName}
            />
          </FormField>

          <FormField
            error={fieldErrors.lastName}
            id="platform-invitation-last-name"
            label="Nom"
          >
            <Input
              aria-describedby={fieldErrors.lastName
                ? 'platform-invitation-last-name-message'
                : undefined}
              aria-invalid={fieldErrors.lastName ? 'true' : undefined}
              autoComplete="family-name"
              id="platform-invitation-last-name"
              maxLength={100}
              onChange={(event) => updateField('lastName', event.target.value)}
              value={form.lastName}
            />
          </FormField>
        </div>

        <FormField
          error={fieldErrors.email}
          hint="L’invitation sera envoyée à cette adresse précise."
          id="platform-invitation-email"
          label="Adresse email"
        >
          <Input
            aria-describedby="platform-invitation-email-message"
            aria-invalid={fieldErrors.email ? 'true' : undefined}
            autoComplete="email"
            id="platform-invitation-email"
            maxLength={254}
            onChange={(event) => updateField('email', event.target.value)}
            type="email"
            value={form.email}
          />
        </FormField>

        <SelectField
          disabled={rolesQuery.isLoading || roleOptions.length === 0}
          error={fieldErrors.roleId}
          hint={roleOptions.length === 0 && !rolesQuery.isLoading
            ? 'Aucun rôle assignable avec votre niveau d’accès actuel.'
            : 'Le backend revalidera la hiérarchie des permissions au moment de l’invitation.'}
          id="platform-invitation-role"
          label="Rôle prévu"
          onChange={(event) => updateField('roleId', event.target.value)}
          options={roleOptions}
          value={form.roleId}
        />

        {rolesQuery.isError && (
          <p className="text-sm text-destructive" role="alert">
            Impossible de charger les rôles assignables.
          </p>
        )}

        {submitError && (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            disabled={createState.isLoading}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Annuler
          </Button>
          <Button
            disabled={
              createState.isLoading
              || rolesQuery.isLoading
              || roleOptions.length === 0
            }
            type="submit"
          >
            {createState.isLoading ? 'Envoi…' : 'Envoyer l’invitation'}
          </Button>
        </div>
      </form>
    </EntityDetailsDrawer>
  );
}

export {
  PlatformInvitationFormDrawer,
  platformInvitationFormSchema,
};
