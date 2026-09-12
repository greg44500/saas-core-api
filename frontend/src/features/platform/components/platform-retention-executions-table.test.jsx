import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlatformRetentionExecutionsTable } from '@/features/platform/components/platform-retention-executions-table';

const baseExecution = {
  id: 'execution-1',
  startedAt: '2026-09-12T12:46:16.000Z',
  trigger: 'manual',
  policyVersion: 2,
  counters: { affected: 226, selected: 226 },
  batchesProcessed: 1,
};

describe('PlatformRetentionExecutionsTable', () => {
  it('utilise les couleurs sémantiques du Design System pour les statuts', () => {
    render(
      <PlatformRetentionExecutionsTable
        executions={[{ ...baseExecution, status: 'succeeded', errorCode: null }]}
        loading={false}
        onPageChange={vi.fn()}
        page={1}
        pagination={{ totalPages: 1 }}
      />,
    );

    const status = screen.getByText('Réussie');
    expect(status).toHaveClass('text-success');
    expect(screen.getByText('Politique')).toBeInTheDocument();
  });

  it('signale visuellement une erreur d’exécution avec un libellé utilisateur français', () => {
    render(
      <PlatformRetentionExecutionsTable
        executions={[{
          ...baseExecution,
          id: 'execution-2',
          status: 'failed',
          errorCode: 'RETENTION_LOCK_LOST',
        }]}
        loading={false}
        onPageChange={vi.fn()}
        page={1}
        pagination={{ totalPages: 1 }}
      />,
    );

    expect(screen.getByText('Échouée')).toHaveClass('text-destructive');
    expect(screen.getByRole('alert')).toHaveClass('text-destructive');
    expect(screen.getByRole('alert')).toHaveTextContent('Verrou d’exécution perdu');
    expect(screen.getByRole('alert')).toHaveAttribute(
      'title',
      'Code technique : RETENTION_LOCK_LOST',
    );
  });
});
