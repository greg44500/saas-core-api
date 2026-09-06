import { describe, expect, it } from 'vitest';

import { createAppRoutes } from '@/app/router';
import { PlatformTeamPage } from '@/features/platform/pages/platform-team-page';

function findPlatformTeamRoute() {
  const routes = createAppRoutes();
  const protectedRoute = routes.find((route) =>
    route.children?.some((child) => child.path === 'platform'),
  );
  const platformRoute = protectedRoute?.children?.find(
    (route) => route.path === 'platform',
  );
  const platformLayoutRoute = platformRoute?.children?.[0];

  return platformLayoutRoute?.children?.find(
    (route) => route.path === 'team/:section?',
  );
}

describe('route Équipe de la Plateforme', () => {
  it('résout la page à onglets de l’équipe interne', async () => {
    const route = findPlatformTeamRoute();
    expect(route).toBeDefined();

    const lazyModule = await route.lazy();
    expect(lazyModule.Component).toBe(PlatformTeamPage);
  });
});
