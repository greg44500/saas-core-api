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
          <BaseTooltip.Arrow
            className={cn(
              'absolute size-2 rotate-45 bg-foreground',
              'data-[side=top]:-bottom-1 data-[side=top]:left-1/2! data-[side=top]:-translate-x-1/2',
              'data-[side=bottom]:-top-1 data-[side=bottom]:left-1/2! data-[side=bottom]:-translate-x-1/2',
              'data-[side=left]:-right-1 data-[side=left]:top-1/2! data-[side=left]:-translate-y-1/2',
              'data-[side=right]:-left-1 data-[side=right]:top-1/2! data-[side=right]:-translate-y-1/2',
            )}
          />
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
