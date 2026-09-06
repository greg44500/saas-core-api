import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const mocks = vi.hoisted(() => ({
  resend: vi.fn(),
  revoke: vi.fn(),
  toast: vi.fn(),
  useGetCurrentPlatformContextQuery: vi.fn(),
  useListPlatformTeamInvitationsQuery: vi.fn(),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: mocks.useGetCurrentPlatformContextQuery,
}));

vi.mock('@/features/platform/api/platform-invitations-api', () => ({
  useListPlatformTeamInvitationsQuery: mocks.useListPlatformTeamInvitationsQuery,
  useResendPlatformTeamInvitationMutation: () => [
    mocks.resend,
    { isLoading: false },
  ],
  useRevokePlatformTeamInvitationMutation: () => [
    mocks.revoke,
    { isLoading: false },
  ],
}));

vi.mock('@/features/platform/components/platform-invitation-form-drawer', () => ({
  PlatformInvitationFormDrawer: ({ open }) => (
    open ? <div data-testid="invitation-form-drawer">Formulaire invitation</div> : null
  ),
}));

import { PlatformTeamInvitationsSection } from '@/features/platform/components/platform-team-invitations-section';

const invitation = {
  id: 'invitation-id',
  firstName: 'Marie',
  lastName: 'Martin',
  email: 'marie@example.com',
  status: 'pending',
  deliveryStatus: 'sent',
  expiresAt: '2026-09-13T10:00:00.000Z',
  role: {
    id: 'role-id',
    key: 'technical_support',
    name: 'Support technique',
  },
};

describe('PlatformTeamInvitationsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: {
        permissions: [
          PLATFORM_PERMISSION.TEAM_READ,
          PLATFORM_PERMISSION.TEAM_INVITE,
          PLATFORM_PERMISSION.TEAM_INVITATION_RESEND,
          PLATFORM_PERMISSION.TEAM_INVITATION_REVOKE,
          PLATFORM_PERMISSION.ROLES_READ,
        ],
      },
    });
    mocks.useListPlatformTeamInvitationsQuery.mockReturnValue({
      data: {
        invitations: [invitation],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.resend.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue(invitation),
    }));
    mocks.revoke.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue(undefined),
    }));
  });

  afterEach(() => cleanup());

  it('affiche les données utiles de l’invitation active dans le DataTable partagé', () => {
    render(<PlatformTeamInvitationsSection />);

    expect(screen.getByRole('columnheader', { name: 'Destinataire' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Rôle prévu' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Envoi' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Expiration' })).toBeInTheDocument();
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
    expect(screen.getByText('marie@example.com')).toBeInTheDocument();
    expect(screen.getByText('Support technique')).toBeInTheDocument();
    expect(screen.getByText('Envoyée')).toBeInTheDocument();
  });

  it('ouvre le Drawer d’invitation uniquement avec team:invite et roles:read', async () => {
    const user = userEvent.setup();
    render(<PlatformTeamInvitationsSection />);

    expect(screen.queryByTestId('invitation-form-drawer')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Inviter un membre' }));
    expect(screen.getByTestId('invitation-form-drawer')).toBeInTheDocument();

    cleanup();
    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: {
        permissions: [
          PLATFORM_PERMISSION.TEAM_READ,
          PLATFORM_PERMISSION.TEAM_INVITE,
        ],
      },
    });
    render(<PlatformTeamInvitationsSection />);

    expect(
      screen.queryByRole('button', { name: 'Inviter un membre' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('confirme le renvoi avant d’appeler la mutation serveur', async () => {
    const user = userEvent.setup();
    render(<PlatformTeamInvitationsSection />);

    await user.click(screen.getByRole('button', {
      name: 'Renvoyer l’invitation à Marie Martin',
    }));

    expect(screen.getByRole('dialog', { name: 'Renvoyer l’invitation' })).toBeInTheDocument();
    expect(mocks.resend).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Renvoyer' }));

    expect(mocks.resend).toHaveBeenCalledWith('invitation-id');
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Invitation renvoyée',
      variant: 'success',
    }));
  });
});
