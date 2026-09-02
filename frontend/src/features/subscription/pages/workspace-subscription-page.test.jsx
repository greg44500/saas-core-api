import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  endTrialToFree: vi.fn(),
  startOrChangeTrial: vi.fn(),
  useEndWorkspaceTrialToFreeMutation: vi.fn(),
  useGetWorkspaceSubscriptionQuery: vi.fn(),
  useListPublicPlansQuery: vi.fn(),
  useStartOrChangeWorkspaceTrialMutation: vi.fn(),
}));

vi.mock('@/features/subscription/api/subscription-api', () => ({
  useEndWorkspaceTrialToFreeMutation: mocks.useEndWorkspaceTrialToFreeMutation,
  useGetWorkspaceSubscriptionQuery: mocks.useGetWorkspaceSubscriptionQuery,
  useStartOrChangeWorkspaceTrialMutation: mocks.useStartOrChangeWorkspaceTrialMutation,
}));

vi.mock('@/features/plan/api/plan-api', () => ({
  useListPublicPlansQuery: mocks.useListPublicPlansQuery,
}));

vi.mock('@/features/plan/components/plan-card', () => ({
  PlanCard: ({ children, plan }) => (
    <article>
      <span>{plan.name}</span>
      {children}
    </article>
  ),
}));

import { WorkspaceSubscriptionPage } from '@/features/subscription/pages/workspace-subscription-page';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const freePlan = {
  id: 'plan-free',
  key: 'free',
  name: 'Free',
  trialEnabled: false,
  trialDurationDays: 0,
};
const premiumPlan = {
  id: 'plan-premium',
  key: 'premium',
  name: 'Premium',
  trialEnabled: true,
  trialDurationDays: 14,
  features: ['file_upload', 'team_management', 'audit_logs'],
  limits: {
    members: 5,
    storage_bytes: 104857600,
    file_uploads_monthly: 50,
  },
};
const aiPlan = {
  id: 'plan-ai',
  key: 'ai',
  name: 'IA',
  trialEnabled: true,
  trialDurationDays: 14,
};

const subscription = {
  baseline: {
    id: 'baseline-1',
    kind: 'baseline',
    status: 'active',
    plan: { ...freePlan, features: [], limits: {} },
  },
  commercial: {
    id: 'commercial-1',
    kind: 'commercial',
    status: 'trialing',
    plan: premiumPlan,
    currentPeriodStart: '2026-09-01T00:00:00.000Z',
    currentPeriodEnd: '2026-09-15T00:00:00.000Z',
    trialEndsAt: '2026-09-15T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    billingInterval: 'monthly',
    scheduledChange: null,
  },
  effectiveEntitlement: {
    plan: premiumPlan,
    subscriptionKind: 'commercial',
    subscriptionStatus: 'trialing',
    accessMode: 'normal',
    reason: null,
    blockingLimits: [],
    nonBlockingLimits: [],
  },
  trialEligibility: {
    consumed: true,
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
    mocks.endTrialToFree.mockReset();
    mocks.startOrChangeTrial.mockReset();
    mocks.useEndWorkspaceTrialToFreeMutation.mockReset();
    mocks.useGetWorkspaceSubscriptionQuery.mockReset();
    mocks.useListPublicPlansQuery.mockReset();
    mocks.useStartOrChangeWorkspaceTrialMutation.mockReset();

    mocks.useGetWorkspaceSubscriptionQuery.mockReturnValue({
      data: subscription,
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useListPublicPlansQuery.mockReturnValue({
      data: [freePlan, premiumPlan, aiPlan],
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useStartOrChangeWorkspaceTrialMutation.mockReturnValue([
      mocks.startOrChangeTrial,
      { isLoading: false },
    ]);
    mocks.useEndWorkspaceTrialToFreeMutation.mockReturnValue([
      mocks.endTrialToFree,
      { isLoading: false },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche le plan effectif, ses capabilities, le trial actif et le catalogue', () => {
    renderPage();

    expect(mocks.useGetWorkspaceSubscriptionQuery).toHaveBeenCalledWith('workspace-1');
    expect(screen.getByRole('heading', { name: 'Abonnement' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Premium' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fonctionnalités et limites' })).toBeInTheDocument();
    expect(screen.getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(screen.getByText('Gestion d’équipe')).toBeInTheDocument();
    expect(screen.getByText('Journal d’activité')).toBeInTheDocument();
    expect(screen.getByText('100 Mo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Période d’essai en cours' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Offres disponibles' })).toBeInTheDocument();
    expect(screen.getByLabelText('Périodicité de référence')).toBeInTheDocument();
    expect(screen.getByText('Aucun moyen de paiement n’est demandé pendant l’essai.')).toBeInTheDocument();
  });

  it('change de plan pendant le trial sans promettre de nouvelle durée', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockResolvedValue({ id: 'commercial-1' });
    mocks.startOrChangeTrial.mockReturnValue({ unwrap });

    renderPage();

    await user.selectOptions(screen.getByLabelText('Périodicité de référence'), 'yearly');
    await user.click(screen.getByRole('button', { name: 'Tester ce plan pendant l’essai' }));

    expect(mocks.startOrChangeTrial).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      planId: 'plan-ai',
      billingInterval: 'yearly',
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Le trial utilise maintenant le plan IA. Sa date de fin reste inchangée.',
    );
  });

  it('confirme le retour Free et rappelle la consommation définitive de l’éligibilité', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockResolvedValue({ id: 'commercial-1' });
    mocks.endTrialToFree.mockReturnValue({ unwrap });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Revenir au plan Free' }));

    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Votre éligibilité restera consommée',
    );

    await user.click(
      screen.getByRole('button', { name: 'Mettre fin à l’essai et revenir à Free' }),
    );

    expect(mocks.endTrialToFree).toHaveBeenCalledWith({ workspaceId: 'workspace-1' });
  });

  it('ne repropose pas un trial déjà consommé après fallback serveur vers Free', () => {
    mocks.useGetWorkspaceSubscriptionQuery.mockReturnValue({
      data: {
        ...subscription,
        commercial: {
          ...subscription.commercial,
          status: 'canceled',
        },
        effectiveEntitlement: {
          ...subscription.effectiveEntitlement,
          plan: { ...freePlan, features: [], limits: {} },
          subscriptionKind: 'baseline',
          subscriptionStatus: 'active',
        },
        trialEligibility: { consumed: true },
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.queryByRole('heading', { name: 'Période d’essai en cours' })).not.toBeInTheDocument();
    expect(screen.getByText('L’essai gratuit a déjà été consommé pour cette identité.')).toBeInTheDocument();
    expect(screen.getAllByText('Essai déjà utilisé')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Démarrer l’essai/ })).not.toBeInTheDocument();
  });

  it('permet à un owner éligible de démarrer un premier trial', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockResolvedValue({ id: 'commercial-new' });
    mocks.startOrChangeTrial.mockReturnValue({ unwrap });
    mocks.useGetWorkspaceSubscriptionQuery.mockReturnValue({
      data: {
        baseline: subscription.baseline,
        commercial: null,
        effectiveEntitlement: {
          ...subscription.effectiveEntitlement,
          plan: { ...freePlan, features: [], limits: {} },
          subscriptionKind: 'baseline',
          subscriptionStatus: 'active',
        },
        trialEligibility: { consumed: false },
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();
    await user.click(screen.getAllByRole('button', { name: 'Démarrer l’essai de 14 jours' })[0]);

    expect(mocks.startOrChangeTrial).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      planId: 'plan-premium',
      billingInterval: 'monthly',
    });
  });

  it('explique à un admin que les commandes commerciales restent owner-only', () => {
    renderPage({ roleKey: 'admin' });

    expect(
      screen.getByText('Votre rôle permet la consultation de l’abonnement, mais seul le propriétaire peut modifier le contrat commercial.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /essai/i })).not.toBeInTheDocument();
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
