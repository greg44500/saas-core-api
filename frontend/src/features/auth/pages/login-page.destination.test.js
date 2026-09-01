import { describe, expect, it } from 'vitest';

import { getRequestedDestination } from '@/features/auth/pages/login-page';

describe('getRequestedDestination', () => {
  it('préserve une destination protégée explicitement demandée', () => {
    const location = {
      state: {
        from: {
          pathname: '/workspaces/workspace-1/dashboard',
          search: '?tab=activity',
          hash: '#recent',
        },
      },
    };

    expect(getRequestedDestination(location, { platformRole: 'super_admin' })).toBe(
      '/workspaces/workspace-1/dashboard?tab=activity#recent',
    );
  });

  it('dirige un super_admin vers la Console plateforme sans destination préalable', () => {
    expect(getRequestedDestination({ state: null }, { platformRole: 'super_admin' })).toBe(
      '/platform/overview',
    );
  });

  it('dirige un utilisateur standard vers ses workspaces', () => {
    expect(getRequestedDestination({ state: null }, { id: 'user-1' })).toBe('/workspaces');
  });
});
