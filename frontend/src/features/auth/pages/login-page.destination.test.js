import { describe, expect, it } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import {
  getLoginStatusMessage,
  getRequestedDestination,
} from '@/features/auth/pages/login-page';

const overviewPlatformAccess = {
  status: 'active',
  permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
};

describe('getRequestedDestination', () => {
  it('ignore une ancienne destination Workspace pour un membre Platform actif', () => {
    const location = {
      state: {
        from: {
          pathname: '/workspaces/workspace-1/dashboard',
          search: '?tab=activity',
          hash: '#recent',
        },
      },
    };

    expect(getRequestedDestination(location, overviewPlatformAccess)).toBe(
      '/platform/overview',
    );
  });

  it('dirige vers la première destination Platform autorisée sans destination préalable', () => {
    expect(getRequestedDestination({ state: null }, {
      status: 'active',
      permissions: [PLATFORM_PERMISSION.USERS_READ],
    })).toBe('/platform/users');
  });

  it('préserve une destination non-Workspace explicitement demandée', () => {
    const location = {
      state: {
        from: {
          pathname: '/account/security',
          search: '?tab=sessions',
        },
      },
    };

    expect(getRequestedDestination(location, overviewPlatformAccess)).toBe(
      '/account/security?tab=sessions',
    );
  });

  it('dirige un utilisateur sans accès Platform vers ses workspaces', () => {
    expect(getRequestedDestination({ state: null }, null)).toBe('/workspaces');
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
