import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useGetWorkspaceSubscriptionQuery: vi.fn(),
  useListPublicPlansQuery: vi.fn(),
}));

vi.mock('@/features/subscription/api/subscription-api', () => ({
  useGetWorkspaceSubscriptionQuery: mocks.useGetWorkspaceSubscriptionQuery,
}));

vi.mock('@/features/plan/api/plan-api', () => ({
  useListPublicPlansQuery: mocks.useListPublicPlansQuery,
}));

vi.mock('@/features/plan/components/plan-card', () => ({
  PlanCard: ({ plan }) => <article>{plan.name}</article>,
}));

import { WorkspaceSubscriptionPage } from '@/features/subscription/pages/workspace-subscription-page';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };

const subscription = {
  baseline: {
    id: 'baseline-1',
    kind: 'baseline',
    status: 'active',
    plan: { id: 'plan-free', key: 'free', name: 'Free', features: [], limits: {} },
  },
  commercial: {
    id: 'commercial-1',
    kind: 'commercial',
    status: 'trialing',
    plan: { id: 'plan-premium', key: 'premium', name: 'Premium', features: [], limits: {} },
    currentPeriodStart: '2026-09-01T00:00:00.000Z',
    currentPeriodEnd: '2026-09-15T00:00:00.000Z',
    trialEndsAt: '2026-09-15T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    billingInterval: 'monthly',
    scheduledChange: null,
  },
  effectiveEntitlement: {
    plan: { id: 'plan-premium', key: 'premium', name: 'Premium', features: [], limits: {} },
    subscriptionKind: 'commercial',
    subscriptionStatus: 'trialing',
    accessMode: 'normal',
    reason: null,
    blockingLimits: [],
    nonBlockingLimits: [],
  },
};

function renderPage({ roleKey = 'owner' } = {}) {
  return render(
    <WorkspaceProvider
      membership={{ id: 'membership-1', role: { key: roleKey, name: roleKey } }}
      permissions={[WORKSPACE_PERMISSION.SUBSCRIPTION_READ]}
      workspace={workspace}
    >
      <WorkspaceSubscriptionPage />
    </WorkspaceProvider>,
  );
}

describe('WorkspaceSubscriptionPage', () => {
  beforeEach(() => {
    mocks.useGetWorkspaceSubscriptionQuery.mockReset();
    mocks.useListPublicPlansQuery.mockReset();

    mocks.useGetWorkspaceSubscriptionQuery.mockReturnValue({
      data: subscription,
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useListPublicPlansQuery.mockReturnValue({
      data: [
        { id: 'plan-free', key: 'free', name: 'Free' },
        { id: 'plan-premium', key: 'premium', name: 'Premium' },
      ],
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche le plan effectif, le trial actif et le catalogue', () => {
    renderPage();

    expect(mocks.useGetWorkspaceSubscriptionQuery).toHaveBeenCalledWith('workspace-1');
    expect(screen.getByRole('heading', { name: 'Abonnement' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Premium' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Période d’essai en cours' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Offres disponibles' })).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('ne présente pas un trial persistant comme actif après fallback serveur vers Free', () => {
    mocks.useGetWorkspaceSubscriptionQuery.mockReturnValue({
      data: {
        ...subscription,
        effectiveEntitlement: {
          ...subscription.effectiveEntitlement,
          plan: { id: 'plan-free', key: 'free', name: 'Free', features: [], limits: {} },
          subscriptionKind: 'baseline',
          subscriptionStatus: 'active',
        },
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.queryByRole('heading', { name: 'Période d’essai en cours' })).not.toBeInTheDocument();
  });

  it('explique à un admin que les commandes commerciales restent owner-only', () => {
    renderPage({ roleKey: 'admin' });

    expect(
      screen.getByText('Votre rôle permet la consultation de l’abonnement, mais seul le propriétaire peut modifier le contrat commercial.'),
    ).toBeInTheDocument();
  });

  it('affiche la remédiation fournie par le backend', () => {
    mocks.useGetWorkspaceSubscriptionQuery.mockReturnValue({
      data: {
        ...subscription,
        effectiveEntitlement: {
          ...subscription.effectiveEntitlement,
          accessMode: 'remediation',
          reason: 'plan_limits_exceeded',
          blockingLimits: [
            { key: 'members', usage: 8, limit: 5, excess: 3 },
            { key: 'storage_bytes', usage: 1200, limit: 1000, excess: 200 },
          ],
        },
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('Mise en conformité requise')).toBeInTheDocument();
    expect(
      screen.getByText('La consommation actuelle dépasse une ou plusieurs limites du plan effectif.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Limites concernées : Membres, Stockage.')).toBeInTheDocument();
  });

  it('permet de relancer la lecture après une erreur', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    mocks.useGetWorkspaceSubscriptionQuery.mockReturnValue({
      data: undefined,
      error: { status: 500 },
      isLoading: false,
      refetch,
    });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
