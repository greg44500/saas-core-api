import {
  CreditCard,
  Files,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router';

import { Button } from '@/components/ui/button';

const futureNavigationItems = [
  { label: 'Membres', Icon: Users },
  { label: 'Fichiers', Icon: Files },
  { label: 'Abonnement', Icon: CreditCard },
  { label: 'Paramètres', Icon: Settings },
];

function WorkspaceSidebar({ collapsed, onToggle, workspace }) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={`hidden min-h-screen shrink-0 border-r border-border bg-card md:flex md:flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className={collapsed ? 'sr-only' : 'min-w-0'}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
          <p className="truncate font-semibold text-card-foreground">{workspace.name}</p>
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

      <nav aria-label="Navigation du workspace" className="flex-1 space-y-6 p-3">
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Principal
            </p>
          )}
          <NavLink
            className={({ isActive }) =>
              `flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
            to={`/workspaces/${workspace.id}/dashboard`}
          >
            <LayoutDashboard aria-hidden="true" className="size-4 shrink-0" />
            {!collapsed && <span>Tableau de bord</span>}
          </NavLink>
        </div>

        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Core
            </p>
          )}
          {futureNavigationItems.map(({ label, Icon }) => (
            <span
              aria-disabled="true"
              className="flex min-h-10 cursor-not-allowed items-center gap-2 rounded-md px-3 text-sm text-muted-foreground/60"
              key={label}
              title={`${label} — lot futur`}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </span>
          ))}
        </div>
      </nav>
    </aside>
  );
}

export { WorkspaceSidebar };
