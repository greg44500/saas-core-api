import { describe, expect, it } from 'vitest';

import {
  getLoginStatusMessage,
  getRequestedDestination,
} from '@/features/auth/pages/login-page';

describe('getRequestedDestination', () => {
  it('ignore une ancienne destination Workspace pour un super_admin', () => {
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
      '/platform/overview',
    );
  });

  it('dirige un super_admin vers la Console plateforme sans destination préalable', () => {
    expect(getRequestedDestination({ state: null }, { platformRole: 'super_admin' })).toBe(
      '/platform/overview',
    );
  });

  it('préserve une destination non-Workspace explicitement demandée par le super_admin', () => {
    const location = {
      state: {
        from: {
          pathname: '/account/security',
          search: '?tab=sessions',
        },
      },
    };

    expect(getRequestedDestination(location, { platformRole: 'super_admin' })).toBe(
      '/account/security?tab=sessions',
    );
  });

  it('dirige un utilisateur standard vers ses workspaces', () => {
    expect(getRequestedDestination({ state: null }, { id: 'user-1' })).toBe('/workspaces');
  });
});

describe('getLoginStatusMessage', () => {
  it('confirme la création du compte depuis une invitation Platform', () => {
    expect(getLoginStatusMessage({
      state: { platformInvitationAccepted: true },
    })).toBe(
      'Invitation acceptée. Votre compte est créé. Connectez-vous pour accéder à la Plateforme.',
    );
  });
});
