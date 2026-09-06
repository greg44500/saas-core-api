import { describe, expect, it } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import {
  PLATFORM_HOME,
  getAuthenticatedHome,
  isWorkspaceClientPath,
  resolveAuthenticatedDestination,
} from '@/features/auth/lib/authenticated-destination';

const overviewPlatformAccess = {
  status: 'active',
  permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
};

describe('authenticated destination policy', () => {
  it('utilise la première destination Platform autorisée comme accueil principal', () => {
    expect(getAuthenticatedHome(overviewPlatformAccess)).toBe(PLATFORM_HOME);
    expect(getAuthenticatedHome({
      status: 'active',
      permissions: [PLATFORM_PERMISSION.USERS_READ],
    })).toBe('/platform/users');
    expect(getAuthenticatedHome(null)).toBe('/workspaces');
  });

  it('identifie les routes appartenant au contexte client Workspace', () => {
    expect(isWorkspaceClientPath('/workspaces')).toBe(true);
    expect(isWorkspaceClientPath('/workspaces/workspace-1/dashboard')).toBe(true);
    expect(isWorkspaceClientPath('/onboarding/workspace')).toBe(true);
    expect(isWorkspaceClientPath('/platform/overview')).toBe(false);
  });

  it('ignore une ancienne destination Workspace pour un membre Platform actif', () => {
    expect(resolveAuthenticatedDestination({
      destination: {
        pathname: '/workspaces/workspace-1/dashboard',
        search: '?tab=activity',
      },
      platformAccess: {
        status: 'active',
        permissions: [PLATFORM_PERMISSION.USERS_READ],
      },
    })).toBe('/platform/users');
  });

  it('préserve une destination non-Workspace explicitement demandée', () => {
    expect(resolveAuthenticatedDestination({
      destination: {
        pathname: '/invitations/accept',
        search: '?token=abc',
        hash: '#confirmation',
      },
      platformAccess: overviewPlatformAccess,
    })).toBe('/invitations/accept?token=abc#confirmation');
  });

  it('reste orienté Workspace sans contexte Platform actif', () => {
    expect(resolveAuthenticatedDestination({
      destination: { pathname: '/workspaces/workspace-1/dashboard' },
      platformAccess: { status: 'suspended', permissions: [] },
    })).toBe('/workspaces/workspace-1/dashboard');
  });
});
