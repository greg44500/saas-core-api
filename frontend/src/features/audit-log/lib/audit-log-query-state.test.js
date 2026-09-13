import { describe, expect, it } from 'vitest';

import {
  parsePageSize,
  readFilters,
  writeSearchParams,
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

  it('normalise la taille de page sur les valeurs autorisées du composant partagé', () => {
    expect(parsePageSize('20')).toBe(20);
    expect(parsePageSize('999')).toBe(10);
    expect(parsePageSize('invalid')).toBe(10);
  });

  it('conserve une taille de page non standard lors des changements de filtres et de page', () => {
    const params = writeSearchParams(
      {
        action: 'LOGIN_FAILED',
        entityType: '',
        status: 'failed',
        from: '',
        to: '',
      },
      3,
      50,
    );

    expect(params.get('action')).toBe('LOGIN_FAILED');
    expect(params.get('status')).toBe('failed');
    expect(params.get('page')).toBe('3');
    expect(params.get('limit')).toBe('50');
  });

  it('n’alourdit pas l’URL avec les valeurs de pagination par défaut', () => {
    const params = writeSearchParams(
      {
        action: '',
        entityType: '',
        status: '',
        from: '',
        to: '',
      },
      1,
      10,
    );

    expect(params.toString()).toBe('');
  });
});
