import {
  Building2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Database,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';

import { Button } from '@/components/ui/button';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import {
  canDisplayPlatformNavigationItem,
  getActivePlatformNavigationGroupId,
  getVisiblePlatformNavigationSections,
  platformNavigationItems,
  platformNavigationSections,
} from '@/features/platform/lib/platform-navigation';
import { cn } from '@/lib/utils';

const NAV_ITEM_CLASS = 'group relative flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors';

const PLATFORM_NAVIGATION_ICONS = Object.freeze({
  overview: LayoutDashboard,
  clients: Users,
  users: Users,
  workspaces: Building2,
  commercial: CreditCard,
  plans: Tags,
  subscriptions: CreditCard,
  'commercial-invitations': CreditCard,
  'entitlement-overrides': SlidersHorizontal,
  'platform-team': ShieldCheck,
  team: ShieldCheck,
  'security-data': ClipboardList,
  'audit-logs': ClipboardList,
  retention: Database,
});

function PlatformSidebarLabel({ collapsed, children }) {
  return (
    <span
      className={cn(
        'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out',
        collapsed ? 'max-w-0 opacity-0' : 'max-w-48 opacity-100',
      )}
    >
      {children}
    </span>
  );
}

function PlatformSidebarTooltip({ collapsed, label }) {
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

function isPlatformItemActive(item, pathname) {
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function PlatformNavigationLink({ collapsed = false, item, nested = false, onNavigate }) {
  const Icon = PLATFORM_NAVIGATION_ICONS[item.id];

  return (
    <NavLink
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) => cn(
        NAV_ITEM_CLASS,
        nested && !collapsed && 'pl-5',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
      onClick={onNavigate}
      to={item.to}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <PlatformSidebarLabel collapsed={collapsed}>{item.label}</PlatformSidebarLabel>
      <PlatformSidebarTooltip collapsed={collapsed} label={item.label} />
    </NavLink>
  );
}

function PlatformNavigationGroup({
  collapsed,
  expanded,
  group,
  pathname,
  onFlyoutChange,
  onGroupToggle,
  openFlyoutGroupId,
}) {
  const Icon = PLATFORM_NAVIGATION_ICONS[group.id];
  const active = group.items.some((item) => isPlatformItemActive(item, pathname));
  const flyoutOpen = collapsed && openFlyoutGroupId === group.id;

  function toggleGroup() {
    if (collapsed) {
      onFlyoutChange(flyoutOpen ? null : group.id);
      return;
    }

    onGroupToggle(group.id);
  }

  return (
    <div className="relative">
      <button
        aria-expanded={collapsed ? flyoutOpen : expanded}
        aria-label={collapsed ? group.label : undefined}
        className={cn(
          NAV_ITEM_CLASS,
          'justify-start',
          active
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
        onClick={toggleGroup}
        type="button"
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <PlatformSidebarLabel collapsed={collapsed}>{group.label}</PlatformSidebarLabel>
        {!collapsed && (
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'ml-auto size-4 shrink-0 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        )}
        <PlatformSidebarTooltip collapsed={collapsed} label={group.label} />
      </button>

      {!collapsed && (
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-200 ease-in-out',
            expanded
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-1 pt-1">
              {group.items.map((item) => (
                <PlatformNavigationLink item={item} key={item.id} nested />
              ))}
            </div>
          </div>
        </div>
      )}

      {flyoutOpen && (
        <div className="absolute left-full top-0 z-[70] ml-3 w-64 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg">
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <PlatformNavigationLink
                item={item}
                key={item.id}
                onNavigate={() => onFlyoutChange(null)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformSidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const visibleNavigation = getVisiblePlatformNavigationSections(
    platformAccess?.permissions,
  );
  const activeGroupId = getActivePlatformNavigationGroupId(
    visibleNavigation,
    location.pathname,
  );
  const [openGroupId, setOpenGroupId] = useState(() => activeGroupId);
  const [openFlyoutGroupId, setOpenFlyoutGroupId] = useState(null);
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  useEffect(() => {
    setOpenGroupId(activeGroupId);
    setOpenFlyoutGroupId(null);
  }, [activeGroupId, location.pathname]);

  function toggleGroup(groupId) {
    setOpenGroupId((current) => current === groupId ? null : groupId);
  }

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-svh shrink-0 self-start overflow-visible border-r border-border bg-card transition-[width] duration-300 ease-in-out md:flex md:flex-col',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p
            aria-hidden={collapsed}
            className={cn(
              'truncate font-semibold text-card-foreground transition-opacity duration-200',
              collapsed ? 'opacity-0' : 'opacity-100',
            )}
          >
            Administration
          </p>
        </div>

        <Button
          aria-label={collapsed ? 'Déployer la navigation d’administration' : 'Réduire la navigation d’administration'}
          className="shrink-0"
          onClick={() => {
            setOpenFlyoutGroupId(null);
            onToggle();
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ToggleIcon aria-hidden="true" />
        </Button>
      </div>

      <nav
        aria-label="Navigation de la plateforme"
        className={cn(
          'min-h-0 flex-1 space-y-1 p-3',
          collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden',
        )}
      >
        {visibleNavigation.map((entry) => (
          entry.type === 'group' ? (
            <PlatformNavigationGroup
              collapsed={collapsed}
              expanded={openGroupId === entry.id}
              group={entry}
              key={entry.id}
              onFlyoutChange={setOpenFlyoutGroupId}
              onGroupToggle={toggleGroup}
              openFlyoutGroupId={openFlyoutGroupId}
              pathname={location.pathname}
            />
          ) : (
            <PlatformNavigationLink
              collapsed={collapsed}
              item={entry}
              key={entry.id}
            />
          )
        ))}
      </nav>
    </aside>
  );
}

export {
  PLATFORM_NAVIGATION_ICONS,
  PlatformNavigationGroup,
  PlatformNavigationLink,
  PlatformSidebar,
  PlatformSidebarLabel,
  PlatformSidebarTooltip,
  canDisplayPlatformNavigationItem,
  getVisiblePlatformNavigationSections,
  platformNavigationItems,
  platformNavigationSections,
};
