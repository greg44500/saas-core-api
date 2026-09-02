import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.hoisted(() => vi.fn());
const transferWorkspaceOwnershipMock = vi.hoisted(() => vi.fn());
const transferUnwrapMock = vi.hoisted(() => vi.fn());
const useListWorkspaceMembersQueryMock = vi.hoisted(() => vi.fn());
const useListWorkspaceRolesQueryMock = vi.hoisted(() => vi.fn());

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/features/workspace-members/api/workspace-members-api', () => ({
  useListWorkspaceMembersQuery: useListWorkspaceMembersQueryMock,
  useListWorkspaceRolesQuery: useListWorkspaceRolesQueryMock,
}));

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useTransferWorkspaceOwnershipMutation: () => [
    transferWorkspaceOwnershipMock,
    { isLoading: false },
  ],
}));

import { WorkspaceOwnershipSection } from '@/features/workspace/components/workspace-ownership-section';

const workspaceId = '507f1f77bcf86cd799439011';
const newOwnerMemberId = '507f191e810c19729de860ea';
const adminRoleId = '507f191e810c19729de860eb';

function configureReferenceData() {
  useListWorkspaceMembersQueryMock.mockReturnValue({
    data: {
      members: [
        {
          id: '507f191e810c19729de860e1',
          status: 'active',
          user: { firstName: 'Greg', lastName: 'Owner' },
          role: { id: '507f191e810c19729de860e2', key: 'owner', name: 'Propriétaire' },
        },
        {
          id: newOwnerMemberId,
          status: 'active',
          user: { firstName: 'Marie', lastName: 'Martin' },
          role: { id: adminRoleId, key: 'admin', name: 'Administrateur' },
        },
        {
          id: '507f191e810c19729de860ec',
          status: 'suspended',
          user: { firstName: 'Jean', lastName: 'Suspendu' },
          role: { id: '507f191e810c19729de860ed', key: 'member', name: 'Membre' },
        },
      ],
      pagination: {
        page: 1,
        totalPages: 1,
      },
    },
    isError: false,
    isFetching: false,
  });
  useListWorkspaceRolesQueryMock.mockReturnValue({
    data: [
      {
        id: '507f191e810c19729de860e2',
        key: 'owner',
        name: 'Propriétaire',
      },
      {
        id: adminRoleId,
        key: 'admin',
        name: 'Administrateur',
      },
    ],
    isError: false,
    isFetching: false,
  });
}

async function completeTransferForm(user) {
  await user.selectOptions(
    screen.getByLabelText('Nouveau propriétaire'),
    newOwnerMemberId,
  );
  await user.selectOptions(
    screen.getByLabelText('Votre rôle après le transfert'),
    adminRoleId,
  );
  await user.type(
    screen.getByLabelText('Mot de passe actuel'),
    '123456789012345',
  );
}

describe('WorkspaceOwnershipSection', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    transferWorkspaceOwnershipMock.mockReset();
    transferUnwrapMock.mockReset();
    useListWorkspaceMembersQueryMock.mockReset();
    useListWorkspaceRolesQueryMock.mockReset();
    configureReferenceData();
    transferWorkspaceOwnershipMock.mockReturnValue({
      unwrap: transferUnwrapMock,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('propose uniquement les membres actifs non-owner et exige la confirmation explicite', async () => {
    const user = userEvent.setup();
    transferUnwrapMock.mockResolvedValue({
      previousOwnerMemberId: '507f191e810c19729de860e1',
      newOwnerMemberId,
    });

    render(<WorkspaceOwnershipSection workspaceId={workspaceId} />);

    expect(screen.getByRole('option', { name: 'Marie Martin — Administrateur' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Greg Owner/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Jean Suspendu/ })).not.toBeInTheDocument();

    await completeTransferForm(user);

    const submitButton = screen.getByRole('button', { name: 'Transférer la propriété' });
    expect(submitButton).toBeDisabled();

    await user.click(
      screen.getByRole('checkbox', {
        name: /Je comprends que je ne serai plus propriétaire/,
      }),
    );

    expect(submitButton).toBeEnabled();
    await user.click(submitButton);

    await waitFor(() => {
      expect(transferWorkspaceOwnershipMock).toHaveBeenCalledWith({
        workspaceId,
        newOwnerMemberId,
        previousOwnerRoleId: adminRoleId,
        currentPassword: '123456789012345',
      });
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        `/workspaces/${workspaceId}/dashboard`,
        { replace: true },
      );
    });
  });

  it('présente le message d’erreur opérationnel renvoyé par le backend', async () => {
    const user = userEvent.setup();
    transferUnwrapMock.mockRejectedValue({
      data: {
        message: 'Le mot de passe actuel est incorrect',
      },
    });

    render(<WorkspaceOwnershipSection workspaceId={workspaceId} />);

    await completeTransferForm(user);
    await user.click(
      screen.getByRole('checkbox', {
        name: /Je comprends que je ne serai plus propriétaire/,
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Transférer la propriété' }));

    expect(
      await screen.findByText('Le mot de passe actuel est incorrect'),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
