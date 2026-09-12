import { InfoTooltip } from '@/components/shared/info-tooltip';
import { WorkspaceArchiveSection } from '@/features/workspace/components/workspace-archive-section';
import { WorkspaceGeneralSettingsForm } from '@/features/workspace/components/workspace-general-settings-form';
import { WorkspaceOwnershipSection } from '@/features/workspace/components/workspace-ownership-section';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { useGetWorkspaceOwnershipTransferAuthorizationQuery } from '@/features/workspace/api/workspace-api';

function WorkspaceSettingsPage() {
  const { can, membership, workspace } = useWorkspaceContext();
  const canUpdateWorkspace = can(WORKSPACE_PERMISSION.WORKSPACE_UPDATE);
  const canTransferOwnership = can(WORKSPACE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER);
  const isOwner = membership?.role?.key === 'owner';
  const ownershipAuthorizationQuery =
    useGetWorkspaceOwnershipTransferAuthorizationQuery(workspace.id, {
      skip: !canTransferOwnership || !isOwner,
    });
  const ownershipAuthorization = ownershipAuthorizationQuery.data;
  const ownershipTransferAvailable = Boolean(
    canTransferOwnership
    && isOwner
    && ownershipAuthorization?.active,
  );

  if (!canUpdateWorkspace && !canTransferOwnership && !isOwner) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
        <h1 className="text-xl font-semibold">Paramètres du workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous ne disposez pas des permissions nécessaires pour administrer ces paramètres.
        </p>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">Administration</p>
        <div className="flex items-center gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Paramètres du workspace</h1>
          <InfoTooltip
            content={`Gérez les informations courantes de ${workspace.name} et les opérations réservées à son propriétaire.`}
            label="À propos des paramètres du workspace"
          />
        </div>
      </header>

      {canUpdateWorkspace && (
        <WorkspaceGeneralSettingsForm canUpdate workspace={workspace} />
      )}

      {ownershipTransferAvailable && (
        <WorkspaceOwnershipSection
          authorization={ownershipAuthorization}
          workspaceId={workspace.id}
        />
      )}

      {isOwner && (
        <WorkspaceArchiveSection workspace={workspace} />
      )}
    </div>
  );
}

export { WorkspaceSettingsPage };
