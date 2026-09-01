import { NavLink } from 'react-router';

import { Button } from '@/components/ui/button';

const futureNavigationItems = ['Membres', 'Fichiers', 'Abonnement', 'Paramètres'];

function WorkspaceSidebar({ collapsed, onToggle, workspace }) {
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
          size="sm"
          type="button"
          variant="ghost"
        >
          {collapsed ? '→' : '←'}
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
              `flex min-h-10 items-center rounded-md px-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
            to={`/workspaces/${workspace.id}/dashboard`}
          >
            <span aria-hidden="true" className="w-6 shrink-0">
              D
            </span>
            {!collapsed && <span>Tableau de bord</span>}
          </NavLink>
        </div>

        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Core
            </p>
          )}
          {futureNavigationItems.map((item) => (
            <span
              aria-disabled="true"
              className="flex min-h-10 cursor-not-allowed items-center rounded-md px-3 text-sm text-muted-foreground/60"
              key={item}
              title={`${item} — lot futur`}
            >
              <span aria-hidden="true" className="w-6 shrink-0">
                {item.charAt(0)}
              </span>
              {!collapsed && <span>{item}</span>}
            </span>
          ))}
        </div>
      </nav>
    </aside>
  );
}

export { WorkspaceSidebar };
