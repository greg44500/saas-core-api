import {
  cleanup,
  render,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const mocks = vi.hoisted(() => ({
  useGetCurrentPlatformContextQuery: vi.fn(),
  useListPlatformTeamInvitationsQuery: vi.fn(),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: mocks.useGetCurrentPlatformContextQuery,
}));

vi.mock('@/features/platform/api/platform-invitations-api', () => ({
  useListPlatformTeamInvitationsQuery: mocks.useListPlatformTeamInvitationsQuery,
  useResendPlatformTeamInvitationMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useRevokePlatformTeamInvitationMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
}));

vi.mock('@/features/platform/components/platform-invitation-form-drawer', () => ({
  PlatformInvitationFormDrawer: () => null,
}));

import { PlatformTeamInvitationsSection } from '@/features/platform/components/platform-team-invitations-section';

const NOW = new Date('2026-09-07T12:00:00.000Z');

const invitation = {
  id: 'invitation-id',
  firstName: 'Commercial',
  lastName: 'Service',
  email: 'support.commercial.test@example.com',
  status: 'pending',
  deliveryStatus: 'sent',
  createdAt: '2026-09-07T11:59:00.000Z',
  lastDeliveryAttemptAt: '2026-09-07T11:59:00.000Z',
  deliveredAt: '2026-09-07T11:59:00.000Z',
  expiresAt: '2026-09-14T12:00:00.000Z',
  role: {
    id: 'role-id',
    key: 'commercial_support',
    name: 'Support commercial',
  },
};

function renderSection() {
  return render(
    <TooltipProvider delay={0}>
      <PlatformTeamInvitationsSection now={NOW} />
    </TooltipProvider>,
  );
}

describe('PlatformTeamInvitationsSection UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: {
        permissions: [
          PLATFORM_PERMISSION.TEAM_READ,
          PLATFORM_PERMISSION.TEAM_INVITATION_RESEND,
          PLATFORM_PERMISSION.TEAM_INVITATION_REVOKE,
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
  });

  afterEach(() => cleanup());

  it('utilise un tableau fixe sans scroll horizontal', () => {
    renderSection();

    const table = screen.getByRole('table');

    expect(table).toHaveClass('table-fixed');
    expect(table.parentElement).toHaveClass('overflow-x-hidden');
  });

  it('affiche des tooltips courts sans dégrader les libellés accessibles', async () => {
    const user = userEvent.setup();
    renderSection();

    const resendButton = screen.getByRole('button', {
      name: 'Renvoyer l’invitation à Commercial Service',
    });
    const revokeButton = screen.getByRole('button', {
      name: 'Révoquer l’invitation de Commercial Service',
    });

    await user.hover(resendButton);
    expect(await screen.findByText('Renvoyer')).toBeInTheDocument();

    await user.unhover(resendButton);
    await waitForElementToBeRemoved(() => screen.queryByText('Renvoyer'));

    await user.hover(revokeButton);
    expect(await screen.findByText('Révoquer')).toBeInTheDocument();
  });
});
