import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';

import { Button } from '@/components/ui/button';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { cn } from '@/lib/utils';

const NAV_ITEM_CLASS = 'group relative flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors';

function canDisplayNavigationItem(item, { can, hasFeature }) {
  return (!item.permission || can(item.permission))
    && (!item.feature || hasFeature(item.feature));
}

/**
 * Applique les droits effectifs avant le rendu. Un groupe sans enfant visible
 * disparaît entièrement afin que la navigation reflète le produit réellement
 * disponible dans le workspace.
 */
function filterWorkspaceNavigation(navigation, access) {
  return navigation.flatMap((entry) => {
    if (entry.type !== 'group') {
      return canDisplayNavigationItem(entry, access) ? [entry] : [];
    }

    const items = (entry.items ?? []).filter((item) =>
      canDisplayNavigationItem(item, access));

    return items.length > 0
      ? [{ ...entry, items }]
      : [];
  });
}

function SidebarLabel({ collapsed, children }) {
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

function isNavigationItemActive({ item, pathname, workspaceId }) {
  const target = `/workspaces/${workspaceId}/${item.path}`;
  return pathname === target || pathname.startsWith(`${target}/`);
}

function WorkspaceNavigationLink({
  collapsed = false,
  item,
  nested = false,
  onNavigate,
  workspaceId,
}) {
  const { Icon } = item;

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
      to={`/workspaces/${workspaceId}/${item.path}`}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <SidebarLabel collapsed={collapsed}>{item.label}</SidebarLabel>
      <SidebarTooltip collapsed={collapsed} label={item.label} />
    </NavLink>
  );
}

function WorkspaceNavigationGroup({
  collapsed,
  group,
  location,
  onFlyoutChange,
  openFlyoutGroupId,
  openGroups,
  setOpenGroups,
  workspaceId,
}) {
  const { Icon } = group;
  const active = group.items.some((item) =>
    isNavigationItemActive({ item, pathname: location.pathname, workspaceId }));
  const expanded = active || openGroups.has(group.id);
  const flyoutOpen = collapsed && openFlyoutGroupId === group.id;

  function toggleGroup() {
    if (collapsed) {
      onFlyoutChange(flyoutOpen ? null : group.id);
      return;
    }

    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(group.id)) next.delete(group.id);
      else next.add(group.id);
      return next;
    });
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
        <SidebarLabel collapsed={collapsed}>{group.label}</SidebarLabel>
        {!collapsed && (
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'ml-auto size-4 shrink-0 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        )}
        <SidebarTooltip collapsed={collapsed} label={group.label} />
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
                <WorkspaceNavigationLink
                  item={item}
                  key={item.id}
                  nested
                  workspaceId={workspaceId}
                />
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
              <WorkspaceNavigationLink
                item={item}
                key={item.id}
                onNavigate={() => onFlyoutChange(null)}
                workspaceId={workspaceId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkspaceSidebar({
  collapsed,
  navigation = [],
  onToggle,
  workspace,
}) {
  const location = useLocation();
  const { can, hasFeature } = useWorkspaceContext();
  const [openGroups, setOpenGroups] = useState(() => new Set());
  const [openFlyoutGroupId, setOpenFlyoutGroupId] = useState(null);
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const visibleNavigation = filterWorkspaceNavigation(navigation, {
    can,
    hasFeature,
  });

  return (
    <aside
      className={cn(
        'hidden min-h-screen shrink-0 overflow-visible border-r border-border bg-card transition-[width] duration-300 ease-in-out md:flex md:flex-col',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="flex h-16 items-center border-b border-border px-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            aria-hidden={collapsed}
            className={cn(
              'transition-opacity duration-200',
              collapsed ? 'opacity-0' : 'opacity-100',
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspace</p>
            <p className="truncate font-semibold text-card-foreground">{workspace.name}</p>
          </div>
        </div>
        <Button
          aria-label={collapsed ? 'Déployer la navigation' : 'Réduire la navigation'}
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

      <nav aria-label="Navigation du workspace" className="flex-1 space-y-1 overflow-visible p-3">
        {visibleNavigation.map((entry) => (
          entry.type === 'group' ? (
            <WorkspaceNavigationGroup
              collapsed={collapsed}
              group={entry}
              key={entry.id}
              location={location}
              onFlyoutChange={setOpenFlyoutGroupId}
              openFlyoutGroupId={openFlyoutGroupId}
              openGroups={openGroups}
              setOpenGroups={setOpenGroups}
              workspaceId={workspace.id}
            />
          ) : (
            <WorkspaceNavigationLink
              collapsed={collapsed}
              item={entry}
              key={entry.id}
              workspaceId={workspace.id}
            />
          )
        ))}
      </nav>
    </aside>
  );
}

export {
  SidebarLabel,
  SidebarTooltip,
  WorkspaceNavigationGroup,
  WorkspaceNavigationLink,
  WorkspaceSidebar,
  filterWorkspaceNavigation,
};
