import { createBrowserRouter } from 'react-router';

import App from '@/App';
import { AccountLayout } from '@/app/layouts/account-layout';
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
      Component: AuthLayout,
      HydrateFallback: PageLoader,
      children: [
        {
          path: 'forgot-password',
          lazy: async () => {
            const { ForgotPasswordPage } = await import(
              '@/features/auth/pages/forgot-password-page'
            );
            return { Component: ForgotPasswordPage };
          },
        },
        {
          path: 'reset-password',
          lazy: async () => {
            const { ResetPasswordPage } = await import(
              '@/features/auth/pages/reset-password-page'
            );
            return { Component: ResetPasswordPage };
          },
        },
      ],
    },
    {
      Component: AuthGuard,
      children: [
        {
          path: 'account',
          Component: AccountLayout,
          HydrateFallback: PageLoader,
          children: [
            {
              path: 'profile',
              lazy: async () => {
                const { ProfilePage } = await import('@/features/account/pages/profile-page');
                return { Component: ProfilePage };
              },
            },
            {
              path: 'security',
              lazy: async () => {
                const { SecurityPage } = await import('@/features/account/pages/security-page');
                return { Component: SecurityPage };
              },
            },
          ],
        },
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
                    const { WorkspaceMembersRoute } = await import(
                      '@/features/workspace-members/components/workspace-members-route'
                    );
                    return { Component: WorkspaceMembersRoute };
                  },
                },
                {
                  path: 'roles',
                  lazy: async () => {
                    const { WorkspaceRolesRoute } = await import(
                      '@/features/workspace-roles/components/workspace-roles-route'
                    );
                    return { Component: WorkspaceRolesRoute };
                  },
                },
                {
                  path: 'files',
                  lazy: async () => {
                    const { WorkspaceFilesRoute } = await import(
                      '@/features/files/components/workspace-files-route'
                    );
                    return { Component: WorkspaceFilesRoute };
                  },
                },
                {
                  path: 'subscription',
                  lazy: async () => {
                    const { WorkspaceSubscriptionRoute } = await import(
                      '@/features/subscription/components/workspace-subscription-route'
                    );
                    return { Component: WorkspaceSubscriptionRoute };
                  },
                },
                {
                  path: 'activity',
                  lazy: async () => {
                    const { WorkspaceAuditLogRoute } = await import(
                      '@/features/audit-log/components/workspace-audit-log-route'
                    );
                    return { Component: WorkspaceAuditLogRoute };
                  },
                },
                {
                  path: 'settings',
                  lazy: async () => {
                    const { WorkspaceSettingsPage } = await import(
                      '@/features/workspace/pages/workspace-settings-page'
                    );
                    return { Component: WorkspaceSettingsPage };
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
                    const { PlatformOverviewPage } = await import(
                      '@/features/platform/pages/platform-overview-page'
                    );
                    return { Component: PlatformOverviewPage };
                  },
                },
                {
                  path: 'users',
                  lazy: async () => {
                    const { PlatformUsersPage } = await import(
                      '@/features/platform/pages/platform-users-page'
                    );
                    return { Component: PlatformUsersPage };
                  },
                },
                {
                  path: 'workspaces',
                  lazy: async () => {
                    const { PlatformWorkspacesPage } = await import(
                      '@/features/platform/pages/platform-workspaces-page'
                    );
                    return { Component: PlatformWorkspacesPage };
                  },
                },
                {
                  path: 'plans',
                  lazy: async () => {
                    const { PlatformPlansPage } = await import(
                      '@/features/platform/pages/platform-plans-page'
                    );
                    return { Component: PlatformPlansPage };
                  },
                },
                {
                  path: 'subscriptions',
                  lazy: async () => {
                    const { PlatformSubscriptionsPage } = await import(
                      '@/features/platform/pages/platform-subscriptions-page'
                    );
                    return { Component: PlatformSubscriptionsPage };
                  },
                },
                {
                  path: 'audit-logs',
                  lazy: async () => {
                    const { PlatformAuditLogsPage } = await import(
                      '@/features/platform/pages/platform-audit-logs-page'
                    );
                    return { Component: PlatformAuditLogsPage };
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
