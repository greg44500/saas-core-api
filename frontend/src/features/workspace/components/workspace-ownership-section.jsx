import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { FormField } from '@/components/forms/form-field';
import { FormSectionSkeleton } from '@/components/shared/form-section-skeleton';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useListWorkspaceMembersQuery } from '@/features/workspace-members/api/workspace-members-api';
import { useListWorkspaceRolesQuery } from '@/features/workspace-roles/api/workspace-roles-api';
import { useTransferWorkspaceOwnershipMutation } from '@/features/workspace/api/workspace-api';
import { getWorkspaceApiErrorMessage } from '@/features/workspace/lib/get-workspace-api-error-message';
import { transferWorkspaceOwnershipSchema } from '@/features/workspace/validation/workspace-schemas';

const MEMBERS_PAGE_SIZE = 20;
const EMPTY_MEMBER_VALUE = '__no_member__';
const EMPTY_ROLE_VALUE = '__no_role__';

function formatAuthorizationExpiry(value) {
  if (!value) return 'une date inconnue';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'une date inconnue';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/**
 * Orchestre le transfert d'ownership d'un workspace comme opération sensible.
 *
 * Cette surface n'est rendue que lorsque le backend confirme une autorisation
 * exceptionnelle active. Cette visibilité améliore l'UX mais ne constitue pas
 * une frontière de sécurité : le service backend revalide et consomme la même
 * autorisation atomiquement au moment du transfert.
 */
function WorkspaceOwnershipSection({ authorization, workspaceId }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [membersPage, setMembersPage] = useState(1);
  const [consequencesConfirmed, setConsequencesConfirmed] = useState(false);
  const {
    data: membersData,
    isError: isMembersError,
    isFetching: isMembersFetching,
  } = useListWorkspaceMembersQuery({
    workspaceId,
    page: membersPage,
    limit: MEMBERS_PAGE_SIZE,
  });
  const {
    data: rolesData,
    isError: isRolesError,
    isFetching: isRolesFetching,
  } = useListWorkspaceRolesQuery(workspaceId);
  const [transferWorkspaceOwnership, { isLoading: isTransferring }] =
    useTransferWorkspaceOwnershipMutation();
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    resetField,
    setError,
  } = useForm({
    resolver: zodResolver(transferWorkspaceOwnershipSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      newOwnerMemberId: '',
      previousOwnerRoleId: '',
      currentPassword: '',
    },
  });

  const members = membersData?.members ?? [];
  const roles = rolesData ?? [];
  const pagination = membersData?.pagination;
  const candidateMembers = useMemo(
    () =>
      members.filter(
        (member) => member.status === 'active' && member.role?.key !== 'owner',
      ),
    [members],
  );
  const replacementRoles = useMemo(
    () => roles.filter((role) => role.key !== 'owner'),
    [roles],
  );

  const isReferenceDataLoading = isMembersFetching || isRolesFetching;
  const isInitialReferenceDataLoading = (
    isMembersFetching && membersData === undefined
  ) || (
    isRolesFetching && rolesData === undefined
  );
  const isReferenceDataError = isMembersError || isRolesError;

  const onSubmit = async (values) => {
    try {
      await transferWorkspaceOwnership({
        workspaceId,
        ...values,
      }).unwrap();

      toast({
        title: 'Propriété du workspace transférée',
        description: 'Les rôles et permissions ont été recalculés.',
        variant: 'success',
      });
      navigate(`/workspaces/${workspaceId}/dashboard`, { replace: true });
    } catch (error) {
      resetField('currentPassword');
      setError('root.server', {
        type: 'server',
        message: getWorkspaceApiErrorMessage(
          error,
          'Impossible de transférer la propriété du workspace pour le moment.',
        ),
      });
    }
  };

  if (isInitialReferenceDataLoading) {
    return (
      <FormSectionSkeleton
        fields={3}
        label="Chargement des données nécessaires au transfert de propriété…"
        variant="sensitive"
      />
    );
  }

  return (
    <section className="space-y-5 rounded-xl border border-destructive/40 bg-card p-6 text-card-foreground">
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">Opération sensible</p>
        <h2 className="text-lg font-semibold">Transférer la propriété</h2>
        <p className="text-sm font-medium">
          Autorisation exceptionnelle active jusqu’au {formatAuthorizationExpiry(authorization?.expiresAt)}.
        </p>
        <p className="text-sm text-muted-foreground">
          Le nouveau propriétaire recevra le rôle owner. Votre rôle sera remplacé par celui que vous choisissez ci-dessous et vos permissions seront recalculées par le backend. Cette autorisation est valable pour un seul transfert réussi.
        </p>
      </div>

      {isReferenceDataError ? (
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger les membres ou les rôles nécessaires au transfert.
        </p>
      ) : (
        <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
          <FormField
            error={errors.newOwnerMemberId?.message}
            hint="Seuls les membres actifs peuvent devenir propriétaires."
            id="new-owner-member"
            label="Nouveau propriétaire"
          >
            <Controller
              control={control}
              name="newOwnerMemberId"
              render={({ field }) => (
                <Select
                  disabled={isReferenceDataLoading || isTransferring}
                  onValueChange={(value) => field.onChange(
                    value === EMPTY_MEMBER_VALUE ? '' : value,
                  )}
                  value={field.value || EMPTY_MEMBER_VALUE}
                >
                  <SelectTrigger
                    aria-describedby="new-owner-member-message"
                    aria-invalid={Boolean(errors.newOwnerMemberId) || undefined}
                    id="new-owner-member"
                    onBlur={field.onBlur}
                    ref={field.ref}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_MEMBER_VALUE}>Sélectionner un membre actif</SelectItem>
                    {candidateMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.user?.firstName} {member.user?.lastName} — {member.role?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <DataPagination
            buttonSize="sm"
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 p-3"
            disabled={isMembersFetching}
            nextLabel="Membres suivants"
            onPageChange={setMembersPage}
            page={membersPage}
            pagination={pagination}
            previousLabel="Membres précédents"
          />

          <FormField
            error={errors.previousOwnerRoleId?.message}
            hint="Ce rôle deviendra le vôtre immédiatement après le transfert."
            id="previous-owner-role"
            label="Votre rôle après le transfert"
          >
            <Controller
              control={control}
              name="previousOwnerRoleId"
              render={({ field }) => (
                <Select
                  disabled={isReferenceDataLoading || isTransferring}
                  onValueChange={(value) => field.onChange(
                    value === EMPTY_ROLE_VALUE ? '' : value,
                  )}
                  value={field.value || EMPTY_ROLE_VALUE}
                >
                  <SelectTrigger
                    aria-describedby="previous-owner-role-message"
                    aria-invalid={Boolean(errors.previousOwnerRoleId) || undefined}
                    id="previous-owner-role"
                    onBlur={field.onBlur}
                    ref={field.ref}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_ROLE_VALUE}>Sélectionner un rôle de remplacement</SelectItem>
                    {replacementRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            error={errors.currentPassword?.message}
            hint="Votre mot de passe courant confirme cette opération sensible."
            id="ownership-current-password"
            label="Mot de passe actuel"
          >
            <Input
              aria-describedby="ownership-current-password-message"
              aria-invalid={Boolean(errors.currentPassword) || undefined}
              autoComplete="current-password"
              disabled={isTransferring}
              id="ownership-current-password"
              type="password"
              {...register('currentPassword')}
            />
          </FormField>

          <label className="flex items-start gap-3 rounded-md border border-border bg-muted/20 p-4 text-sm">
            <input
              checked={consequencesConfirmed}
              className="mt-0.5 size-4"
              disabled={isTransferring}
              onChange={(event) => setConsequencesConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>
              Je comprends que je ne serai plus propriétaire après validation et que mes droits dépendront immédiatement du rôle de remplacement choisi.
            </span>
          </label>

          {errors.root?.server && (
            <p className="text-sm text-destructive" role="alert">
              {errors.root.server.message}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              disabled={
                isReferenceDataLoading
                || isReferenceDataError
                || isTransferring
                || !consequencesConfirmed
              }
              type="submit"
              variant="destructive"
            >
              {isTransferring ? 'Transfert en cours…' : 'Transférer la propriété'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

export { WorkspaceOwnershipSection, formatAuthorizationExpiry };
