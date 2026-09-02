import { describe, expect, it } from 'vitest';

import { compactQueryParams } from '@/features/audit-log/api/audit-log-api';

describe('auditLogApi helpers', () => {
  it('retire les paramètres optionnels vides sans supprimer pagination valide', () => {
    expect(
      compactQueryParams({
        page: 1,
        limit: 20,
        action: '',
        actorId: undefined,
        entityType: null,
        status: 'failed',
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      status: 'failed',
    });
  });
});
