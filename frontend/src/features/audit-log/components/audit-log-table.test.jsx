import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AuditStatusBadge,
  getAuditStatusTone,
} from '@/features/audit-log/components/audit-log-table';
import { createAuditMetadataLabelMaps } from '@/features/audit-log/lib/audit-log-presentation';

const labelMaps = createAuditMetadataLabelMaps({
  statuses: [
    { value: 'success', label: 'Réussie' },
    { value: 'failed', label: 'Échouée' },
  ],
});

describe('AuditStatusBadge', () => {
  afterEach(() => cleanup());

  it.each([
    ['success', 'success', 'Réussie', 'text-success'],
    ['failed', 'destructive', 'Échouée', 'text-destructive'],
  ])(
    'associe le statut %s au ton sémantique %s',
    (status, tone, label, expectedClass) => {
      expect(getAuditStatusTone(status)).toBe(tone);

      render(<AuditStatusBadge labelMaps={labelMaps} status={status} />);

      expect(screen.getByText(label)).toHaveClass(expectedClass);
    },
  );

  it('conserve un ton neutre pour un statut non reconnu', () => {
    expect(getAuditStatusTone('unknown')).toBe('neutral');

    render(<AuditStatusBadge labelMaps={labelMaps} status="unknown" />);

    expect(screen.getByText('Statut inconnu')).toHaveClass('text-muted-foreground');
  });
});
