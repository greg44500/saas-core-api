import { DashboardRecentActivity } from '@/features/workspace/components/dashboard-recent-activity';
import { DashboardSubscriptionSummary } from '@/features/workspace/components/dashboard-subscription-summary';
import { DashboardSummaryCard } from '@/features/workspace/components/dashboard-summary-card';
import { useWorkspaceDashboardData } from '@/features/workspace/hooks/use-workspace-dashboard-data';
import {
  formatDashboardCount,
  formatWorkspaceStatus,
} from '@/features/workspace/lib/workspace-presentation';

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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">{workspace.name}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Vue synthétique du workspace courant. Chaque indicateur respecte les permissions de votre rôle et renvoie vers la surface spécialisée lorsqu’elle est disponible.
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
            isLoading={members.query.isLoading}
            label="Membres"
            value={formatDashboardCount(members.total)}
          />
        )}

        {permissions.canInviteMembers && (
          <DashboardSummaryCard
            description="Invitations encore en attente de réponse."
            href={`/workspaces/${workspace.id}/members`}
            isError={invitations.query.isError}
            isLoading={invitations.query.isLoading}
            label="Invitations en attente"
            value={formatDashboardCount(invitations.total)}
          />
        )}

        {permissions.canReadFiles && (
          <DashboardSummaryCard
            description="Fichiers actifs accessibles dans le workspace."
            href={`/workspaces/${workspace.id}/files`}
            isError={files.query.isError}
            isLoading={files.query.isLoading}
            label="Fichiers actifs"
            value={formatDashboardCount(files.total)}
          />
        )}

        {permissions.canReadSubscription && (
          <DashboardSubscriptionSummary
            isError={subscription.query.isError}
            isLoading={subscription.query.isLoading}
            subscription={subscription.data}
            workspaceId={workspace.id}
          />
        )}
      </section>

      {permissions.canReadAudit && (
        <DashboardRecentActivity
          entries={activity.entries}
          isError={activity.query.isError}
          isLoading={activity.query.isLoading}
          workspaceId={workspace.id}
        />
      )}
    </div>
  );
}

export { WorkspaceDashboardPage };
