import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Sheet(props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal(props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }) {
  return (
    <SheetPrimitive.Backdrop
      className={cn(
        'fixed inset-0 z-[var(--layer-drawer)] bg-overlay/50 transition-opacity duration-200 motion-reduce:transition-none',
        'data-ending-style:opacity-0 data-starting-style:opacity-0',
        className,
      )}
      data-slot="sheet-overlay"
      {...props}
    />
  );
}

const SHEET_SIDE_CLASS = Object.freeze({
  top: 'inset-x-0 top-0 border-b data-ending-style:-translate-y-8 data-starting-style:-translate-y-8',
  right: 'inset-y-0 right-0 h-full border-l data-ending-style:translate-x-8 data-starting-style:translate-x-8',
  bottom: 'inset-x-0 bottom-0 border-t data-ending-style:translate-y-8 data-starting-style:translate-y-8',
  left: 'inset-y-0 left-0 h-full border-r data-ending-style:-translate-x-8 data-starting-style:-translate-x-8',
});

function SheetContent({
  children,
  className,
  side = 'right',
  showCloseButton = true,
  ...props
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        className={cn(
          'fixed z-[calc(var(--layer-drawer)+1)] flex flex-col border-border bg-background text-foreground shadow-xl outline-none',
          'transition-[transform,opacity] duration-200 motion-reduce:transition-none',
          'data-ending-style:opacity-0 data-starting-style:opacity-0',
          SHEET_SIDE_CLASS[side],
          className,
        )}
        data-side={side}
        data-slot="sheet-content"
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            render={(
              <Button
                className="absolute right-3 top-3"
                size="icon"
                variant="ghost"
              />
            )}
          >
            <X aria-hidden="true" />
            <span className="sr-only">Fermer</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />;
}

function SheetTitle({ className, ...props }) {
  return (
    <SheetPrimitive.Title
      className={cn('font-semibold text-foreground', className)}
      data-slot="sheet-title"
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }) {
  return (
    <SheetPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
