import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useGetCurrentPlatformContextQuery: vi.fn(),
  useGetCurrentUserQuery: vi.fn(),
  useListPlatformRolesQuery: vi.fn(),
  useListPlatformTeamMembersQuery: vi.fn(),
}));

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: mocks.useGetCurrentUserQuery,
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: mocks.useGetCurrentPlatformContextQuery,
}));

vi.mock('@/features/platform/api/platform-roles-api', () => ({
  useListPlatformRolesQuery: mocks.useListPlatformRolesQuery,
}));

vi.mock('@/features/platform/api/platform-team-api', () => ({
  useListPlatformTeamMembersQuery: mocks.useListPlatformTeamMembersQuery,
  useReactivatePlatformTeamMemberMutation: () => [vi.fn(), { isLoading: false }],
  useRevokePlatformTeamMemberMutation: () => [vi.fn(), { isLoading: false }],
  useSuspendPlatformTeamMemberMutation: () => [vi.fn(), { isLoading: false }],
  useUpdatePlatformTeamMemberRoleMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { PlatformTeamMembersSection } from '@/features/platform/components/platform-team-members-section';

describe('PlatformTeamMembersSection loading', () => {
  it('utilise DataTableSkeleton pendant un premier fetch sans données', () => {
    mocks.useGetCurrentUserQuery.mockReturnValue({ data: { id: 'user-1' } });
    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: { permissions: [] },
    });
    mocks.useListPlatformRolesQuery.mockReturnValue({
      data: { roles: [] },
      isLoading: false,
    });
    mocks.useListPlatformTeamMembersQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<PlatformTeamMembersSection />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement du tableau…',
    );
    expect(screen.queryByText('Chargement des membres…')).not.toBeInTheDocument();
  });
});
