import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PlatformAttentionTable } from '@/features/platform/components/platform-attention-table';

const ITEMS = [
  {
    id: 'audit_failed:audit-1',
    type: 'audit_failed',
    level: 'warning',
    state: 'current',
    workspace: { id: 'workspace-1', name: 'Acme' },
    referenceAt: '2026-09-03T11:00:00.000Z',
    context: {
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityId: 'user-1',
    },
  },
  {
    id: 'override_expiring:override-1',
    type: 'override_expiring',
    level: 'warning',
    state: 'upcoming',
    workspace: { id: 'workspace-2', name: 'Beta' },
    referenceAt: '2026-09-05T12:00:00.000Z',
    context: {
      targetType: 'feature',
      targetKey: 'file_upload',
    },
  },
];

describe('PlatformAttentionTable', () => {
  afterEach(() => cleanup());

  it('réutilise un vrai tableau partagé avec des libellés français et le niveau warning', () => {
    render(
      <PlatformAttentionTable
        items={ITEMS}
        totalSignals={7}
      />,
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Niveau' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Espace de travail' })).toBeInTheDocument();
    expect(within(table).getAllByText('À vérifier')).toHaveLength(2);
    expect(within(table).getByText('Audit en échec')).toBeInTheDocument();
    expect(within(table).getByText('Échec de connexion · Utilisateur')).toBeInTheDocument();
    expect(within(table).getByText('Dérogation à échéance')).toBeInTheDocument();
    expect(within(table).getByText('Fonctionnalité : Téléversement de fichiers')).toBeInTheDocument();
    expect(screen.getByText(/2 points prioritaires affichés sur 7 signaux détectés/)).toBeInTheDocument();
  });

  it('affiche un état vide sans fabriquer de ligne', () => {
    render(<PlatformAttentionTable items={[]} totalSignals={0} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Aucun point prioritaire à afficher.')).toBeInTheDocument();
  });
});
