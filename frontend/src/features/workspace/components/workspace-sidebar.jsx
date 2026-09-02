import {
  CreditCard,
  Files,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router';

import { Button } from '@/components/ui/button';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const administrationNavigationItems = [
  {
    label: 'Membres',
    Icon: Users,
    permission: WORKSPACE_PERMISSION.MEMBER_READ,
    path: 'members',
  },
  {
    label: 'Rôles et permissions',
    Icon: ShieldCheck,
    permission: WORKSPACE_PERMISSION.ROLE_READ,
    path: 'roles',
  },
  {
    label: 'Fichiers',
    Icon: Files,
    permission: WORKSPACE_PERMISSION.FILE_READ,
    path: 'files',
  },
  {
    label: 'Abonnement',
    Icon: CreditCard,
    permission: WORKSPACE_PERMISSION.SUBSCRIPTION_READ,
  },
  {
    label: 'Paramètres',
    Icon: Settings,
    permission: WORKSPACE_PERMISSION.WORKSPACE_UPDATE,
  },
];

function SidebarLabel({ collapsed, children }) {
  return (
    <span
      className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out ${
        collapsed ? 'max-w-0 opacity-0' : 'max-w-48 opacity-100'
      }`}
    >
      {children}
    </span>
  );
}

function SidebarTooltip({ collapsed, label }) {
  if (!collapsed) return null;

  return (
    <span
      className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      role="tooltip"
    >
      {label}
    </span>
  );
}

function WorkspaceSidebar({ collapsed, onToggle, workspace }) {
  const { can } = useWorkspaceContext();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const visibleAdministrationItems = administrationNavigationItems.filter(
    ({ permission }) => can(permission),
  );

  return (
    <aside
      className={`hidden min-h-screen shrink-0 overflow-visible border-r border-border bg-card transition-[width] duration-300 ease-in-out md:flex md:flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center border-b border-border px-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            className={`transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}
            aria-hidden={collapsed}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspace</p>
            <p className="truncate font-semibold text-card-foreground">{workspace.name}</p>
          </div>
        </div>
        <Button
          aria-label={collapsed ? 'Déployer la navigation' : 'Réduire la navigation'}
          className="shrink-0"
          onClick={onToggle}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ToggleIcon aria-hidden="true" />
        </Button>
      </div>

      <nav aria-label="Navigation du workspace" className="flex-1 space-y-6 overflow-visible p-3">
        <div className="space-y-1">
          <p
            className={`overflow-hidden px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-[max-height,opacity] duration-200 ${
              collapsed ? 'max-h-0 opacity-0' : 'max-h-6 opacity-100'
            }`}
            aria-hidden={collapsed}
          >
            Principal
          </p>

          <NavLink
            aria-label={collapsed ? 'Tableau de bord' : undefined}
            className={({ isActive }) =>
              `group relative flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
            to={`/workspaces/${workspace.id}/dashboard`}
          >
            <LayoutDashboard aria-hidden="true" className="size-4 shrink-0" />
            <SidebarLabel collapsed={collapsed}>Tableau de bord</SidebarLabel>
            <SidebarTooltip collapsed={collapsed} label="Tableau de bord" />
          </NavLink>
        </div>

        {visibleAdministrationItems.length > 0 && (
          <div className="space-y-1">
            <p
              className={`overflow-hidden px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-[max-height,opacity] duration-200 ${
                collapsed ? 'max-h-0 opacity-0' : 'max-h-6 opacity-100'
              }`}
              aria-hidden={collapsed}
            >
              Administration
            </p>

            {visibleAdministrationItems.map(({ label, Icon, path }) => {
              if (path) {
                return (
                  <NavLink
                    aria-label={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `group relative flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`
                    }
                    key={label}
                    to={`/workspaces/${workspace.id}/${path}`}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <SidebarLabel collapsed={collapsed}>{label}</SidebarLabel>
                    <SidebarTooltip collapsed={collapsed} label={label} />
                  </NavLink>
                );
              }

              return (
                <span
                  aria-disabled="true"
                  aria-label={collapsed ? label : undefined}
                  className="group relative flex min-h-10 cursor-not-allowed items-center gap-2 rounded-md px-3 text-sm text-muted-foreground/60 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={label}
                  tabIndex={0}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <SidebarLabel collapsed={collapsed}>{label}</SidebarLabel>
                  <SidebarTooltip collapsed={collapsed} label={label} />
                </span>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}

export {
  SidebarLabel,
  SidebarTooltip,
  WorkspaceSidebar,
  administrationNavigationItems,
};
