import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

const useGetPlatformOverviewQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/platform/api/platform-overview-api', () => ({
  useGetPlatformOverviewQuery: useGetPlatformOverviewQueryMock,
}));

import { PlatformOverviewPage } from '@/features/platform/pages/platform-overview-page';

const OVERVIEW = {
  generatedAt: '2026-09-03T12:00:00.000Z',
  kpis: {
    users: {
      total: 100,
      createdInPeriod: 10,
      createdInPreviousPeriod: 5,
      changePercent: 100,
    },
    workspaces: {
      total: 50,
      createdInPeriod: 4,
      createdInPreviousPeriod: 2,
      changePercent: 100,
    },
    activeCommercialSubscriptions: 20,
    contractedMrrEstimate: {
      basis: 'gross_before_discounts',
      isRevenue: false,
      byCurrency: [
        { currency: 'EUR', amountMinor: 23700 },
      ],
    },
  },
  planDistribution: [
    {
      plan: { id: 'premium-plan', key: 'premium', name: 'Premium' },
      workspaceCount: 30,
      percentage: 60,
    },
    {
      plan: { id: 'free-plan', key: 'free', name: 'Free' },
      workspaceCount: 20,
      percentage: 40,
    },
  ],
  subscriptionHealth: {
    activeCommercial: 20,
    activeTrials: 4,
    trialsExpiringNext7Days: 2,
    cancellationScheduled: 1,
    downgradeScheduled: 3,
  },
  overrides: {
    active: 5,
    scheduled: 2,
    expiringNext7Days: 1,
  },
  usage: [
    { key: 'members', value: 120 },
    { key: 'storage_bytes', value: 1048576 },
    { key: 'file_uploads_monthly', value: 48 },
  ],
  attention: {
    totalSignals: 10,
    counts: {
      pastDueSubscriptions: 3,
      suspendedWorkspaces: 2,
      failedAuditEvents: 2,
      trialsExpiringNext7Days: 2,
      overridesExpiringNext7Days: 1,
    },
    recentFailedAuditEvents: [],
  },
};

function renderPage(initialEntry = '/platform/overview') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PlatformOverviewPage />
    </MemoryRouter>,
  );
}

describe('PlatformOverviewPage', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    refetch.mockReset();
    useGetPlatformOverviewQueryMock.mockReset();
    useGetPlatformOverviewQueryMock.mockReturnValue({
      data: OVERVIEW,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch,
    });
  });

  afterEach(() => cleanup());

  it('affiche les agrégats réels dans la vue d’ensemble francisée', () => {
    renderPage();

    const kpis = screen.getByRole('region', { name: 'Indicateurs principaux' });
    const attention = screen.getByRole('region', { name: 'Points nécessitant une attention' });

    expect(screen.getByRole('heading', { name: 'Vue d’ensemble' })).toBeInTheDocument();
    expect(screen.getByText('Plateforme')).toBeInTheDocument();
    expect(within(kpis).getByText('100')).toBeInTheDocument();
    expect(within(kpis).getByText('50')).toBeInTheDocument();
    expect(within(kpis).getByText('20')).toBeInTheDocument();
    expect(within(kpis).getByText(/237,00/)).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText(/30 · 60/)).toBeInTheDocument();
    expect(within(attention).getByText('10')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Croissance et répartition' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Santé et exploitation' })).toBeInTheDocument();
  });

  it('utilise la période canonique backend par défaut puis transmet un preset différent à RTK Query', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(useGetPlatformOverviewQueryMock.mock.calls[0][0]).toEqual({});

    await user.selectOptions(
      screen.getByLabelText('Période d’analyse'),
      '90d',
    );

    const lastArgs = useGetPlatformOverviewQueryMock.mock.calls.at(-1)[0];
    const duration = new Date(lastArgs.to).getTime() - new Date(lastArgs.from).getTime();

    expect(duration).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it('permet de révéler les informations secondaires avec les données serveur', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByText('Téléversements mensuels')).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole('button', { name: 'Afficher le détail' })[0],
    );

    expect(screen.getByText('Téléversements mensuels')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
  });

  it('conserve le shell du dashboard et signale une erreur de chargement', () => {
    useGetPlatformOverviewQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch,
    });

    renderPage();

    expect(screen.getByRole('heading', { name: 'Vue d’ensemble' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/impossible de charger/i);
  });
});
