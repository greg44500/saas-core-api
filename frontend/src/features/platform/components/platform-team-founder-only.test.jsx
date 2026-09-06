import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

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

describe('PlatformTeamMembersSection avec seulement le Fondateur', () => {
  beforeEach(() => {
    mocks.useGetCurrentUserQuery.mockReturnValue({
      data: { id: 'founder-user-id' },
    });
    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: {
        isFounder: true,
        status: 'active',
        role: { key: 'super_admin', name: 'Super administrateur' },
        permissions: Object.values(PLATFORM_PERMISSION),
      },
    });
    mocks.useListPlatformRolesQuery.mockReturnValue({
      data: { roles: [] },
    });
    mocks.useListPlatformTeamMembersQuery.mockReturnValue({
      data: {
        members: [
          {
            id: '507f1f77bcf86cd799439011',
            isFounder: true,
            status: 'active',
            user: {
              id: 'founder-user-id',
              firstName: 'Gregory',
              lastName: 'BALLAT',
              email: 'gregory@example.com',
            },
            role: {
              id: '507f191e810c19729de860ea',
              key: 'super_admin',
              name: 'Super administrateur',
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => cleanup());

  it('n’affiche pas une colonne Actions inutile', () => {
    render(<PlatformTeamMembersSection />);

    expect(screen.getByText('Gregory BALLAT (vous)')).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Actions' }),
    ).not.toBeInTheDocument();
  });
});
