import { createBrowserRouter } from 'react-router';

import App from '@/App';
import { AuthLayout } from '@/app/layouts/auth-layout';
import { OnboardingLayout } from '@/app/layouts/onboarding-layout';
import { PlatformLayout } from '@/app/layouts/platform-layout';
import { PublicLayout } from '@/app/layouts/public-layout';
import { WorkspaceLayout } from '@/app/layouts/workspace-layout';
import { PageLoader } from '@/components/shared/page-loader';
import { AuthGuard, GuestGuard } from '@/features/auth/components/auth-guard';
import { PlatformGuard } from '@/features/platform/components/platform-guard';
import { WorkspaceGuard } from '@/features/workspace/components/workspace-guard';

function createAppRoutes() {
  return [
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
              path: 'login',
              lazy: async () => {
                const { LoginPage } = await import('@/features/auth/pages/login-page');
                return { Component: LoginPage };
              },
            },
            {
              path: 'register',
              lazy: async () => {
                const { RegisterPage } = await import('@/features/auth/pages/register-page');
                return { Component: RegisterPage };
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
          path: 'invitations/accept',
          HydrateFallback: PageLoader,
          lazy: async () => {
            const { AcceptWorkspaceInvitationPage } = await import(
              '@/features/workspace-invitation/pages/accept-workspace-invitation-page'
            );
            return { Component: AcceptWorkspaceInvitationPage };
          },
        },
        {
          path: 'workspaces',
          HydrateFallback: PageLoader,
          lazy: async () => {
            const { WorkspaceEntryPage } = await import(
              '@/features/workspace/pages/workspace-entry-page'
            );
            return { Component: WorkspaceEntryPage };
          },
        },
        {
          path: 'onboarding',
          Component: OnboardingLayout,
          HydrateFallback: PageLoader,
          children: [
            {
              path: 'workspace',
              lazy: async () => {
                const { CreateWorkspacePage } = await import(
                  '@/features/workspace/pages/create-workspace-page'
                );
                return { Component: CreateWorkspacePage };
              },
            },
            {
              path: 'plans/:workspaceId',
              lazy: async () => {
                const { OnboardingPlansPage } = await import(
                  '@/features/workspace/pages/onboarding-plans-page'
                );
                return { Component: OnboardingPlansPage };
              },
            },
          ],
        },
        {
          path: 'workspaces/:workspaceId',
          Component: WorkspaceGuard,
          HydrateFallback: PageLoader,
          children: [
            {
              Component: WorkspaceLayout,
              children: [
                {
                  path: 'dashboard',
                  lazy: async () => {
                    const { WorkspaceDashboardPage } = await import(
                      '@/features/workspace/pages/workspace-dashboard-page'
                    );
                    return { Component: WorkspaceDashboardPage };
                  },
                },
                {
                  path: 'members',
                  lazy: async () => {
                    const { WorkspaceMembersPage } = await import(
                      '@/features/workspace-members/pages/workspace-members-page'
                    );
                    return { Component: WorkspaceMembersPage };
                  },
                },
              ],
            },
          ],
        },
        {
          path: 'platform',
          Component: PlatformGuard,
          children: [
            {
              Component: PlatformLayout,
              HydrateFallback: PageLoader,
              children: [
                {
                  path: 'overview',
                  lazy: async () => {
                    const { PlatformOverviewPlaceholderPage } = await import(
                      '@/features/platform/pages/platform-overview-placeholder-page'
                    );
                    return { Component: PlatformOverviewPlaceholderPage };
                  },
                },
                {
                  path: 'users',
                  lazy: async () => {
                    const { PlatformSectionPlaceholderPage } = await import(
                      '@/features/platform/pages/platform-section-placeholder-page'
                    );
                    return { Component: () => <PlatformSectionPlaceholderPage title="Utilisateurs" /> };
                  },
                },
                {
                  path: 'workspaces',
                  lazy: async () => {
                    const { PlatformSectionPlaceholderPage } = await import(
                      '@/features/platform/pages/platform-section-placeholder-page'
                    );
                    return { Component: () => <PlatformSectionPlaceholderPage title="Workspaces" /> };
                  },
                },
                {
                  path: 'plans',
                  lazy: async () => {
                    const { PlatformSectionPlaceholderPage } = await import(
                      '@/features/platform/pages/platform-section-placeholder-page'
                    );
                    return { Component: () => <PlatformSectionPlaceholderPage title="Plans" /> };
                  },
                },
                {
                  path: 'subscriptions',
                  lazy: async () => {
                    const { PlatformSectionPlaceholderPage } = await import(
                      '@/features/platform/pages/platform-section-placeholder-page'
                    );
                    return { Component: () => <PlatformSectionPlaceholderPage title="Abonnements" /> };
                  },
                },
                {
                  path: 'audit-logs',
                  lazy: async () => {
                    const { PlatformSectionPlaceholderPage } = await import(
                      '@/features/platform/pages/platform-section-placeholder-page'
                    );
                    return { Component: () => <PlatformSectionPlaceholderPage title="Audit logs" /> };
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      path: '*',
      HydrateFallback: PageLoader,
      lazy: async () => {
        const { NotFoundPage } = await import('@/pages/not-found-page');
        return { Component: NotFoundPage };
      },
    },
  ];
}

const appRouter = createBrowserRouter(createAppRoutes());

export { appRouter, createAppRoutes };
