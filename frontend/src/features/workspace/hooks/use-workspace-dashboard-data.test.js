import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useWorkspaceContextMock = vi.hoisted(() => vi.fn());
const useListWorkspaceMembersQueryMock = vi.hoisted(() => vi.fn());
const useListWorkspaceInvitationsQueryMock = vi.hoisted(() => vi.fn());
const useListWorkspaceFilesQueryMock = vi.hoisted(() => vi.fn());
const useGetWorkspaceSubscriptionQueryMock = vi.hoisted(() => vi.fn());
const useListWorkspaceAuditLogsQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: useWorkspaceContextMock,
}));

vi.mock('@/features/workspace-members/api/workspace-members-api', () => ({
  useListWorkspaceMembersQuery: useListWorkspaceMembersQueryMock,
  useListWorkspaceInvitationsQuery: useListWorkspaceInvitationsQueryMock,
}));

vi.mock('@/features/files/api/files-api', () => ({
  useListWorkspaceFilesQuery: useListWorkspaceFilesQueryMock,
}));

vi.mock('@/features/subscription/api/subscription-api', () => ({
  useGetWorkspaceSubscriptionQuery: useGetWorkspaceSubscriptionQueryMock,
}));

vi.mock('@/features/audit-log/api/audit-log-api', () => ({
  useListWorkspaceAuditLogsQuery: useListWorkspaceAuditLogsQueryMock,
}));

import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import {
  RECENT_ACTIVITY_LIMIT,
  SUMMARY_QUERY_LIMIT,
  useWorkspaceDashboardData,
} from '@/features/workspace/hooks/use-workspace-dashboard-data';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'admin', name: 'Administrateur' } };

function createQueryResult(data = undefined) {
  return {
    data,
    isError: false,
    isLoading: false,
  };
}

function mockQueryResults() {
  useListWorkspaceMembersQueryMock.mockReturnValue(
    createQueryResult({ members: [], pagination: { total: 4 } }),
  );
  useListWorkspaceInvitationsQueryMock.mockReturnValue(
    createQueryResult({ invitations: [], pagination: { total: 2 } }),
  );
  useListWorkspaceFilesQueryMock.mockReturnValue(
    createQueryResult({ files: [], pagination: { total: 7 } }),
  );
  useGetWorkspaceSubscriptionQueryMock.mockReturnValue(
    createQueryResult({ effectiveEntitlement: { plan: { name: 'Premium' } } }),
  );
  useListWorkspaceAuditLogsQueryMock.mockReturnValue(
    createQueryResult({ auditLogs: [{ id: 'audit-1' }], pagination: { total: 1 } }),
  );
}

describe('useWorkspaceDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResults();
  });

  it('charge uniquement les synthèses autorisées avec des limites minimales', () => {
    const grantedPermissions = new Set([
      WORKSPACE_PERMISSION.MEMBER_READ,
      WORKSPACE_PERMISSION.MEMBER_INVITE,
      WORKSPACE_PERMISSION.FILE_READ,
      WORKSPACE_PERMISSION.SUBSCRIPTION_READ,
      WORKSPACE_PERMISSION.AUDIT_READ,
    ]);

    useWorkspaceContextMock.mockReturnValue({
      workspace,
      membership,
      can: (permission) => grantedPermissions.has(permission),
      hasFeature: () => true,
    });

    const { result } = renderHook(() => useWorkspaceDashboardData());

    expect(useListWorkspaceMembersQueryMock).toHaveBeenCalledWith(
      { workspaceId: 'workspace-1', page: 1, limit: SUMMARY_QUERY_LIMIT },
      { skip: false },
    );
    expect(useListWorkspaceInvitationsQueryMock).toHaveBeenCalledWith(
      { workspaceId: 'workspace-1', page: 1, limit: SUMMARY_QUERY_LIMIT },
      { skip: false },
    );
    expect(useListWorkspaceFilesQueryMock).toHaveBeenCalledWith(
      { workspaceId: 'workspace-1', page: 1, limit: SUMMARY_QUERY_LIMIT },
      { skip: false },
    );
    expect(useGetWorkspaceSubscriptionQueryMock).toHaveBeenCalledWith(
      'workspace-1',
      { skip: false },
    );
    expect(useListWorkspaceAuditLogsQueryMock).toHaveBeenCalledWith(
      { workspaceId: 'workspace-1', page: 1, limit: RECENT_ACTIVITY_LIMIT },
      { skip: false },
    );

    expect(result.current.members.total).toBe(4);
    expect(result.current.invitations.total).toBe(2);
    expect(result.current.files.total).toBe(7);
    expect(result.current.activity.entries).toEqual([{ id: 'audit-1' }]);
  });

  it('skippe chaque source serveur lorsque la permission correspondante manque', () => {
    useWorkspaceContextMock.mockReturnValue({
      workspace,
      membership,
      can: () => false,
      hasFeature: () => true,
    });

    renderHook(() => useWorkspaceDashboardData());

    expect(useListWorkspaceMembersQueryMock.mock.calls[0][1]).toEqual({ skip: true });
    expect(useListWorkspaceInvitationsQueryMock.mock.calls[0][1]).toEqual({ skip: true });
    expect(useListWorkspaceFilesQueryMock.mock.calls[0][1]).toEqual({ skip: true });
    expect(useGetWorkspaceSubscriptionQueryMock.mock.calls[0][1]).toEqual({ skip: true });
    expect(useListWorkspaceAuditLogsQueryMock.mock.calls[0][1]).toEqual({ skip: true });
  });
});
