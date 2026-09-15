import { Tabs as BaseTabs } from '@base-ui/react/tabs';

import { cn } from '@/lib/utils';

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

function TabsList({ className, ...props }) {
  return (
    <BaseTabs.List
      className={cn(
        'inline-flex min-h-10 items-center gap-1 rounded-lg border border-border bg-muted/40 p-1',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <BaseTabs.Tab
      className={cn(
        'inline-flex min-h-8 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground outline-none transition-colors',
        'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'data-active:bg-background data-active:text-foreground data-active:shadow-sm',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }) {
  return (
    <BaseTabs.Panel
      className={cn('mt-4 outline-none', className)}
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
