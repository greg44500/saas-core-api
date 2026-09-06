import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

const mocks = vi.hoisted(() => ({
  drilldownProps: vi.fn(),
  useGetPlatformAuditMetadataQuery: vi.fn(),
  useGetPlatformOverviewQuery: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-audit-logs-api', () => ({
  useGetPlatformAuditMetadataQuery: mocks.useGetPlatformAuditMetadataQuery,
}));

vi.mock('@/features/platform/api/platform-overview-api', () => ({
  useGetPlatformOverviewQuery: mocks.useGetPlatformOverviewQuery,
}));

vi.mock('@/features/platform/components/platform-entitlement-overrides-drilldown-drawer', () => ({
  PlatformEntitlementOverridesDrilldownDrawer: (props) => {
    mocks.drilldownProps(props);
    return props.open ? <div data-testid="active-overrides-drilldown">Dérogations drill-down</div> : null;
  },
}));

vi.mock('@/features/platform/components/platform-team-snapshot-card', () => ({
  PlatformTeamSnapshotSection: () => (
    <section aria-label="Organisation interne">
      <h2>Organisation interne</h2>
      <p>Snapshot équipe</p>
    </section>
  ),
}));

import { PlatformOverviewPage } from '@/features/platform/pages/platform-overview-page';

const AUDIT_METADATA = {
  actions: [
    { value: 'LOGIN_FAILED', label: 'Échec de connexion' },
  ],
  entityTypes: [
    { value: 'User', label: 'Utilisateur' },
  ],
  statuses: [
    { value: 'failed', label: 'Échouée' },
  ],
};

const OVERVIEW = {
  generatedAt: '2026-09-03T12:00:00.000Z',
  availableSections: {
    users: true,
    workspaces: true,
    plans: true,
    subscriptions: true,
    overrides: true,
    usage: true,
    files: true,
    audit: true,
  },
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
    items: [
      {
        id: 'audit_failed:audit-1',
        type: 'audit_failed',
        level: 'warning',
        state: 'current',
        resourceId: 'audit-1',
        workspace: { id: 'workspace-1', name: 'Acme' },
        referenceAt: '2026-09-03T11:00:00.000Z',
        context: {
          action: 'LOGIN_FAILED',
          entityType: 'User',
          entityId: 'user-1',
        },
      },
    ],
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
    mocks.drilldownProps.mockReset();
    mocks.useGetPlatformAuditMetadataQuery.mockReset();
    mocks.useGetPlatformOverviewQuery.mockReset();
    mocks.useGetPlatformAuditMetadataQuery.mockReturnValue({
      data: AUDIT_METADATA,
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    mocks.useGetPlatformOverviewQuery.mockReturnValue({
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
    expect(screen.getByRole('region', { name: 'Organisation interne' })).toBeInTheDocument();
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

  it('ouvre le drill-down des dérogations actives depuis un compteur non nul', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByTestId('active-overrides-drilldown')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir les dérogations actives' }));

    expect(screen.getByTestId('active-overrides-drilldown')).toBeInTheDocument();
    expect(mocks.drilldownProps).toHaveBeenLastCalledWith(expect.objectContaining({
      lifecycle: 'active',
      open: true,
      title: 'Dérogations actives',
    }));
  });

  it('utilise la période canonique backend par défaut puis transmet un preset différent à RTK Query', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(mocks.useGetPlatformOverviewQuery.mock.calls[0][0]).toEqual({});

    await user.selectOptions(
      screen.getByLabelText('Période d’analyse'),
      '90d',
    );

    const lastArgs = mocks.useGetPlatformOverviewQuery.mock.calls.at(-1)[0];
    const duration = new Date(lastArgs.to).getTime() - new Date(lastArgs.from).getTime();

    expect(duration).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it('réserve le détail Usage aux fichiers avec un dépliage accessible et des icônes colorées', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    const toggle = screen.getAllByRole('button', { name: 'Afficher le détail' })[0];
    const details = document.getElementById(toggle.getAttribute('aria-controls'));

    expect(details).toHaveAttribute('aria-hidden', 'true');
    expect(details).toHaveAttribute('data-state', 'closed');

    await user.click(toggle);

    expect(details).toHaveAttribute('aria-hidden', 'false');
    expect(details).toHaveAttribute('data-state', 'open');
    expect(screen.getByText('Répartition par nombre de fichiers')).toBeInTheDocument();
    expect(screen.getByText('Répartition du stockage par type')).toBeInTheDocument();

    const fileCountLabel = screen.getByText('Fichiers actifs');
    expect(fileCountLabel.nextElementSibling).toHaveTextContent('10');
    expect(screen.getAllByText('PDF').length).toBeGreaterThan(0);
    expect(screen.getByText('6 fichiers · 60 %')).toBeInTheDocument();
    expect(container.querySelectorAll('svg.text-red-500').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('svg.text-sky-500').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('svg.text-emerald-500').length).toBeGreaterThan(0);
    expect(screen.queryByText('Téléversements mensuels')).not.toBeInTheDocument();
  });

  it('affiche le DataTable des points prioritaires avec les métadonnées Audit autorisées', () => {
    renderPage();

    const attention = screen.getByRole('region', {
      name: 'Points nécessitant une attention',
    });
    const table = within(attention).getByRole('table');

    expect(mocks.useGetPlatformAuditMetadataQuery).toHaveBeenCalledWith(
      undefined,
      { skip: false },
    );
    expect(within(table).getByText('Audit en échec')).toBeInTheDocument();
    expect(within(table).getByText('Acme')).toBeInTheDocument();
    expect(within(table).getByText('Échec de connexion · Utilisateur')).toBeInTheDocument();
    expect(within(table).getByText('À vérifier')).toHaveClass('text-warning');
    expect(within(attention).getByText(/1 point prioritaire affiché sur 10 signaux détectés/)).toBeInTheDocument();
  });

  it('compose une vue commerciale sans exposer les signaux Audit ni charger leurs métadonnées', () => {
    mocks.useGetPlatformOverviewQuery.mockReturnValue({
      data: {
        ...OVERVIEW,
        availableSections: {
          ...OVERVIEW.availableSections,
          audit: false,
        },
        attention: {
          totalSignals: 8,
          counts: {
            pastDueSubscriptions: 3,
            suspendedWorkspaces: 2,
            trialsExpiringNext7Days: 2,
            overridesExpiringNext7Days: 1,
          },
          items: [],
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch,
    });

    renderPage();

    expect(mocks.useGetPlatformAuditMetadataQuery).toHaveBeenCalledWith(
      undefined,
      { skip: true },
    );
    expect(screen.getByText('Dérogations actives')).toBeInTheDocument();
    expect(screen.queryByText('Audits en échec')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit en échec')).not.toBeInTheDocument();
  });

  it('compose une vue support client sans Audit ni Dérogations', () => {
    mocks.useGetPlatformOverviewQuery.mockReturnValue({
      data: {
        ...OVERVIEW,
        availableSections: {
          ...OVERVIEW.availableSections,
          overrides: false,
          audit: false,
        },
        overrides: undefined,
        attention: {
          totalSignals: 7,
          counts: {
            pastDueSubscriptions: 3,
            suspendedWorkspaces: 2,
            trialsExpiringNext7Days: 2,
          },
          items: [],
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch,
    });

    renderPage();

    expect(screen.getByText('Abonnements actifs')).toBeInTheDocument();
    expect(screen.queryByText('Dérogations actives')).not.toBeInTheDocument();
    expect(screen.queryByText('Dérogations programmées')).not.toBeInTheDocument();
    expect(screen.queryByText('Audits en échec')).not.toBeInTheDocument();
  });

  it('reste fail-closed si le backend ne fournit pas availableSections', () => {
    mocks.useGetPlatformOverviewQuery.mockReturnValue({
      data: {
        generatedAt: OVERVIEW.generatedAt,
        kpis: OVERVIEW.kpis,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch,
    });

    renderPage();

    expect(mocks.useGetPlatformAuditMetadataQuery).toHaveBeenCalledWith(
      undefined,
      { skip: true },
    );
    expect(screen.queryByRole('region', { name: 'Indicateurs principaux' })).not.toBeInTheDocument();
    expect(screen.getByText(/aucun indicateur métier supplémentaire/i)).toBeInTheDocument();
  });

  it('conserve le shell du dashboard et signale une erreur de chargement', () => {
    mocks.useGetPlatformOverviewQuery.mockReturnValue({
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