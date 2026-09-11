import { Select as BaseSelect } from '@base-ui/react/select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';

function Select(props) {
  return <BaseSelect.Root {...props} />;
}

function SelectTrigger({ className, children, ...props }) {
  return (
    <BaseSelect.Trigger
      className={cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
        'outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon className="shrink-0 text-muted-foreground">
        <ChevronDown aria-hidden="true" className="size-4" />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

function SelectValue({ className, ...props }) {
  return (
    <BaseSelect.Value
      className={cn('min-w-0 flex-1 truncate text-left', className)}
      {...props}
    />
  );
}

function SelectContent({ className, children, sideOffset = 4, ...props }) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        className="z-[var(--layer-modal)] outline-none"
        sideOffset={sideOffset}
      >
        <BaseSelect.Popup
          className={cn(
            'min-w-[var(--anchor-width)] max-w-[min(32rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md',
            'outline-none',
            className,
          )}
          {...props}
        >
          <BaseSelect.ScrollUpArrow className="flex h-6 items-center justify-center bg-popover text-muted-foreground">
            <ChevronUp aria-hidden="true" className="size-4" />
          </BaseSelect.ScrollUpArrow>
          <BaseSelect.List className="max-h-60 overflow-y-auto p-1">
            {children}
          </BaseSelect.List>
          <BaseSelect.ScrollDownArrow className="flex h-6 items-center justify-center bg-popover text-muted-foreground">
            <ChevronDown aria-hidden="true" className="size-4" />
          </BaseSelect.ScrollDownArrow>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

function SelectGroup({ className, ...props }) {
  return (
    <BaseSelect.Group
      className={cn('py-0.5', className)}
      {...props}
    />
  );
}

function SelectLabel({ className, ...props }) {
  return (
    <BaseSelect.GroupLabel
      className={cn(
        'px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }) {
  return (
    <BaseSelect.Item
      className={cn(
        'relative flex min-h-8 cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <BaseSelect.ItemIndicator>
          <Check aria-hidden="true" className="size-4" />
        </BaseSelect.ItemIndicator>
      </span>
      <BaseSelect.ItemText className="min-w-0 flex-1 truncate">
        {children}
      </BaseSelect.ItemText>
    </BaseSelect.Item>
  );
}

function SelectSeparator({ className, ...props }) {
  return (
    <BaseSelect.Separator
      className={cn('-mx-1 my-0.5 h-px bg-border', className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
