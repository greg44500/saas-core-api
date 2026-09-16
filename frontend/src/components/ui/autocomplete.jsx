import { Autocomplete as BaseAutocomplete } from '@base-ui/react/autocomplete';

import { cn } from '@/lib/utils';

function Autocomplete(props) {
  return <BaseAutocomplete.Root {...props} />;
}

function AutocompleteInputGroup({ className, ...props }) {
  return (
    <BaseAutocomplete.InputGroup
      className={cn(
        'relative flex min-h-11 w-full items-center rounded-md border border-input bg-background',
        'shadow-xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteInput({ className, ...props }) {
  return (
    <BaseAutocomplete.Input
      className={cn(
        'h-11 w-full bg-transparent px-10 text-sm text-foreground outline-none',
        'placeholder:text-muted-foreground disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteClear({ className, ...props }) {
  return (
    <BaseAutocomplete.Clear
      className={cn(
        'absolute right-2 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground',
        'outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  );
}

function AutocompletePortal(props) {
  return <BaseAutocomplete.Portal {...props} />;
}

function AutocompletePositioner({ className, sideOffset = 6, ...props }) {
  return (
    <BaseAutocomplete.Positioner
      align="start"
      className={cn(
        'z-[var(--layer-popover)] w-[var(--anchor-width)] outline-none',
        className,
      )}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function AutocompletePopup({ className, ...props }) {
  return (
    <BaseAutocomplete.Popup
      className={cn(
        'w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md',
        'outline-none data-[open]:animate-in data-[closed]:animate-out',
        'data-[open]:fade-in-0 data-[closed]:fade-out-0 data-[open]:zoom-in-95 data-[closed]:zoom-out-95',
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteList({ className, ...props }) {
  return (
    <BaseAutocomplete.List
      className={cn('max-h-80 overflow-y-auto p-1', className)}
      {...props}
    />
  );
}

function AutocompleteItem({ className, ...props }) {
  return (
    <BaseAutocomplete.Item
      className={cn(
        'flex cursor-default flex-col gap-1 rounded-sm px-3 py-2.5 text-sm outline-none',
        'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteEmpty({ className, ...props }) {
  return (
    <BaseAutocomplete.Empty
      className={cn(
        'px-3 py-4 text-center text-sm text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteStatus({ className, ...props }) {
  return (
    <BaseAutocomplete.Status
      className={cn('sr-only', className)}
      {...props}
    />
  );
}

export {
  Autocomplete,
  AutocompleteClear,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompletePortal,
  AutocompletePositioner,
  AutocompleteStatus,
};
