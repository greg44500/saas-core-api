import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';

import { ToastProvider } from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  revokeOverride: vi.fn(),
  updateOverride: vi.fn(),
  useGetPlatformEntitlementOverrideQuery: vi.fn(),
  useListPlatformEntitlementOverridesQuery: vi.fn(),
  useRevokePlatformEntitlementOverrideMutation: vi.fn(),
  useUpdatePlatformEntitlementOverrideMutation: vi.fn(),
  useListPlatformPlanCapabilitiesQuery: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-entitlement-overrides-api', () => ({
  useGetPlatformEntitlementOverrideQuery: mocks.useGetPlatformEntitlementOverrideQuery,
  useListPlatformEntitlementOverridesQuery: mocks.useListPlatformEntitlementOverridesQuery,
  useRevokePlatformEntitlementOverrideMutation: mocks.useRevokePlatformEntitlementOverrideMutation,
  useUpdatePlatformEntitlementOverrideMutation: mocks.useUpdatePlatformEntitlementOverrideMutation,
}));

vi.mock('@/features/platform/api/platform-plans-api', () => ({
  useListPlatformPlanCapabilitiesQuery: mocks.useListPlatformPlanCapabilitiesQuery,
}));

vi.mock('@/features/platform/components/platform-entitlement-override-form', () => ({
  PlatformEntitlementOverrideForm: ({ mode, onCancel }) => (
    <div>
      <p>Formulaire {mode}</p>
      <button onClick={onCancel} type="button">Annuler la modification</button>
    </div>
  ),
}));

import { PlatformEntitlementOverridesDrilldownDrawer } from '@/features/platform/components/platform-entitlement-overrides-drilldown-drawer';

const override = {
  id: 'override-id',
  workspace: { id: 'workspace-id', name: 'Workspace Démo' },
  targetType: 'feature',
  featureKey: 'file_upload',
  metricKey: null,
  featureEnabled: true,
  limitValue: null,
  source: 'administrative',
  startsAt: '2026-09-04T08:00:00.000Z',
  endsAt: null,
  lifecycle: 'active',
  reason: 'Accès exceptionnel',
  grantedBy: { id: 'admin-id', firstName: 'Super', lastName: 'Admin' },
  updatedBy: null,
  revokedAt: null,
  revokedBy: null,
  revokeReason: null,
  createdAt: '2026-09-04T08:00:00.000Z',
  updatedAt: '2026-09-04T08:00:00.000Z',
};

function resolvedMutation(mock) {
  mock.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  return [mock, { isLoading: false }];
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderDrawer({ onClose = vi.fn(), open = true } = {}) {
  return {
    onClose,
    ...render(
      <MemoryRouter initialEntries={['/platform/overview']}>
        <ToastProvider>
          <PlatformEntitlementOverridesDrilldownDrawer
            lifecycle="active"
            onClose={onClose}
            open={open}
            title="Dérogations actives"
          />
          <LocationProbe />
        </ToastProvider>
      </MemoryRouter>,
    ),
  };
}

describe('PlatformEntitlementOverridesDrilldownDrawer', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    mocks.useListPlatformEntitlementOverridesQuery.mockReturnValue({
      data: {
        overrides: [override],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useGetPlatformEntitlementOverrideQuery.mockReturnValue({
      data: override,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useListPlatformPlanCapabilitiesQuery.mockReturnValue({
      data: {
        features: ['file_upload'],
        featureDefinitions: [{ key: 'file_upload', label: 'Téléversement de fichiers' }],
        metrics: [],
      },
      error: undefined,
      isLoading: false,
    });
    mocks.useUpdatePlatformEntitlementOverrideMutation.mockReturnValue(
      resolvedMutation(mocks.updateOverride),
    );
    mocks.useRevokePlatformEntitlementOverrideMutation.mockReturnValue(
      resolvedMutation(mocks.revokeOverride),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('ne monte aucun appel de données tant que le drawer est fermé', () => {
    renderDrawer({ open: false });

    expect(mocks.useListPlatformEntitlementOverridesQuery).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('charge les dérogations actives dans un DataTable compact', () => {
    renderDrawer();

    expect(mocks.useListPlatformEntitlementOverridesQuery).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      lifecycle: 'active',
    });

    const drawer = screen.getByRole('dialog', { name: 'Dérogations actives (1)' });
    const table = within(drawer).getByRole('table');

    expect(table).toHaveClass('table-fixed');
    expect(within(table).getByRole('columnheader', { name: 'Workspace' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Dérogation' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Action' })).toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: 'Valeur' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: 'Fin' })).not.toBeInTheDocument();
    expect(within(table).getByText('Workspace Démo')).toBeInTheDocument();
    expect(within(table).getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Voir' })).toBeInTheDocument();
    expect(within(table).queryByText('Activée')).not.toBeInTheDocument();
    expect(within(table).queryByText('Permanente')).not.toBeInTheDocument();

    const dataRow = within(table).getByText('Workspace Démo').closest('tr');
    expect(dataRow).toHaveClass(
      'transition-colors',
      'duration-150',
      'hover:bg-muted/40',
      'focus-within:bg-muted/40',
      'motion-reduce:transition-none',
    );
  });

  it('passe de la liste au détail puis à l’édition dans le même drawer', async () => {
    const user = userEvent.setup();
    renderDrawer();

    const listDrawer = screen.getByRole('dialog', { name: 'Dérogations actives (1)' });
    await user.click(within(listDrawer).getByRole('button', { name: 'Voir' }));

    const detailDrawer = await screen.findByRole('dialog', { name: 'Workspace Démo' });
    expect(detailDrawer).toBe(listDrawer);
    expect(within(detailDrawer).getByText('Accès exceptionnel')).toBeInTheDocument();
    expect(within(detailDrawer).getByRole('button', { name: 'Retour aux dérogations' })).toBeInTheDocument();

    await user.click(within(detailDrawer).getByRole('button', { name: 'Modifier' }));

    const editDrawer = await screen.findByRole('dialog', { name: 'Modifier la dérogation' });
    expect(editDrawer).toBe(listDrawer);
    expect(within(editDrawer).getByText('Formulaire edit')).toBeInTheDocument();
    expect(within(editDrawer).getByRole('button', { name: 'Retour au détail' })).toBeInTheDocument();
  });

  it('ouvre la fiche Platform du workspace depuis le détail', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDrawer({ onClose });

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = await screen.findByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(drawer).getByRole('button', { name: /Voir le workspace/ }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/platform/workspaces?workspaceId=workspace-id',
      );
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('conserve le filtre lifecycle lors du passage à la page complète', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDrawer({ onClose });

    await user.click(screen.getByRole('button', { name: /Voir toutes les dérogations/ }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/platform/entitlement-overrides?lifecycle=active',
      );
    });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
