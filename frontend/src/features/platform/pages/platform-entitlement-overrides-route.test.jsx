import { describe, expect, it } from 'vitest';

import { createAppRoutes } from '@/app/router';
import { PlatformEntitlementOverridesPage } from '@/features/platform/pages/platform-entitlement-overrides-page';

function findPlatformEntitlementOverridesRoute() {
  const routes = createAppRoutes();
  const protectedRoute = routes.find((route) =>
    route.children?.some((child) => child.path === 'platform'),
  );
  const platformRoute = protectedRoute?.children?.find(
    (route) => route.path === 'platform',
  );
  const platformLayoutRoute = platformRoute?.children?.[0];

  return platformLayoutRoute?.children?.find(
    (route) => route.path === 'entitlement-overrides',
  );
}

describe('route Platform Entitlement Overrides', () => {
  it('résout la vraie page d’administration des dérogations', async () => {
    const route = findPlatformEntitlementOverridesRoute();
    expect(route).toBeDefined();

    const lazyModule = await route.lazy();
    expect(lazyModule.Component).toBe(PlatformEntitlementOverridesPage);
  });
});
