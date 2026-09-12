import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva } from 'class-variance-authority';
import { PanelLeft } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '5rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

const SidebarContext = createContext(null);

function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

/**
 * Adapte le provider shadcn au SPA Core : l'état reste local au layout et
 * n'est pas persisté en cookie, afin de ne pas introduire une préférence
 * implicite différente du contrat de préférences déjà existant.
 */
function SidebarProvider({
  children,
  className,
  defaultOpen = true,
  onOpenChange,
  open: openProp,
  style,
  ...props
}) {
  const isMobile = useIsMobile();
  const sidebarId = useId();
  const [openMobile, setOpenMobile] = useState(false);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;

  const setOpen = useCallback((value) => {
    const nextOpen = typeof value === 'function' ? value(open) : value;

    if (openProp === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }, [onOpenChange, open, openProp]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((current) => !current);
      return;
    }

    setOpen((current) => !current);
  }, [isMobile, setOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT
        && (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? 'expanded' : 'collapsed';
  const value = useMemo(() => ({
    isMobile,
    open,
    openMobile,
    setOpen,
    setOpenMobile,
    sidebarId,
    state,
    toggleSidebar,
  }), [isMobile, open, openMobile, setOpen, sidebarId, state, toggleSidebar]);

  return (
    <SidebarContext.Provider value={value}>
      <div
        className={cn('group/sidebar-wrapper flex min-h-svh w-full bg-background', className)}
        data-slot="sidebar-wrapper"
        style={{
          '--sidebar-width': SIDEBAR_WIDTH,
          '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  children,
  className,
  collapsible = 'offcanvas',
  side = 'left',
  variant = 'sidebar',
  ...props
}) {
  const {
    isMobile,
    openMobile,
    setOpenMobile,
    sidebarId,
    state,
  } = useSidebar();

  if (collapsible === 'none') {
    return (
      <aside
        className={cn(
          'flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar text-sidebar-foreground',
          className,
        )}
        id={sidebarId}
        {...props}
      >
        {children}
      </aside>
    );
  }

  if (isMobile) {
    return (
      <Sheet onOpenChange={setOpenMobile} open={openMobile}>
        <SheetContent
          className="w-[min(var(--sidebar-width),85vw)] bg-sidebar p-0 text-sidebar-foreground"
          id={sidebarId}
          showCloseButton={false}
          side={side}
          style={{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Navigation principale de l’application.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-side={side}
      data-state={state}
      data-variant={variant}
      data-slot="sidebar"
    >
      <div
        aria-hidden="true"
        className={cn(
          'relative w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear motion-reduce:transition-none',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]',
        )}
      />
      <aside
        className={cn(
          'fixed inset-y-0 z-40 hidden h-svh w-[var(--sidebar-width)] transition-[left,right,width] duration-200 ease-linear motion-reduce:transition-none md:flex',
          side === 'left' ? 'left-0' : 'right-0',
          side === 'left'
            ? 'group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
            : 'group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
          'group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]',
          variant === 'sidebar' && side === 'left' && 'border-r border-sidebar-border',
          variant === 'sidebar' && side === 'right' && 'border-l border-sidebar-border',
          className,
        )}
        id={sidebarId}
        {...props}
      >
        <div
          className="flex size-full flex-col bg-sidebar text-sidebar-foreground"
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
        >
          {children}
        </div>
      </aside>
    </div>
  );
}

function SidebarTrigger({ className, onClick, scope = '', ...props }) {
  const {
    isMobile,
    openMobile,
    sidebarId,
    state,
    toggleSidebar,
  } = useSidebar();
  const expanded = isMobile ? openMobile : state === 'expanded';
  const label = isMobile
    ? `${expanded ? 'Fermer' : 'Ouvrir'} la navigation${scope}`
    : `${expanded ? 'Réduire' : 'Déployer'} la navigation${scope}`;

  return (
    <Button
      aria-controls={sidebarId}
      aria-expanded={expanded}
      aria-label={label}
      className={cn('shrink-0', className)}
      data-sidebar="trigger"
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    >
      <PanelLeft aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function SidebarInset({ className, ...props }) {
  return (
    <main
      className={cn('relative flex min-w-0 flex-1 flex-col', className)}
      data-slot="sidebar-inset"
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col', className)}
      data-sidebar="header"
      data-slot="sidebar-header"
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col', className)}
      data-sidebar="footer"
      data-slot="sidebar-footer"
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-auto group-data-[collapsible=icon]:overflow-hidden',
        className,
      )}
      data-sidebar="content"
      data-slot="sidebar-content"
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }) {
  return (
    <div
      className={cn('relative flex w-full min-w-0 flex-col', className)}
      data-sidebar="group"
      data-slot="sidebar-group"
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }) {
  return (
    <div
      className={cn('w-full', className)}
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }) {
  return (
    <ul
      className={cn('flex w-full min-w-0 flex-col gap-1', className)}
      data-sidebar="menu"
      data-slot="sidebar-menu"
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }) {
  return (
    <li
      className={cn('group/menu-item relative', className)}
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  'peer/menu-button group/menu-button flex min-h-10 w-full items-center gap-2 overflow-hidden rounded-md px-3 text-left text-sm font-medium outline-none transition-colors motion-reduce:transition-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: '',
        outline: 'border border-sidebar-border bg-background',
      },
      size: {
        default: 'min-h-10',
        sm: 'min-h-9 text-xs',
        lg: 'min-h-12 text-sm',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  },
);

function SidebarMenuButton({
  className,
  isActive = false,
  render,
  size = 'default',
  tooltip,
  variant = 'default',
  ...props
}) {
  const { isMobile, state } = useSidebar();
  const component = useRender({
    defaultTagName: 'button',
    props: mergeProps(
      {
        'data-active': isActive,
        className: cn(sidebarMenuButtonVariants({ size, variant }), className),
      },
      props,
    ),
    render: !tooltip ? render : <TooltipTrigger render={render} />,
    state: {
      active: isActive,
      sidebar: 'menu-button',
      size,
      slot: 'sidebar-menu-button',
    },
  });

  if (!tooltip) return component;

  const tooltipProps = typeof tooltip === 'string'
    ? { children: tooltip }
    : tooltip;

  return (
    <Tooltip>
      {component}
      <TooltipContent
        align="center"
        hidden={state !== 'collapsed' || isMobile}
        side="right"
        {...tooltipProps}
      />
    </Tooltip>
  );
}

function SidebarMenuSub({ className, ...props }) {
  return (
    <ul
      className={cn(
        'ml-4 mt-1 flex min-w-0 flex-col gap-1 border-l border-sidebar-border pl-2',
        className,
      )}
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }) {
  return (
    <li
      className={cn('group/menu-sub-item relative', className)}
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  className,
  isActive = false,
  render,
  ...props
}) {
  return useRender({
    defaultTagName: 'a',
    props: mergeProps(
      {
        'data-active': isActive,
        className: cn(
          'flex min-h-9 min-w-0 items-center gap-2 overflow-hidden rounded-md px-3 text-sm outline-none transition-colors motion-reduce:transition-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      active: isActive,
      sidebar: 'menu-sub-button',
      slot: 'sidebar-menu-sub-button',
    },
  });
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  sidebarMenuButtonVariants,
  useSidebar,
};
