import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';

import { cn } from '@/lib/utils';

function TooltipProvider(props) {
  return <BaseTooltip.Provider {...props} />;
}

function Tooltip(props) {
  return <BaseTooltip.Root {...props} />;
}

function TooltipTrigger(props) {
  return <BaseTooltip.Trigger {...props} />;
}

function TooltipContent({
  className,
  children,
  side = 'top',
  sideOffset = 6,
  align = 'center',
  ...props
}) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        align={align}
        className="z-[var(--layer-tooltip)] outline-none"
        side={side}
        sideOffset={sideOffset}
      >
        <BaseTooltip.Popup
          className={cn(
            'max-w-72 rounded-md bg-foreground px-3 py-2 text-xs leading-relaxed text-background shadow-md',
            'outline-none',
            'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0',
            'data-[closed]:zoom-out-95 data-[open]:zoom-in-95',
            className,
          )}
          {...props}
        >
          {children}
          <BaseTooltip.Arrow className="size-2 rotate-45 bg-foreground" />
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
};
