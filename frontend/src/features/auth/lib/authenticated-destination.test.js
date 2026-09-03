import { describe, expect, it } from 'vitest';

import {
  PLATFORM_HOME,
  getAuthenticatedHome,
  isWorkspaceClientPath,
  resolveAuthenticatedDestination,
} from '@/features/auth/lib/authenticated-destination';

describe('authenticated destination policy', () => {
  it('utilise Platform comme accueil principal du super_admin', () => {
    expect(getAuthenticatedHome({ platformRole: 'super_admin' })).toBe(PLATFORM_HOME);
    expect(getAuthenticatedHome({ platformRole: 'user' })).toBe('/workspaces');
  });

  it('identifie les routes appartenant au contexte client Workspace', () => {
    expect(isWorkspaceClientPath('/workspaces')).toBe(true);
    expect(isWorkspaceClientPath('/workspaces/workspace-1/dashboard')).toBe(true);
    expect(isWorkspaceClientPath('/onboarding/workspace')).toBe(true);
    expect(isWorkspaceClientPath('/platform/overview')).toBe(false);
  });

  it('ignore une ancienne destination Workspace pour un super_admin', () => {
    expect(resolveAuthenticatedDestination({
      destination: {
        pathname: '/workspaces/workspace-1/dashboard',
        search: '?tab=activity',
      },
      user: { platformRole: 'super_admin' },
    })).toBe(PLATFORM_HOME);
  });

  it('préserve une destination non-Workspace explicitement demandée', () => {
    expect(resolveAuthenticatedDestination({
      destination: {
        pathname: '/invitations/accept',
        search: '?token=abc',
        hash: '#confirmation',
      },
      user: { platformRole: 'super_admin' },
    })).toBe('/invitations/accept?token=abc#confirmation');
  });
});
