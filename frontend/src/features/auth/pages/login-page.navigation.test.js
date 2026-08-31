import { describe, expect, it } from 'vitest';

import { getRequestedDestination } from '@/features/auth/pages/login-page';

describe('getRequestedDestination', () => {
  it('utilise /workspaces sans destination protégée préalable', () => {
    expect(getRequestedDestination({ state: null })).toBe('/workspaces');
  });

  it('préserve pathname, search et hash de la destination demandée', () => {
    expect(
      getRequestedDestination({
        state: {
          from: {
            pathname: '/invitations/accept',
            search: '?token=abc',
            hash: '#confirmation',
          },
        },
      }),
    ).toBe('/invitations/accept?token=abc#confirmation');
  });
});
