import { describe, expect, it } from 'vitest';

import { createAppRoutes } from '@/app/router';
import { PlatformPlansPage } from '@/features/platform/pages/platform-plans-page';

function findPlatformPlansRoute() {
  const routes = createAppRoutes();
  const protectedRoute = routes.find((route) =>
    route.children?.some((child) => child.path === 'platform'),
  );
  const platformRoute = protectedRoute?.children?.find(
    (route) => route.path === 'platform',
  );
  const platformLayoutRoute = platformRoute?.children?.[0];

  return platformLayoutRoute?.children?.find(
    (route) => route.path === 'plans',
  );
}

describe('route Platform Plans', () => {
  it('résout la vraie page d’administration des plans', async () => {
    const route = findPlatformPlansRoute();
    expect(route).toBeDefined();

    const lazyModule = await route.lazy();
    expect(lazyModule.Component).toBe(PlatformPlansPage);
  });
});
