import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function renderDetails(
  override,
  {
    featureGroup = null,
    featureGroupError = null,
    featureGroupLoading = false,
    onViewWorkspace = vi.fn(),
  } = {},
) {
  render(
    <PlatformEntitlementOverrideDetails
      error={null}
      featureGroup={featureGroup}
      featureGroupError={featureGroupError}
      featureGroupLoading={featureGroupLoading}
      isLoading={false}
      onEdit={vi.fn()}
      onRetry={vi.fn()}
      onRevoke={vi.fn()}
      onViewWorkspace={onViewWorkspace}
      override={override}
    />,
  );

  return { onViewWorkspace };
}

describe('PlatformEntitlementOverrideDetails', () => {
  afterEach(() => cleanup());

  it('présente une fonctionnalité avec effet et statut sémantiques', async () => {
    const user = userEvent.setup();
    const { onViewWorkspace } = renderDetails({
      ...baseOverride,
      targetType: 'feature',
      featureKey: 'file_upload',
      featureEnabled: true,
      metricKey: null,
      limitValue: null,
    });

    expect(screen.getByText('Fonctionnalité')).toBeInTheDocument();
    expect(screen.getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(screen.getByText('Effet')).toBeInTheDocument();
    expect(screen.getByText('Activée')).toBeInTheDocument();
    expect(screen.getByText('Statut')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Activée')).toHaveClass('text-success');
    expect(screen.getByText('Active')).toHaveClass('text-success');

    const workspaceLink = screen.getByRole('button', { name: 'Voir le workspace' });
    expect(workspaceLink).toHaveClass('size-6');

    await user.click(workspaceLink);
    expect(onViewWorkspace).toHaveBeenCalledWith(baseOverride.workspace);
  });

  it('présente le nom métier et les paramètres d’une dérogation groupée', () => {
    const featureOverride = {
      ...baseOverride,
      groupId: 'group-id',
      groupName: 'Découverte Téléversement',
      targetType: 'feature',
      featureKey: 'file_upload',
      featureEnabled: true,
      metricKey: null,
      limitValue: null,
    };

    renderDetails(featureOverride, {
      featureGroup: {
        groupId: 'group-id',
        groupName: 'Découverte Téléversement',
        featureKey: 'file_upload',
        primaryOverride: featureOverride,
        relatedOverrides: [
          {
            ...baseOverride,
            id: 'storage-limit-id',
            targetType: 'limit',
            featureKey: null,
            featureEnabled: null,
            metricKey: 'storage_bytes',
            limitValue: 200 * 1024 * 1024,
          },
        ],
      },
    });

    expect(screen.getByText('Dérogation sélectionnée')).toBeInTheDocument();
    expect(screen.getByText('Découverte Téléversement')).toBeInTheDocument();
    expect(screen.getByText('Paramètres associés')).toBeInTheDocument();
    expect(screen.getByText('Stockage')).toBeInTheDocument();
    expect(screen.getByText('200 Mo')).toBeInTheDocument();
  });

  it('désactive la modification tant que les paramètres d’une feature ne sont pas chargés', () => {
    renderDetails({
      ...baseOverride,
      targetType: 'feature',
      featureKey: 'team_management',
      featureEnabled: true,
      metricKey: null,
      limitValue: null,
    }, {
      featureGroupLoading: true,
    });

    expect(screen.getByRole('button', { name: 'Chargement…' })).toBeDisabled();
  });

  it('présente une ancienne dérogation autonome de limite comme paramètre historique', () => {
    renderDetails({
      ...baseOverride,
      targetType: 'limit',
      featureKey: null,
      featureEnabled: null,
      metricKey: 'storage_bytes',
      limitValue: 200 * 1024 * 1024,
    });

    expect(screen.getByText('Paramètre')).toBeInTheDocument();
    expect(screen.getByText('Stockage')).toBeInTheDocument();
    expect(screen.getByText('Valeur appliquée')).toBeInTheDocument();
    expect(screen.getByText('200 Mo')).toBeInTheDocument();
  });
});
