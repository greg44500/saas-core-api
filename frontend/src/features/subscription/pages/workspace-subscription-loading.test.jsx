import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useGetWorkspaceSubscriptionQuery: vi.fn(),
  useListPublicPlansQuery: vi.fn(),
}));

vi.mock('@/features/subscription/api/subscription-api', () => ({
  useEndWorkspaceTrialToFreeMutation: () => [vi.fn(), { isLoading: false }],
  useGetWorkspaceSubscriptionQuery: mocks.useGetWorkspaceSubscriptionQuery,
  useStartOrChangeWorkspaceTrialMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock('@/features/plan/api/plan-api', () => ({
  useListPublicPlansQuery: mocks.useListPublicPlansQuery,
}));

vi.mock('@/features/plan/components/plan-card', () => ({
  PlanCard: ({ plan }) => <article>{plan.name}</article>,
}));

vi.mock('@/features/subscription/components/subscription-summary-card', () => ({
  SubscriptionSummaryCard: () => <section>Résumé abonnement</section>,
}));

vi.mock('@/features/subscription/components/effective-plan-capabilities', () => ({
  EffectivePlanCapabilities: () => <section>Capabilities</section>,
}));

vi.mock('@/features/subscription/components/trial-progress', () => ({
  TrialProgress: () => null,
}));

vi.mock('@/features/subscription/components/commercial-lifecycle-section', () => ({
  CommercialLifecycleSection: () => null,
}));

vi.mock('@/features/subscription/components/end-trial-to-free-dialog', () => ({
  EndTrialToFreeDialog: () => null,
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({
    membership: { role: { key: 'owner' } },
    workspace: { id: 'workspace-1', name: 'Acme' },
  }),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { WorkspaceSubscriptionPage } from '@/features/subscription/pages/workspace-subscription-page';

const subscription = {
  baseline: { plan: { id: 'free', name: 'Free' } },
  commercial: null,
  effectiveEntitlement: {
    plan: { id: 'free', name: 'Free' },
    subscriptionKind: 'baseline',
    subscriptionStatus: 'active',
  },
  trialEligibility: { consumed: true },
};

describe('WorkspaceSubscriptionPage loading states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useListPublicPlansQuery.mockReturnValue({
      data: [],
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => cleanup());

  it('affiche la composition complète au premier chargement de la souscription', () => {
    mocks.useGetWorkspaceSubscriptionQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: true,
      refetch: vi.fn(),
    });

    render(<WorkspaceSubscriptionPage />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement de l’abonnement…',
    );
  });

  it('conserve la souscription et skeletonise seulement le catalogue encore absent', () => {
    mocks.useGetWorkspaceSubscriptionQuery.mockReturnValue({
      data: subscription,
      error: undefined,
      isFetching: true,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useListPublicPlansQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: true,
      refetch: vi.fn(),
    });

    render(<WorkspaceSubscriptionPage />);

    expect(screen.getByText('Résumé abonnement')).toBeInTheDocument();
    expect(screen.getByText('Chargement des offres…')).toBeInTheDocument();
    expect(screen.queryByText('Chargement de l’abonnement…')).not.toBeInTheDocument();
  });
});
