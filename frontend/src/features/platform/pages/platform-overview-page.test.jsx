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
  files: {
    totalCount: 10,
    totalSizeBytes: 1048576,
    byType: [
      {
        mimeType: 'application/pdf',
        extensions: ['pdf'],
        count: 6,
        sizeBytes: 734003,
        percentageOfCount: 60,
        percentageOfStorage: 70,
      },
      {
        mimeType: 'image/jpeg',
        extensions: ['jpg', 'jpeg'],
        count: 3,
        sizeBytes: 262144,
        percentageOfCount: 30,
        percentageOfStorage: 25,
      },
      {
        mimeType: 'image/png',
        extensions: ['png'],
        count: 1,
        sizeBytes: 52429,
        percentageOfCount: 10,
        percentageOfStorage: 5,
      },
    ],
  },
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

  it('affiche les agrégats réels avec des libellés immédiatement compréhensibles en français', () => {
    renderPage();

    const kpis = screen.getByRole('region', { name: 'Indicateurs principaux' });
    const attention = screen.getByRole('region', { name: 'Points nécessitant une attention' });

    expect(screen.getByRole('heading', { name: 'Vue d’ensemble' })).toBeInTheDocument();
    expect(screen.getByText('Plateforme')).toBeInTheDocument();
    expect(within(kpis).getByText('100')).toBeInTheDocument();
    expect(within(kpis).getByText('50')).toBeInTheDocument();
    expect(within(kpis).getByText('20')).toBeInTheDocument();
    expect(within(kpis).getByText(/237,00/)).toBeInTheDocument();
    expect(within(kpis).getByText('Valeur mensuelle contractuelle estimée')).toBeInTheDocument();
    expect(within(attention).getByText('Abonnements en retard')).toBeInTheDocument();
    expect(within(attention).queryByText('Past due')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Croissance et répartition' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Santé et exploitation' })).toBeInTheDocument();
  });

  it('visualise la croissance et la répartition sans recalculer les agrégats backend', () => {
    renderPage();

    const growth = screen.getByRole('group', {
      name: 'Comparaison de la croissance de la plateforme',
    });
    const distribution = screen.getByRole('group', {
      name: 'Répartition des espaces de travail par plan effectif',
    });

    expect(within(growth).getByText('Nouveaux utilisateurs')).toBeInTheDocument();
    expect(within(growth).getByText('10')).toBeInTheDocument();
    expect(within(growth).getByText('5')).toBeInTheDocument();
    expect(within(distribution).getByText('Premium')).toBeInTheDocument();
    expect(within(distribution).getByText('30 espaces · 60 %')).toBeInTheDocument();
    expect(within(distribution).getByText('20 espaces · 40 %')).toBeInTheDocument();
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

  it('réserve le détail Usage à des informations complémentaires sur les fichiers', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByText('Répartition par nombre de fichiers')).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole('button', { name: 'Afficher le détail' })[0],
    );

    expect(screen.getByText('Répartition par nombre de fichiers')).toBeInTheDocument();
    expect(screen.getByText('Répartition du stockage par type')).toBeInTheDocument();

    const fileCountLabel = screen.getByText('Fichiers actifs');
    expect(fileCountLabel.nextElementSibling).toHaveTextContent('10');
    expect(screen.getAllByText('PDF').length).toBeGreaterThan(0);
    expect(screen.getByText('6 fichiers · 60 %')).toBeInTheDocument();
    expect(screen.queryByText('Téléversements mensuels')).not.toBeInTheDocument();
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
