import {
  Building2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Tags,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router';

import { Button } from '@/components/ui/button';

const platformNavigationItems = [
  { label: 'Vue d’ensemble', Icon: LayoutDashboard, to: '/platform/overview' },
  { label: 'Utilisateurs', Icon: Users, to: '/platform/users' },
  { label: 'Workspaces', Icon: Building2, to: '/platform/workspaces' },
  { label: 'Plans', Icon: Tags, to: '/platform/plans' },
  { label: 'Abonnements', Icon: CreditCard, to: '/platform/subscriptions' },
  { label: 'Audit logs', Icon: ClipboardList, to: '/platform/audit-logs' },
];

function PlatformSidebarLabel({ collapsed, children }) {
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

function PlatformSidebarTooltip({ collapsed, label }) {
  if (!collapsed) {
    return null;
  }

  return (
    <span
      className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      role="tooltip"
    >
      {label}
    </span>
  );
}

function PlatformSidebar({ collapsed, onToggle }) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={`hidden min-h-screen shrink-0 overflow-visible border-r border-border bg-card transition-[width] duration-300 ease-in-out md:flex md:flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center border-b border-border px-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            aria-hidden={collapsed}
            className={`transition-opacity duration-200 ${
              collapsed ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Administration
            </p>
            <p className="truncate font-semibold text-card-foreground">Platform</p>
          </div>
        </div>

        <Button
          aria-label={collapsed ? 'Déployer la navigation Platform' : 'Réduire la navigation Platform'}
          className="shrink-0"
          onClick={onToggle}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ToggleIcon aria-hidden="true" />
        </Button>
      </div>

      <nav aria-label="Navigation Platform" className="flex-1 overflow-visible p-3">
        <div className="space-y-1">
          {platformNavigationItems.map(({ label, Icon, to }) => (
            <NavLink
              aria-label={collapsed ? label : undefined}
              className={({ isActive }) =>
                `group relative flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
              key={to}
              to={to}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <PlatformSidebarLabel collapsed={collapsed}>{label}</PlatformSidebarLabel>
              <PlatformSidebarTooltip collapsed={collapsed} label={label} />
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
}

export {
  PlatformSidebar,
  PlatformSidebarLabel,
  PlatformSidebarTooltip,
  platformNavigationItems,
};
