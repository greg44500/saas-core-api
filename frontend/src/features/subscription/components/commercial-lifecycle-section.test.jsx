import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revokeCancellation: vi.fn(),
  revokeDowngrade: vi.fn(),
  scheduleCancellation: vi.fn(),
  scheduleDowngrade: vi.fn(),
  useRevokeWorkspaceCancellationMutation: vi.fn(),
  useRevokeWorkspaceDowngradeMutation: vi.fn(),
  useScheduleWorkspaceCancellationMutation: vi.fn(),
  useScheduleWorkspaceDowngradeMutation: vi.fn(),
}));

vi.mock('@/features/subscription/api/subscription-api', () => ({
  useRevokeWorkspaceCancellationMutation: mocks.useRevokeWorkspaceCancellationMutation,
  useRevokeWorkspaceDowngradeMutation: mocks.useRevokeWorkspaceDowngradeMutation,
  useScheduleWorkspaceCancellationMutation: mocks.useScheduleWorkspaceCancellationMutation,
  useScheduleWorkspaceDowngradeMutation: mocks.useScheduleWorkspaceDowngradeMutation,
}));

import { CommercialLifecycleSection } from '@/features/subscription/components/commercial-lifecycle-section';

const plans = [
  {
    id: 'free',
    key: 'free',
    name: 'Free',
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 0,
    priceYearlyExclTaxMinor: 0,
  },
  {
    id: 'standard',
    key: 'standard',
    name: 'Standard',
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 4900,
    priceYearlyExclTaxMinor: 49000,
  },
  {
    id: 'premium',
    key: 'premium',
    name: 'Premium',
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 7900,
    priceYearlyExclTaxMinor: 79000,
  },
];

const commercial = {
  id: 'subscription-1',
  status: 'active',
  plan: { id: 'premium', name: 'Premium' },
  billingInterval: 'monthly',
  currentPeriodEnd: '2026-10-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  scheduledChange: null,
};

function setupMutationMocks() {
  mocks.useScheduleWorkspaceCancellationMutation.mockReturnValue([
    mocks.scheduleCancellation,
    { isLoading: false },
  ]);
  mocks.useRevokeWorkspaceCancellationMutation.mockReturnValue([
    mocks.revokeCancellation,
    { isLoading: false },
  ]);
  mocks.useScheduleWorkspaceDowngradeMutation.mockReturnValue([
    mocks.scheduleDowngrade,
    { isLoading: false },
  ]);
  mocks.useRevokeWorkspaceDowngradeMutation.mockReturnValue([
    mocks.revokeDowngrade,
    { isLoading: false },
  ]);
}

function renderSection(overrides = {}) {
  return render(
    <CommercialLifecycleSection
      commercial={commercial}
      isOwner
      onFeedback={vi.fn()}
      plans={plans}
      workspaceId="workspace-1"
      {...overrides}
    />,
  );
}

describe('CommercialLifecycleSection', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    setupMutationMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('reste invisible pour un utilisateur qui n’est pas owner', () => {
    renderSection({ isOwner: false });

    expect(screen.queryByRole('heading', { name: 'Gestion du contrat commercial' })).not.toBeInTheDocument();
  });

  it('programme une résiliation avec une date d’effet explicite et un motif trimé', async () => {
    const user = userEvent.setup();
    const onFeedback = vi.fn();
    const unwrap = vi.fn().mockResolvedValue({});
    mocks.scheduleCancellation.mockReturnValue({ unwrap });

    renderSection({ onFeedback });

    await user.click(screen.getByRole('button', { name: 'Programmer la résiliation' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('01/10/2026');

    await user.type(
      screen.getByLabelText('Motif facultatif'),
      '  Offre devenue inutile  ',
    );
    await user.click(screen.getByRole('button', { name: 'Confirmer la résiliation' }));

    expect(mocks.scheduleCancellation).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      subscriptionId: 'subscription-1',
      reason: 'Offre devenue inutile',
    });
    expect(onFeedback).toHaveBeenCalledWith({
      type: 'success',
      message: 'La résiliation est programmée pour le 01/10/2026.',
    });
  });

  it('programme uniquement un downgrade présenté comme compatible', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockResolvedValue({});
    mocks.scheduleDowngrade.mockReturnValue({ unwrap });

    renderSection();

    await user.click(
      screen.getByRole('button', { name: 'Programmer un changement de plan' }),
    );

    expect(screen.getByLabelText('Offre cible')).toHaveValue('standard');
    expect(screen.queryByRole('option', { name: 'Free' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmer le changement' }));

    expect(mocks.scheduleDowngrade).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      subscriptionId: 'subscription-1',
      targetPlanId: 'standard',
    });
  });

  it('ne propose plus de downgrade lorsqu’une résiliation est déjà programmée', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockResolvedValue({});
    mocks.revokeCancellation.mockReturnValue({ unwrap });

    renderSection({
      commercial: {
        ...commercial,
        cancelAtPeriodEnd: true,
      },
    });

    expect(screen.getByText('Résiliation programmée')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Programmer un changement de plan' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Conserver mon abonnement' }));
    await user.click(screen.getByRole('dialog').querySelector('button:not([variant])') ?? screen.getAllByRole('button', { name: 'Conserver l’abonnement' })[0]);
  });

  it('révoque un downgrade déjà programmé sans exposer une seconde transition', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockResolvedValue({});
    mocks.revokeDowngrade.mockReturnValue({ unwrap });

    renderSection({
      commercial: {
        ...commercial,
        scheduledChange: {
          type: 'downgrade',
          targetPlan: { id: 'standard', name: 'Standard' },
          effectiveAt: '2026-10-01T00:00:00.000Z',
        },
      },
    });

    expect(screen.getByText('Changement de plan programmé')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Programmer la résiliation' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Annuler le changement programmé' }));
    await user.click(screen.getByRole('button', { name: 'Annuler le changement' }));

    expect(mocks.revokeDowngrade).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      subscriptionId: 'subscription-1',
    });
  });
});
