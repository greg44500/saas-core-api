import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  disableUser: vi.fn(),
  enableUser: vi.fn(),
  revokeUserSessions: vi.fn(),
  useDisablePlatformUserMutation: vi.fn(),
  useEnablePlatformUserMutation: vi.fn(),
  useGetCurrentUserQuery: vi.fn(),
  useGetPlatformUserQuery: vi.fn(),
  useListPlatformUsersQuery: vi.fn(),
  useRevokePlatformUserSessionsMutation: vi.fn(),
}));

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: mocks.useGetCurrentUserQuery,
}));

vi.mock('@/features/platform/api/platform-users-api', () => ({
  useDisablePlatformUserMutation: mocks.useDisablePlatformUserMutation,
  useEnablePlatformUserMutation: mocks.useEnablePlatformUserMutation,
  useGetPlatformUserQuery: mocks.useGetPlatformUserQuery,
  useListPlatformUsersQuery: mocks.useListPlatformUsersQuery,
  useRevokePlatformUserSessionsMutation: mocks.useRevokePlatformUserSessionsMutation,
}));

import { PlatformUsersPage } from '@/features/platform/pages/platform-users-page';

const currentUser = {
  id: '507f1f77bcf86cd799439010',
  firstName: 'Super',
  lastName: 'Admin',
};

const listedUser = {
  id: '507f1f77bcf86cd799439011',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  status: 'active',
  lastLoginAt: '2026-09-01T08:30:00.000Z',
  createdAt: '2026-08-20T10:00:00.000Z',
};

const detailedUser = {
  ...listedUser,
  emailVerifiedAt: '2026-08-20T10:05:00.000Z',
  passwordChangedAt: null,
  disabledAt: null,
  disabledReason: null,
  deletionRequestedAt: null,
  closedAt: null,
  closureReason: null,
  updatedAt: '2026-09-01T08:30:00.000Z',
};

function resolvedMutation(mock, result = {}) {
  mock.mockReturnValue({ unwrap: vi.fn().mockResolvedValue(result) });
  return [mock, { isLoading: false }];
}

function renderPage() {
  return render(
    <ToastProvider>
      <PlatformUsersPage />
    </ToastProvider>,
  );
}

describe('PlatformUsersPage', () => {
  beforeEach(() => {
    mocks.useGetCurrentUserQuery.mockReturnValue({ data: currentUser });
    mocks.useListPlatformUsersQuery.mockReturnValue({
      data: {
        users: [listedUser],
        pagination: {
          page: 1,
          limit: 20,
          total: 21,
          totalPages: 2,
        },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useGetPlatformUserQuery.mockReturnValue({
      data: detailedUser,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    mocks.useDisablePlatformUserMutation.mockReturnValue(
      resolvedMutation(mocks.disableUser, {
        id: listedUser.id,
        status: 'disabled',
      }),
    );
    mocks.useEnablePlatformUserMutation.mockReturnValue(
      resolvedMutation(mocks.enableUser),
    );
    mocks.useRevokePlatformUserSessionsMutation.mockReturnValue(
      resolvedMutation(mocks.revokeUserSessions, {
        userId: listedUser.id,
        revokedSessionCount: 2,
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche l’état de chargement', () => {
    mocks.useListPlatformUsersQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: true,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('Chargement des utilisateurs…')).toBeInTheDocument();
  });

  it('affiche les utilisateurs avec le DataTable et pagine côté serveur sans rôle User legacy', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('heading', { name: 'Utilisateurs' })).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Rôle plateforme' }),
    ).not.toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByRole('cell', { name: 'Utilisateur' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(mocks.useListPlatformUsersQuery).toHaveBeenLastCalledWith({
      page: 2,
      limit: 20,
    });
  });

  it('affiche un état vide explicite', () => {
    mocks.useListPlatformUsersQuery.mockReturnValue({
      data: {
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('Aucun utilisateur.')).toBeInTheDocument();
  });

  it('propose un retry lorsque la liste échoue', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    mocks.useListPlatformUsersQuery.mockReturnValue({
      data: undefined,
      error: { status: 500 },
      isFetching: false,
      isLoading: false,
      refetch,
    });

    renderPage();

    expect(
      screen.getByText('Impossible de charger les utilisateurs de la plateforme.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('sépare le cycle de vie du compte de la gestion des rôles Platform Team', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));

    const drawer = screen.getByRole('dialog', { name: 'Jane Doe' });
    expect(within(drawer).getByText('jane@example.com')).toBeInTheDocument();
    expect(within(drawer).queryByText('Rôle plateforme')).not.toBeInTheDocument();
    expect(
      within(drawer).queryByRole('button', { name: 'Modifier le rôle' }),
    ).not.toBeInTheDocument();
    expect(within(drawer).getByText(/cycle de vie du compte est distinct/i)).toBeInTheDocument();
  });

  it('ouvre le drawer et conserve l’erreur de validation dans la confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));

    const drawer = screen.getByRole('dialog', { name: 'Jane Doe' });
    await user.click(within(drawer).getByRole('button', { name: 'Désactiver' }));

    const confirmation = screen.getByRole('dialog', { name: 'Confirmer l’action' });
    await user.click(within(confirmation).getByRole('button', { name: 'Confirmer' }));

    expect(
      within(confirmation).getByText('Le motif doit contenir au minimum 3 caractères.'),
    ).toBeInTheDocument();
    expect(mocks.disableUser).not.toHaveBeenCalled();
  });

  it('désactive un utilisateur avec motif et affiche le succès global', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));

    const drawer = screen.getByRole('dialog', { name: 'Jane Doe' });
    await user.click(within(drawer).getByRole('button', { name: 'Désactiver' }));

    const confirmation = screen.getByRole('dialog', { name: 'Confirmer l’action' });
    const reasonField = within(confirmation).getByLabelText('Motif de désactivation');

    await user.type(reasonField, 'Incident de sécurité');
    expect(reasonField).toHaveValue('Incident de sécurité');

    await user.click(within(confirmation).getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(mocks.disableUser).toHaveBeenCalledWith({
        userId: listedUser.id,
        disabledReason: 'Incident de sécurité',
      });
    });

    expect(await screen.findByText('Utilisateur désactivé')).toBeInTheDocument();
  });
});
