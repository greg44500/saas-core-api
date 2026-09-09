import { DashboardRecentActivity } from '@/features/workspace/components/dashboard-recent-activity';
import { DashboardSubscriptionSummary } from '@/features/workspace/components/dashboard-subscription-summary';
import { DashboardSummaryCard } from '@/features/workspace/components/dashboard-summary-card';
import { useWorkspaceDashboardData } from '@/features/workspace/hooks/use-workspace-dashboard-data';
import {
  formatDashboardCount,
  formatWorkspaceStatus,
} from '@/features/workspace/lib/workspace-presentation';

function isInitialQueryLoading(query) {
  return query.isLoading || (query.isFetching && query.data === undefined);
}

function WorkspaceDashboardPage() {
  const {
    workspace,
    membership,
    permissions,
    members,
    invitations,
    files,
    subscription,
    activity,
  } = useWorkspaceDashboardData();

  function retryActivity() {
    activity.query.refetch();
    activity.metadataQuery.refetch();
  }

  const membersLoading = isInitialQueryLoading(members.query);
  const invitationsLoading = isInitialQueryLoading(invitations.query);
  const filesLoading = isInitialQueryLoading(files.query);
  const subscriptionLoading = isInitialQueryLoading(subscription.query);
  const activityLoading = isInitialQueryLoading(activity.query)
    || isInitialQueryLoading(activity.metadataQuery);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">{workspace.name}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Vue synthétique du workspace courant. Les indicateurs affichés respectent les fonctionnalités réellement disponibles et les permissions de votre rôle.
        </p>
      </header>

      <section aria-label="Synthèse du workspace" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardSummaryCard
          description="État courant du workspace."
          label="Statut du workspace"
          value={formatWorkspaceStatus(workspace.status)}
        />

        <DashboardSummaryCard
          description="Rôle effectif dans ce workspace."
          label="Votre rôle"
          value={membership.role?.name ?? 'Non renseigné'}
        />

        {permissions.canReadMembers && (
          <DashboardSummaryCard
            description="Membres actuellement visibles dans le workspace."
            href={`/workspaces/${workspace.id}/members`}
            isError={members.query.isError}
            isLoading={membersLoading}
            label="Membres"
            value={formatDashboardCount(members.total)}
          />
        )}

        {permissions.canInviteMembers && (
          <DashboardSummaryCard
            description="Invitations encore en attente de réponse."
            href={`/workspaces/${workspace.id}/members`}
            isError={invitations.query.isError}
            isLoading={invitationsLoading}
            label="Invitations en attente"
            value={formatDashboardCount(invitations.total)}
          />
        )}

        {permissions.canReadFiles && (
          <DashboardSummaryCard
            description="Fichiers actifs accessibles dans le workspace."
            href={`/workspaces/${workspace.id}/files`}
            isError={files.query.isError}
            isLoading={filesLoading}
            label="Fichiers actifs"
            value={formatDashboardCount(files.total)}
          />
        )}

        {permissions.canReadSubscription && (
          <DashboardSubscriptionSummary
            isError={subscription.query.isError}
            isLoading={subscriptionLoading}
            subscription={subscription.data}
            workspaceId={workspace.id}
          />
        )}
      </section>

      {permissions.canReadAudit && (
        <DashboardRecentActivity
          entries={activity.entries}
          isError={activity.query.isError}
          isLoading={activityLoading}
          metadata={activity.metadata}
          onRetry={retryActivity}
          workspaceId={workspace.id}
        />
      )}
    </div>
  );
}

export { WorkspaceDashboardPage, isInitialQueryLoading };
