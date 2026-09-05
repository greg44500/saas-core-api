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

  it('injecte chaque route métier sous la bonne frontière du Core', () => {
    const applicationRoutes = composeApplicationFrontendRoutes([
      {
        publicRoutes: [{ path: 'catalog-public' }],
        authenticatedRoutes: [{ path: 'catalog-account' }],
        workspaceRoutes: [{ path: 'catalog' }],
        platformRoutes: [{ path: 'catalog-admin' }],
      },
    ]);

    const routes = createAppRoutes(applicationRoutes);
    const publicRoot = routes[0];
    const authenticatedRoot = routes.find((route) => (
      collectPaths(route.children).includes('workspaces/:workspaceId')
    ));
    const workspaceRoot = authenticatedRoot.children.find(
      (route) => route.path === 'workspaces/:workspaceId',
    );
    const platformRoot = authenticatedRoot.children.find(
      (route) => route.path === 'platform',
    );

    expect(collectPaths(publicRoot.children)).toContain('catalog-public');
    expect(collectPaths(authenticatedRoot.children)).toContain('catalog-account');
    expect(collectPaths(workspaceRoot.children)).toContain('catalog');
    expect(collectPaths(platformRoot.children)).toContain('catalog-admin');

    expect(collectPaths(publicRoot.children)).not.toContain('catalog');
    expect(collectPaths(workspaceRoot.children)).not.toContain('catalog-admin');
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
