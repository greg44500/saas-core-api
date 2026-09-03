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

const platformNavigationSections = [
  {
    id: 'pilotage',
    label: 'Pilotage',
    items: [
      { label: 'Vue d’ensemble', Icon: LayoutDashboard, to: '/platform/overview' },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    items: [
      { label: 'Utilisateurs', Icon: Users, to: '/platform/users' },
      { label: 'Espaces de travail', Icon: Building2, to: '/platform/workspaces' },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    items: [
      { label: 'Plans', Icon: Tags, to: '/platform/plans' },
      { label: 'Abonnements', Icon: CreditCard, to: '/platform/subscriptions' },
    ],
  },
  {
    id: 'supervision',
    label: 'Supervision',
    items: [
      { label: 'Journaux d’audit', Icon: ClipboardList, to: '/platform/audit-logs' },
    ],
  },
];

/*
 * Export plat conservé pour les consommateurs qui ont seulement besoin de la
 * liste des destinations. La sidebar utilise la structure par sections afin
 * que l'organisation visuelle ne duplique jamais la configuration des liens.
 */
const platformNavigationItems = platformNavigationSections.flatMap(
  (section) => section.items,
);

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
          <p
            aria-hidden={collapsed}
            className={`truncate font-semibold text-card-foreground transition-opacity duration-200 ${
              collapsed ? 'opacity-0' : 'opacity-100'
            }`}
          >
            Administration
          </p>
        </div>

        <Button
          aria-label={collapsed ? 'Déployer la navigation d’administration' : 'Réduire la navigation d’administration'}
          className="shrink-0"
          onClick={onToggle}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ToggleIcon aria-hidden="true" />
        </Button>
      </div>

      <nav aria-label="Navigation de la plateforme" className="flex-1 overflow-visible p-3">
        {platformNavigationSections.map((section, sectionIndex) => (
          <div
            aria-label={section.label}
            className={sectionIndex === 0 ? '' : 'mt-5'}
            key={section.id}
            role="group"
          >
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {section.label}
              </p>
            )}

            <div className="space-y-1">
              {section.items.map(({ label, Icon, to }) => (
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
          </div>
        ))}
      </nav>
    </aside>
  );
}

export {
  PlatformSidebar,
  PlatformSidebarLabel,
  PlatformSidebarTooltip,
  platformNavigationItems,
  platformNavigationSections,
};
