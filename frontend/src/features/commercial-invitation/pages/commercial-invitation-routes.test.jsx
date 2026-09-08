import { describe, expect, it } from 'vitest';

import { createAppRoutes } from '@/app/router';
import { AcceptCommercialInvitationPage } from '@/features/commercial-invitation/pages/accept-commercial-invitation-page';
import { PlatformCommercialInvitationsPage } from '@/features/platform/pages/platform-commercial-invitations-page';

function findRouteByPath(routes, path) {
  for (const route of routes) {
    if (route.path === path) return route;

    const nested = findRouteByPath(route.children ?? [], path);
    if (nested) return nested;
  }

  return null;
}

describe('routes CommercialInvitation', () => {
  it('résout le parcours bénéficiaire public/auth-compatible', async () => {
    const route = findRouteByPath(
      createAppRoutes(),
      'commercial-invitations/accept',
    );

    expect(route).toBeDefined();
    const lazyModule = await route.lazy();
    expect(lazyModule.Component).toBe(AcceptCommercialInvitationPage);
  });

  it('résout l’administration Platform dédiée', async () => {
    const route = findRouteByPath(
      createAppRoutes(),
      'commercial-invitations',
    );

    expect(route).toBeDefined();
    const lazyModule = await route.lazy();
    expect(lazyModule.Component).toBe(PlatformCommercialInvitationsPage);
  });
});
