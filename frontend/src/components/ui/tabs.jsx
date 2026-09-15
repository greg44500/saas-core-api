import { Tabs as BaseTabs } from '@base-ui/react/tabs';

import {
  SECTION_TAB_BASE_UI_STATE_CLASS_NAME,
  SECTION_TAB_LIST_CLASS_NAME,
  SECTION_TAB_NAV_CLASS_NAME,
  SECTION_TAB_TRIGGER_BASE_CLASS_NAME,
} from '@/components/ui/section-tab-styles';
import { cn } from '@/lib/utils';

const TABS_LIST_VARIANTS = Object.freeze({
  default:
    'inline-flex min-h-10 items-center gap-1 rounded-lg border border-border bg-muted/40 p-1',
  section: `${SECTION_TAB_NAV_CLASS_NAME} ${SECTION_TAB_LIST_CLASS_NAME} w-full`,
});

const TABS_TRIGGER_VARIANTS = Object.freeze({
  default: [
    'inline-flex min-h-8 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground outline-none transition-colors',
    'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'data-active:bg-background data-active:text-foreground data-active:shadow-sm',
    'data-disabled:pointer-events-none data-disabled:opacity-50',
  ].join(' '),
  section: [
    SECTION_TAB_TRIGGER_BASE_CLASS_NAME,
    SECTION_TAB_BASE_UI_STATE_CLASS_NAME,
    'data-disabled:pointer-events-none data-disabled:opacity-50',
  ].join(' '),
});

const TABS_CONTENT_VARIANTS = Object.freeze({
  default: 'mt-4 outline-none',
  section: 'mt-6 outline-none',
});

function Tabs({ onValueChange, ...props }) {
  return (
    <BaseTabs.Root
      onValueChange={
        onValueChange
          ? (value) => onValueChange(value)
          : undefined
      }
      {...props}
    />
  );
}

function TabsList({ className, variant = 'default', ...props }) {
  return (
    <BaseTabs.List
      className={cn(
        TABS_LIST_VARIANTS[variant] ?? TABS_LIST_VARIANTS.default,
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, variant = 'default', ...props }) {
  return (
    <BaseTabs.Tab
      className={cn(
        TABS_TRIGGER_VARIANTS[variant] ?? TABS_TRIGGER_VARIANTS.default,
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, variant = 'default', ...props }) {
  return (
    <BaseTabs.Panel
      className={cn(
        TABS_CONTENT_VARIANTS[variant] ?? TABS_CONTENT_VARIANTS.default,
        className,
      )}
      {...props}
    />
  );
}

export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
};
