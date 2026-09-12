import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@/lib/utils';

function Popover(props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  align = 'center',
  alignOffset = 0,
  children,
  className,
  side = 'bottom',
  sideOffset = 6,
  ...props
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        className="z-[var(--layer-flyout)] outline-none"
        side={side}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          className={cn(
            'w-72 origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg outline-none',
            'transition-[transform,opacity] duration-150 motion-reduce:transition-none',
            'data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
            className,
          )}
          data-slot="popover-content"
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
