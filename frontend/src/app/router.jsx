import { createBrowserRouter } from 'react-router';

import App from '@/App';
import { AuthLayout } from '@/app/layouts/auth-layout';
import { PlatformLayout } from '@/app/layouts/platform-layout';
import { PublicLayout } from '@/app/layouts/public-layout';
import { WorkspaceLayout } from '@/app/layouts/workspace-layout';
import { PageLoader } from '@/components/shared/page-loader';
import { AuthGuard, GuestGuard } from '@/features/auth/components/auth-guard';

const appRoutes = [
  {
    Component: PublicLayout,
    HydrateFallback: PageLoader,
    children: [{ index: true, Component: App }],
  },
  {
    Component: GuestGuard,
    children: [
      {
        Component: AuthLayout,
        HydrateFallback: PageLoader,
        children: [
          {
            path: '/login',
            lazy: {
              Component: async () =>
                (await import('@/features/auth/pages/login-page')).LoginPage,
            },
          },
          {
            path: '/register',
            lazy: {
              Component: async () =>
                (await import('@/features/auth/pages/register-page')).RegisterPage,
            },
          },
        ],
      },
    ],
  },
  {
    Component: AuthGuard,
    children: [
      {
        path: '/workspaces/:workspaceId',
        Component: WorkspaceLayout,
        HydrateFallback: PageLoader,
        children: [
          {
            path: 'dashboard',
            lazy: {
              Component: async () =>
                (await import('@/features/workspace/pages/workspace-dashboard-placeholder-page'))
                  .WorkspaceDashboardPlaceholderPage,
            },
          },
        ],
      },
      {
        path: '/platform',
        Component: PlatformLayout,
        HydrateFallback: PageLoader,
        children: [
          {
            path: 'overview',
            lazy: {
              Component: async () =>
                (await import('@/features/platform/pages/platform-overview-placeholder-page'))
                  .PlatformOverviewPlaceholderPage,
            },
          },
        ],
      },
    ],
  },
  {
    path: '*',
    HydrateFallback: PageLoader,
    lazy: {
      Component: async () => (await import('@/pages/not-found-page')).NotFoundPage,
    },
  },
];

const appRouter = createBrowserRouter(appRoutes);

export { appRouter, appRoutes };
