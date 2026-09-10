import {
  useGetWorkspaceAuditMetadataQuery,
  useListWorkspaceAuditLogsQuery,
} from '@/features/audit-log/api/audit-log-api';
import { useListWorkspaceFilesQuery } from '@/features/files/api/files-api';
import { useGetWorkspaceSubscriptionQuery } from '@/features/subscription/api/subscription-api';
import {
  useListWorkspaceInvitationsQuery,
  useListWorkspaceMembersQuery,
} from '@/features/workspace-members/api/workspace-members-api';
import { DashboardRecentActivity } from '@/features/workspace/components/dashboard-recent-activity';
import { DashboardSubscriptionSummary } from '@/features/workspace/components/dashboard-subscription-summary';
import { DashboardSummaryCard } from '@/features/workspace/components/dashboard-summary-card';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { isInitialQueryLoading } from '@/features/workspace/lib/dashboard-query';
import {
  formatDashboardCount,
  formatWorkspaceStatus,
} from '@/features/workspace/lib/workspace-presentation';

const SUMMARY_QUERY_LIMIT = 1;
const RECENT_ACTIVITY_LIMIT = 5;

function WorkspaceStatusDashboardWidget() {
  const { workspace } = useWorkspaceContext();

  return (
    <DashboardSummaryCard
      description="État courant du workspace."
      label="Statut du workspace"
      value={formatWorkspaceStatus(workspace.status)}
    />
  );
}

function WorkspaceRoleDashboardWidget() {
  const { membership } = useWorkspaceContext();

  return (
    <DashboardSummaryCard
      description="Rôle effectif dans ce workspace."
      label="Votre rôle"
      value={membership.role?.name ?? 'Non renseigné'}
    />
  );
}

function MembersDashboardWidget() {
  const { workspace } = useWorkspaceContext();
  const query = useListWorkspaceMembersQuery({
    workspaceId: workspace.id,
    page: 1,
    limit: SUMMARY_QUERY_LIMIT,
  });

  return (
    <DashboardSummaryCard
      description="Membres actuellement visibles dans le workspace."
      href={`/workspaces/${workspace.id}/members`}
      isError={query.isError}
      isLoading={isInitialQueryLoading(query)}
      label="Membres"
      value={formatDashboardCount(query.data?.pagination?.total ?? null)}
    />
  );
}

function PendingInvitationsDashboardWidget() {
  const { workspace } = useWorkspaceContext();
  const query = useListWorkspaceInvitationsQuery({
    workspaceId: workspace.id,
    page: 1,
    limit: SUMMARY_QUERY_LIMIT,
  });

  return (
    <DashboardSummaryCard
      description="Invitations encore en attente de réponse."
      href={`/workspaces/${workspace.id}/members`}
      isError={query.isError}
      isLoading={isInitialQueryLoading(query)}
      label="Invitations en attente"
      value={formatDashboardCount(query.data?.pagination?.total ?? null)}
    />
  );
}

function FilesDashboardWidget() {
  const { workspace } = useWorkspaceContext();
  const query = useListWorkspaceFilesQuery({
    workspaceId: workspace.id,
    page: 1,
    limit: SUMMARY_QUERY_LIMIT,
  });

  return (
    <DashboardSummaryCard
      description="Fichiers actifs accessibles dans le workspace."
      href={`/workspaces/${workspace.id}/files`}
      isError={query.isError}
      isLoading={isInitialQueryLoading(query)}
      label="Fichiers actifs"
      value={formatDashboardCount(query.data?.pagination?.total ?? null)}
    />
  );
}

function SubscriptionDashboardWidget() {
  const { workspace } = useWorkspaceContext();
  const query = useGetWorkspaceSubscriptionQuery(workspace.id);

  return (
    <DashboardSubscriptionSummary
      isError={query.isError}
      isLoading={isInitialQueryLoading(query)}
      subscription={query.data ?? null}
      workspaceId={workspace.id}
    />
  );
}

function RecentActivityDashboardWidget() {
  const { workspace } = useWorkspaceContext();
  const query = useListWorkspaceAuditLogsQuery({
    workspaceId: workspace.id,
    page: 1,
    limit: RECENT_ACTIVITY_LIMIT,
  });
  const metadataQuery = useGetWorkspaceAuditMetadataQuery(workspace.id);

  function retry() {
    query.refetch();
    metadataQuery.refetch();
  }

  return (
    <DashboardRecentActivity
      entries={query.data?.auditLogs ?? []}
      isError={query.isError}
      isLoading={isInitialQueryLoading(query) || isInitialQueryLoading(metadataQuery)}
      metadata={metadataQuery.data ?? null}
      onRetry={retry}
      workspaceId={workspace.id}
    />
  );
}

export {
  FilesDashboardWidget,
  MembersDashboardWidget,
  PendingInvitationsDashboardWidget,
  RecentActivityDashboardWidget,
  SubscriptionDashboardWidget,
  WorkspaceRoleDashboardWidget,
  WorkspaceStatusDashboardWidget,
};
