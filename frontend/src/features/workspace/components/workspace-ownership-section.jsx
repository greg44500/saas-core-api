import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useListWorkspaceMembersQuery } from '@/features/workspace-members/api/workspace-members-api';
import { useListWorkspaceRolesQuery } from '@/features/workspace-roles/api/workspace-roles-api';
import { useTransferWorkspaceOwnershipMutation } from '@/features/workspace/api/workspace-api';
import { getWorkspaceApiErrorMessage } from '@/features/workspace/lib/get-workspace-api-error-message';
import { transferWorkspaceOwnershipSchema } from '@/features/workspace/validation/workspace-schemas';

const MEMBERS_PAGE_SIZE = 20;

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function WorkspaceOwnershipSection({ workspaceId }) {
  const navigate = useNavigate();
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
    data: roles = [],
    isError: isRolesError,
    isFetching: isRolesFetching,
  } = useListWorkspaceRolesQuery(workspaceId);
  const [transferWorkspaceOwnership, { isLoading: isTransferring }] =
    useTransferWorkspaceOwnershipMutation();
  const {
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
  const isReferenceDataError = isMembersError || isRolesError;

  const onSubmit = async (values) => {
    try {
      await transferWorkspaceOwnership({
        workspaceId,
        ...values,
      }).unwrap();

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

  return (
    <section className="space-y-5 rounded-xl border border-destructive/40 bg-card p-6 text-card-foreground">
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">Opération sensible</p>
        <h2 className="text-lg font-semibold">Transférer la propriété</h2>
        <p className="text-sm text-muted-foreground">
          Le nouveau propriétaire recevra le rôle owner. Votre rôle sera remplacé par celui que vous choisissez ci-dessous et vos permissions seront recalculées par le backend.
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
            <select
              aria-describedby="new-owner-member-message"
              aria-invalid={Boolean(errors.newOwnerMemberId) || undefined}
              className={selectClassName}
              disabled={isReferenceDataLoading || isTransferring}
              id="new-owner-member"
              {...register('newOwnerMemberId')}
            >
              <option value="">Sélectionner un membre actif</option>
              {candidateMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.user?.firstName} {member.user?.lastName} — {member.role?.name}
                </option>
              ))}
            </select>
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
            <select
              aria-describedby="previous-owner-role-message"
              aria-invalid={Boolean(errors.previousOwnerRoleId) || undefined}
              className={selectClassName}
              disabled={isReferenceDataLoading || isTransferring}
              id="previous-owner-role"
              {...register('previousOwnerRoleId')}
            >
              <option value="">Sélectionner un rôle de remplacement</option>
              {replacementRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
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

export { WorkspaceOwnershipSection };
