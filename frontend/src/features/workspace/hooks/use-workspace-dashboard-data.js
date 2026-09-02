import { useListWorkspaceAuditLogsQuery } from '@/features/audit-log/api/audit-log-api';
import { useListWorkspaceFilesQuery } from '@/features/files/api/files-api';
import { useGetWorkspaceSubscriptionQuery } from '@/features/subscription/api/subscription-api';
import {
  useListWorkspaceInvitationsQuery,
  useListWorkspaceMembersQuery,
} from '@/features/workspace-members/api/workspace-members-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const SUMMARY_QUERY_LIMIT = 1;
const RECENT_ACTIVITY_LIMIT = 5;

function useWorkspaceDashboardData() {
  const { can, membership, workspace } = useWorkspaceContext();

  const permissions = {
    canReadMembers: can(WORKSPACE_PERMISSION.MEMBER_READ),
    canInviteMembers: can(WORKSPACE_PERMISSION.MEMBER_INVITE),
    canReadFiles: can(WORKSPACE_PERMISSION.FILE_READ),
    canReadSubscription: can(WORKSPACE_PERMISSION.SUBSCRIPTION_READ),
    canReadAudit: can(WORKSPACE_PERMISSION.AUDIT_READ),
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
      entries: activityQuery.data?.auditLogs ?? [],
    },
  };
}

export {
  RECENT_ACTIVITY_LIMIT,
  SUMMARY_QUERY_LIMIT,
  useWorkspaceDashboardData,
};
