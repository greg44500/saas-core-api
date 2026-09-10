import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useWorkspaceContextMock = vi.hoisted(() => vi.fn());
const useGetCurrentUserPreferencesQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: useWorkspaceContextMock,
}));

vi.mock('@/features/preferences/api/user-preferences-api', () => ({
  useGetCurrentUserPreferencesQuery: useGetCurrentUserPreferencesQueryMock,
}));

import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { useWorkspaceDashboardWidgets } from '@/features/workspace/hooks/use-workspace-dashboard-widgets';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };

function mockWorkspaceContext({ features = [], permissions = [] } = {}) {
  const featureSet = new Set(features);
  const permissionSet = new Set(permissions);

  useWorkspaceContextMock.mockReturnValue({
    workspace,
    can: (permission) => permissionSet.has(permission),
    hasFeature: (feature) => featureSet.has(feature),
  });
}

function mockPreferences({ hiddenWidgetIds = [], loading = false } = {}) {
  useGetCurrentUserPreferencesQueryMock.mockReturnValue({
    data: loading ? undefined : {
      dashboard: { hiddenWidgetIds },
    },
    isError: false,
    isFetching: loading,
    isLoading: loading,
  });
}

describe('useWorkspaceDashboardWidgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceContext();
    mockPreferences();
  });

  it('ne rend accessible que les widgets couverts par les capabilities et permissions effectives', () => {
    mockWorkspaceContext({
      features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
      permissions: [WORKSPACE_PERMISSION.MEMBER_READ],
    });

    const { result } = renderHook(() => useWorkspaceDashboardWidgets());
    const accessibleIds = result.current.accessibleWidgets.map((widget) => widget.id);

    expect(accessibleIds).toContain('core.workspace-status');
    expect(accessibleIds).toContain('core.workspace-role');
    expect(accessibleIds).toContain('core.members');
    expect(accessibleIds).not.toContain('core.pending-invitations');
    expect(accessibleIds).not.toContain('core.files');
    expect(accessibleIds).not.toContain('core.recent-activity');
  });

  it('applique le masquage personnel uniquement à un widget déjà accessible', () => {
    mockWorkspaceContext({
      features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
      permissions: [WORKSPACE_PERMISSION.MEMBER_READ],
    });
    mockPreferences({ hiddenWidgetIds: ['core.members', 'core.files'] });

    const { result } = renderHook(() => useWorkspaceDashboardWidgets());
    const visibleIds = result.current.visibleWidgets.map((widget) => widget.id);

    expect(visibleIds).toContain('core.workspace-status');
    expect(visibleIds).toContain('core.workspace-role');
    expect(visibleIds).not.toContain('core.members');
    expect(visibleIds).not.toContain('core.files');
  });

  it('ne monte que le contexte non configurable tant que les préférences sont en chargement', () => {
    mockWorkspaceContext({
      features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
      permissions: [WORKSPACE_PERMISSION.MEMBER_READ],
    });
    mockPreferences({ loading: true });

    const { result } = renderHook(() => useWorkspaceDashboardWidgets());

    expect(result.current.visibleWidgets.map((widget) => widget.id)).toEqual([
      'core.workspace-status',
      'core.workspace-role',
    ]);
    expect(result.current.isPreferencesLoading).toBe(true);
  });
});
