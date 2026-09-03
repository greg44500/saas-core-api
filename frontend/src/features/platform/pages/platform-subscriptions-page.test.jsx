import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  useCancelPlatformSubscriptionMutation: vi.fn(),
  useGetPlatformSubscriptionQuery: vi.fn(),
  useGrantPlatformSubscriptionTrialMutation: vi.fn(),
  useListPlatformPlansQuery: vi.fn(),
  useListPlatformSubscriptionsQuery: vi.fn(),
  useListPlatformWorkspacesQuery: vi.fn(),
  useResumePlatformSubscriptionMutation: vi.fn(),
  useUpdatePlatformSubscriptionMutation: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-subscriptions-api', () => ({
  useCancelPlatformSubscriptionMutation: mocks.useCancelPlatformSubscriptionMutation,
  useGetPlatformSubscriptionQuery: mocks.useGetPlatformSubscriptionQuery,
  useGrantPlatformSubscriptionTrialMutation: mocks.useGrantPlatformSubscriptionTrialMutation,
  useListPlatformSubscriptionsQuery: mocks.useListPlatformSubscriptionsQuery,
  useResumePlatformSubscriptionMutation: mocks.useResumePlatformSubscriptionMutation,
  useUpdatePlatformSubscriptionMutation: mocks.useUpdatePlatformSubscriptionMutation,
}));

vi.mock('@/features/platform/api/platform-plans-api', () => ({
  useListPlatformPlansQuery: mocks.useListPlatformPlansQuery,
}));

vi.mock('@/features/platform/api/platform-workspaces-api', () => ({
  useListPlatformWorkspacesQuery: mocks.useListPlatformWorkspacesQuery,
}));

import { PlatformSubscriptionsPage } from '@/features/platform/pages/platform-subscriptions-page';

const subscription = {
  id: '507f1f77bcf86cd799439011',
  workspace: { id: '507f1f77bcf86cd799439012', name: 'Workspace Démo' },
  plan: { id: '507f1f77bcf86cd799439013', key: 'premium', name: 'Premium' },
  kind: 'commercial',
  status: 'active',
  currentPeriodStart: '2026-09-01T00:00:00.000Z',
  currentPeriodEnd: '2026-10-01T00:00:00.000Z',
  trialEndsAt: null,
  cancelAtPeriodEnd: false,
  billingInterval: 'monthly',
  currency: 'EUR',
  priceExclTaxMinor: 7900,
  manualOverride: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

function mutationState() {
  return [vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })), { isLoading: false }];
}

function renderPage() {
  return render(
    <ToastProvider>
      <PlatformSubscriptionsPage />
    </ToastProvider>,
  );
}

describe('PlatformSubscriptionsPage', () => {
  beforeEach(() => {
    mocks.useListPlatformSubscriptionsQuery.mockReturnValue({
      data: {
        subscriptions: [subscription],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useGetPlatformSubscriptionQuery.mockReturnValue({
      data: subscription,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useListPlatformPlansQuery.mockReturnValue({
      data: { plans: [{ ...subscription.plan, status: 'active', trialEnabled: true }] },
      error: undefined,
      isLoading: false,
    });
    mocks.useListPlatformWorkspacesQuery.mockReturnValue({
      data: { workspaces: [subscription.workspace] },
      error: undefined,
      isLoading: false,
    });
    mocks.useCancelPlatformSubscriptionMutation.mockReturnValue(mutationState());
    mocks.useGrantPlatformSubscriptionTrialMutation.mockReturnValue(mutationState());
    mocks.useResumePlatformSubscriptionMutation.mockReturnValue(mutationState());
    mocks.useUpdatePlatformSubscriptionMutation.mockReturnValue(mutationState());
  });

  it('affiche la liste via le tableau partagé', () => {
    renderPage();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Workspace Démo')).toBeInTheDocument();
    expect(within(table).getByText('Premium')).toBeInTheDocument();
    expect(within(table).getByText(/79,00\s*€/)).toBeInTheDocument();
  });

  it('ouvre le détail de la souscription', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));

    expect(screen.getByRole('dialog', { name: 'Workspace Démo' })).toBeInTheDocument();
  });

  it('ouvre le formulaire d’attribution de trial', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Accorder un trial' }));

    expect(screen.getByRole('dialog', { name: 'Accorder un trial' })).toBeInTheDocument();
    expect(screen.getByLabelText('Workspace')).toBeInTheDocument();
    expect(screen.getByLabelText('Plan')).toBeInTheDocument();
  });
});
