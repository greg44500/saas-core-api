import { describe, expect, it } from 'vitest';

import { createAppRoutes } from '@/app/router';
import { PlatformAuditLogsPage } from '@/features/platform/pages/platform-audit-logs-page';

function findPlatformAuditLogsRoute() {
  const routes = createAppRoutes();
  const protectedRoute = routes.find((route) =>
    route.children?.some((child) => child.path === 'platform'),
  );
  const platformRoute = protectedRoute?.children?.find(
    (route) => route.path === 'platform',
  );
  const platformLayoutRoute = platformRoute?.children?.[0];

  return platformLayoutRoute?.children?.find(
    (route) => route.path === 'audit-logs',
  );
}

describe('route Platform Audit Logs', () => {
  it('résout la vraie page d’audit de la plateforme', async () => {
    const route = findPlatformAuditLogsRoute();
    expect(route).toBeDefined();

    const lazyModule = await route.lazy();
    expect(lazyModule.Component).toBe(PlatformAuditLogsPage);
  });
});
