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
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const SUMMARY_QUERY_LIMIT = 1;
const RECENT_ACTIVITY_LIMIT = 5;

function useWorkspaceDashboardData() {
  const {
    can,
    hasFeature,
    membership,
    workspace,
  } = useWorkspaceContext();

  /*
   * Un widget métier n'existe dans le dashboard que si le workspace possède
   * réellement la capability ET si l'utilisateur a la permission nécessaire.
   * Cette même décision pilote le `skip` RTK Query pour ne pas charger des
   * données appartenant à une fonctionnalité commercialement absente.
   *
   * Le widget Fichiers utilise `file_upload` comme signal produit sur le
   * dashboard. La route Fichiers reste, elle, consultable avec `file:read` afin
   * de préserver l'accès aux documents existants après un downgrade.
   */
  const permissions = {
    canReadMembers: (
      hasFeature(WORKSPACE_FEATURE.TEAM_MANAGEMENT)
      && can(WORKSPACE_PERMISSION.MEMBER_READ)
    ),
    canInviteMembers: (
      hasFeature(WORKSPACE_FEATURE.TEAM_MANAGEMENT)
      && can(WORKSPACE_PERMISSION.MEMBER_INVITE)
    ),
    canReadFiles: (
      hasFeature(WORKSPACE_FEATURE.FILE_UPLOAD)
      && can(WORKSPACE_PERMISSION.FILE_READ)
    ),
    canReadSubscription: can(WORKSPACE_PERMISSION.SUBSCRIPTION_READ),
    canReadAudit: (
      hasFeature(WORKSPACE_FEATURE.AUDIT_LOGS)
      && can(WORKSPACE_PERMISSION.AUDIT_READ)
    ),
  };

  const membersQuery = useListWorkspaceMembersQuery(
    {
      workspaceId: workspace.id,
      page: 1,
      limit: SUMMARY_QUERY_LIMIT,
    },
    { skip: !permissions.canReadMembers },
  );

  const invitationsQuery = useListWorkspaceInvitationsQuery(
    {
      workspaceId: workspace.id,
      page: 1,
      limit: SUMMARY_QUERY_LIMIT,
    },
    { skip: !permissions.canInviteMembers },
  );

  const filesQuery = useListWorkspaceFilesQuery(
    {
      workspaceId: workspace.id,
      page: 1,
      limit: SUMMARY_QUERY_LIMIT,
    },
    { skip: !permissions.canReadFiles },
  );

  const subscriptionQuery = useGetWorkspaceSubscriptionQuery(
    workspace.id,
    { skip: !permissions.canReadSubscription },
  );

  const activityQuery = useListWorkspaceAuditLogsQuery(
    {
      workspaceId: workspace.id,
      page: 1,
      limit: RECENT_ACTIVITY_LIMIT,
    },
    { skip: !permissions.canReadAudit },
  );

  const auditMetadataQuery = useGetWorkspaceAuditMetadataQuery(
    workspace.id,
    { skip: !permissions.canReadAudit },
  );

  return {
    workspace,
    membership,
    permissions,
    members: {
      query: membersQuery,
      total: membersQuery.data?.pagination?.total ?? null,
    },
    invitations: {
      query: invitationsQuery,
      total: invitationsQuery.data?.pagination?.total ?? null,
    },
    files: {
      query: filesQuery,
      total: filesQuery.data?.pagination?.total ?? null,
    },
    subscription: {
      query: subscriptionQuery,
      data: subscriptionQuery.data ?? null,
    },
    activity: {
      query: activityQuery,
      metadataQuery: auditMetadataQuery,
      metadata: auditMetadataQuery.data ?? null,
      entries: activityQuery.data?.auditLogs ?? [],
    },
  };
}

export {
  RECENT_ACTIVITY_LIMIT,
  SUMMARY_QUERY_LIMIT,
  useWorkspaceDashboardData,
};
