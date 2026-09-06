import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useGetWorkspaceAuditMetadataQuery: vi.fn(),
  useListWorkspaceAuditLogsQuery: vi.fn(),
  useListWorkspaceFilesQuery: vi.fn(),
  useGetWorkspaceSubscriptionQuery: vi.fn(),
  useListWorkspaceInvitationsQuery: vi.fn(),
  useListWorkspaceMembersQuery: vi.fn(),
}));

vi.mock('@/features/audit-log/api/audit-log-api', () => ({
  useGetWorkspaceAuditMetadataQuery: mocks.useGetWorkspaceAuditMetadataQuery,
  useListWorkspaceAuditLogsQuery: mocks.useListWorkspaceAuditLogsQuery,
}));
vi.mock('@/features/files/api/files-api', () => ({
  useListWorkspaceFilesQuery: mocks.useListWorkspaceFilesQuery,
}));
vi.mock('@/features/subscription/api/subscription-api', () => ({
  useGetWorkspaceSubscriptionQuery: mocks.useGetWorkspaceSubscriptionQuery,
}));
vi.mock('@/features/workspace-members/api/workspace-members-api', () => ({
  useListWorkspaceInvitationsQuery: mocks.useListWorkspaceInvitationsQuery,
  useListWorkspaceMembersQuery: mocks.useListWorkspaceMembersQuery,
}));

import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { useWorkspaceDashboardData } from '@/features/workspace/hooks/use-workspace-dashboard-data';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'member-1', role: { key: 'owner', name: 'Propriétaire' } };
const permissions = [
  WORKSPACE_PERMISSION.MEMBER_READ,
  WORKSPACE_PERMISSION.MEMBER_INVITE,
  WORKSPACE_PERMISSION.FILE_READ,
  WORKSPACE_PERMISSION.SUBSCRIPTION_READ,
  WORKSPACE_PERMISSION.AUDIT_READ,
];

function Probe() {
  useWorkspaceDashboardData();
  return null;
}

function renderProbe(features) {
  return render(
    <WorkspaceProvider
      features={features}
      membership={membership}
      permissions={permissions}
      workspace={workspace}
    >
      <Probe />
    </WorkspaceProvider>,
  );
}

describe('useWorkspaceDashboardData', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset();
      mock.mockReturnValue({
        data: undefined,
        isError: false,
        isLoading: false,
      });
    });
  });

  afterEach(() => cleanup());

  it('ne charge pas les widgets métier absents du workspace', () => {
    renderProbe([]);

    expect(mocks.useListWorkspaceMembersQuery).toHaveBeenCalledWith(
      expect.any(Object),
      { skip: true },
    );
    expect(mocks.useListWorkspaceInvitationsQuery).toHaveBeenCalledWith(
      expect.any(Object),
      { skip: true },
    );
    expect(mocks.useListWorkspaceFilesQuery).toHaveBeenCalledWith(
      expect.any(Object),
      { skip: true },
    );
    expect(mocks.useListWorkspaceAuditLogsQuery).toHaveBeenCalledWith(
      expect.any(Object),
      { skip: true },
    );
    expect(mocks.useGetWorkspaceAuditMetadataQuery).toHaveBeenCalledWith(
      'workspace-1',
      { skip: true },
    );
    expect(mocks.useGetWorkspaceSubscriptionQuery).toHaveBeenCalledWith(
      'workspace-1',
      { skip: false },
    );
  });

  it('charge un widget seulement lorsque capability et permission sont réunies', () => {
    renderProbe([
      WORKSPACE_FEATURE.TEAM_MANAGEMENT,
      WORKSPACE_FEATURE.FILE_UPLOAD,
      WORKSPACE_FEATURE.AUDIT_LOGS,
    ]);

    expect(mocks.useListWorkspaceMembersQuery).toHaveBeenCalledWith(
      expect.any(Object),
      { skip: false },
    );
    expect(mocks.useListWorkspaceInvitationsQuery).toHaveBeenCalledWith(
      expect.any(Object),
      { skip: false },
    );
    expect(mocks.useListWorkspaceFilesQuery).toHaveBeenCalledWith(
      expect.any(Object),
      { skip: false },
    );
    expect(mocks.useListWorkspaceAuditLogsQuery).toHaveBeenCalledWith(
      expect.any(Object),
      { skip: false },
    );
    expect(mocks.useGetWorkspaceAuditMetadataQuery).toHaveBeenCalledWith(
      'workspace-1',
      { skip: false },
    );
  });
});
