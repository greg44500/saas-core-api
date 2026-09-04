import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { WorkspaceFeatureGate } from '@/features/workspace/components/workspace-feature-gate';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'member', name: 'Membre' } };

function renderGate(features) {
  render(
    <WorkspaceProvider
      features={features}
      membership={membership}
      permissions={[]}
      workspace={workspace}
    >
      <WorkspaceFeatureGate
        fallback={<span>Indisponible</span>}
        feature={WORKSPACE_FEATURE.TEAM_MANAGEMENT}
      >
        <span>Disponible</span>
      </WorkspaceFeatureGate>
    </WorkspaceProvider>,
  );
}

describe('WorkspaceFeatureGate', () => {
  afterEach(cleanup);

  it('rend le contenu quand la feature est effective', () => {
    renderGate([WORKSPACE_FEATURE.TEAM_MANAGEMENT]);

    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.queryByText('Indisponible')).not.toBeInTheDocument();
  });

  it('rend le fallback quand la feature est absente', () => {
    renderGate([]);

    expect(screen.getByText('Indisponible')).toBeInTheDocument();
    expect(screen.queryByText('Disponible')).not.toBeInTheDocument();
  });
});
