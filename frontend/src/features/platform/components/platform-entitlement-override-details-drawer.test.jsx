import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlatformEntitlementOverrideDetails } from '@/features/platform/components/platform-entitlement-override-details-drawer';

const baseOverride = {
  id: 'override-id',
  workspace: { id: 'workspace-id', name: 'Workspace Démo' },
  source: 'administrative',
  startsAt: '2026-09-05T14:32:00.000Z',
  endsAt: null,
  lifecycle: 'active',
  reason: 'Ajustement administratif',
  grantedBy: { id: 'admin-id', firstName: 'Super', lastName: 'Admin' },
  updatedBy: null,
  createdAt: '2026-09-05T14:32:00.000Z',
  updatedAt: '2026-09-05T14:32:00.000Z',
  revokedAt: null,
};

function renderDetails(override) {
  render(
    <PlatformEntitlementOverrideDetails
      error={null}
      isLoading={false}
      onEdit={vi.fn()}
      onRetry={vi.fn()}
      onRevoke={vi.fn()}
      onViewWorkspace={vi.fn()}
      override={override}
    />,
  );
}

describe('PlatformEntitlementOverrideDetails', () => {
  afterEach(() => cleanup());

  it('présente une dérogation de fonctionnalité sans vocabulaire technique Capability', () => {
    renderDetails({
      ...baseOverride,
      targetType: 'feature',
      featureKey: 'file_upload',
      featureEnabled: true,
      metricKey: null,
      limitValue: null,
    });

    expect(screen.getByText('Fonctionnalité')).toBeInTheDocument();
    expect(screen.getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(screen.getByText('Action appliquée')).toBeInTheDocument();
    expect(screen.getByText('Activée')).toBeInTheDocument();
    expect(screen.getByText('Statut de la dérogation')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Capability')).not.toBeInTheDocument();
    expect(screen.queryByText('État')).not.toBeInTheDocument();
  });

  it('présente une dérogation de limite avec une valeur explicite', () => {
    renderDetails({
      ...baseOverride,
      targetType: 'limit',
      featureKey: null,
      featureEnabled: null,
      metricKey: 'storage_bytes',
      limitValue: 200 * 1024 * 1024,
    });

    expect(screen.getByText('Limite')).toBeInTheDocument();
    expect(screen.getByText('Stockage')).toBeInTheDocument();
    expect(screen.getByText('Valeur appliquée')).toBeInTheDocument();
    expect(screen.getByText('200 Mo')).toBeInTheDocument();
  });
});
