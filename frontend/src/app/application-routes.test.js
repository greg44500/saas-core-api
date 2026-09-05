import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  composeApplicationFrontendRoutes,
} from '@/app/application-routes';
import { createAppRoutes } from '@/app/router';

function collectPaths(routes = []) {
  return routes.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...(Array.isArray(route.children)
      ? collectPaths(route.children)
      : []),
  ]);
}

describe('application frontend route composition', () => {
  it('compose les quatre surfaces de routing applicatif', () => {
    const routes = composeApplicationFrontendRoutes([
      {
        publicRoutes: [{ path: 'catalog-public' }],
        authenticatedRoutes: [{ path: 'catalog-account' }],
        workspaceRoutes: [{ path: 'catalog' }],
        platformRoutes: [{ path: 'catalog-admin' }],
      },
    ]);

    expect(routes.publicRoutes).toEqual([
      { path: 'catalog-public' },
    ]);
    expect(routes.authenticatedRoutes).toEqual([
      { path: 'catalog-account' },
    ]);
    expect(routes.workspaceRoutes).toEqual([
      { path: 'catalog' },
    ]);
    expect(routes.platformRoutes).toEqual([
      { path: 'catalog-admin' },
    ]);
  });

  it('injecte les routes métier dans l’arbre React Router du Core', () => {
    const applicationRoutes = composeApplicationFrontendRoutes([
      {
        publicRoutes: [{ path: 'catalog-public' }],
        authenticatedRoutes: [{ path: 'catalog-account' }],
        workspaceRoutes: [{ path: 'catalog' }],
        platformRoutes: [{ path: 'catalog-admin' }],
      },
    ]);

    const paths = collectPaths(
      createAppRoutes(applicationRoutes),
    );

    expect(paths).toEqual(expect.arrayContaining([
      'catalog-public',
      'catalog-account',
      'catalog',
      'catalog-admin',
    ]));
  });

  it('refuse une collection de routes métier non déclarée sous forme de tableau', () => {
    expect(() => composeApplicationFrontendRoutes([
      {
        workspaceRoutes: 'catalog',
      },
    ])).toThrow(
      'modules[0].workspaceRoutes must be an array',
    );
  });
});
