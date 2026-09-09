import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useListWorkspaceMembersQuery: vi.fn(),
  useListWorkspaceRolesQuery: vi.fn(),
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/features/workspace-members/api/workspace-members-api', () => ({
  useListWorkspaceMembersQuery: mocks.useListWorkspaceMembersQuery,
}));

vi.mock('@/features/workspace-roles/api/workspace-roles-api', () => ({
  useListWorkspaceRolesQuery: mocks.useListWorkspaceRolesQuery,
}));

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useTransferWorkspaceOwnershipMutation: () => [vi.fn(), { isLoading: false }],
}));

import { WorkspaceOwnershipSection } from '@/features/workspace/components/workspace-ownership-section';

describe('WorkspaceOwnershipSection loading state', () => {
  afterEach(() => cleanup());

  it('affiche un skeleton sensible tant que les membres et rôles initiaux sont absents', () => {
    mocks.useListWorkspaceMembersQuery.mockReturnValue({
      data: undefined,
      isError: false,
      isFetching: true,
    });
    mocks.useListWorkspaceRolesQuery.mockReturnValue({
      data: undefined,
      isError: false,
      isFetching: true,
    });

    render(<WorkspaceOwnershipSection workspaceId="workspace-1" />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement des données nécessaires au transfert de propriété…',
    );
    expect(
      screen.queryByLabelText('Nouveau propriétaire'),
    ).not.toBeInTheDocument();
  });
});
