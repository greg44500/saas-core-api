import { describe, expect, it } from 'vitest';

import {
  readFilters,
} from '@/features/audit-log/lib/audit-log-query-state';

describe('audit log query state', () => {
  it('accepte automatiquement une nouvelle valeur déclarée par metadata', () => {
    const metadata = {
      actions: [
        { value: 'NEW_BACKEND_ACTION', label: 'Nouvelle action' },
      ],
      entityTypes: [
        { value: 'NewBackendResource', label: 'Nouvelle ressource' },
      ],
      statuses: [
        { value: 'success', label: 'Réussie' },
      ],
    };

    expect(readFilters(
      new URLSearchParams(
        'action=NEW_BACKEND_ACTION&entityType=NewBackendResource&status=success',
      ),
      metadata,
    )).toEqual({
      action: 'NEW_BACKEND_ACTION',
      entityType: 'NewBackendResource',
      status: 'success',
      from: '',
      to: '',
    });
  });

  it('refuse une valeur URL absente du catalogue backend', () => {
    expect(readFilters(
      new URLSearchParams('entityType=InjectedResource'),
      {
        actions: [],
        entityTypes: [],
        statuses: [],
      },
    ).entityType).toBe('');
  });
});
