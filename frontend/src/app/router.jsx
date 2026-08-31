import { createBrowserRouter } from 'react-router';

import App from '@/App';
import { AuthLayout } from '@/app/layouts/auth-layout';
import { PlatformLayout } from '@/app/layouts/platform-layout';
import { PublicLayout } from '@/app/layouts/public-layout';
import { WorkspaceLayout } from '@/app/layouts/workspace-layout';

const appRoutes = [
  {
    Component: PublicLayout,
    children: [
      {
        index: true,
        Component: App,
      },
    ],
  },
  {
    Component: AuthLayout,
    children: [
      {
        path: '/login',
        lazy: {
          Component: async () =>
            (await import('@/features/auth/pages/login-placeholder-page')).LoginPlaceholderPage,
        },
      },
      {
        path: '/register',
        lazy: {
          Component: async () =>
            (await import('@/features/auth/pages/register-placeholder-page')).RegisterPlaceholderPage,
        },
      },
    ],
  },
  {
    path: '/workspaces/:workspaceId',
    Component: WorkspaceLayout,
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
  {
    path: '*',
    lazy: {
      Component: async () =>
        (await import('@/pages/not-found-page')).NotFoundPage,
    },
  },
];

const appRouter = createBrowserRouter(appRoutes);

export { appRouter, appRoutes };
