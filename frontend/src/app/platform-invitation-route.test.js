import { describe, expect, it } from 'vitest';

import { createAppRoutes } from '@/app/router';
import { AuthGuard, GuestGuard } from '@/features/auth/components/auth-guard';

function findRoute(routes, targetPath, ancestors = []) {
  for (const route of routes) {
    const nextAncestors = [...ancestors, route];

    if (route.path === targetPath) {
      return {
        route,
        ancestors,
      };
    }

    if (Array.isArray(route.children)) {
      const match = findRoute(route.children, targetPath, nextAncestors);
      if (match) return match;
    }
  }

  return null;
}

describe('Platform invitation route', () => {
  it('reste accessible avant ou après authentification sans passer par un guard', () => {
    const match = findRoute(
      createAppRoutes(),
      'platform-invitations/accept',
    );

    expect(match).not.toBeNull();
    expect(match.route.lazy).toBeTypeOf('function');
    expect(
      match.ancestors.some(({ Component }) => Component === AuthGuard),
    ).toBe(false);
    expect(
      match.ancestors.some(({ Component }) => Component === GuestGuard),
    ).toBe(false);
  });
});
