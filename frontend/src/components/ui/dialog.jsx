import { Dialog } from '@base-ui/react/dialog';

import { cn } from '@/lib/utils';

function DialogRoot(props) {
  return <Dialog.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props) {
  return <Dialog.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props) {
  return <Dialog.Close data-slot="dialog-close" {...props} />;
}

function DialogPortal(props) {
  return <Dialog.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({ className, ...props }) {
  return (
    <Dialog.Backdrop
      className={cn(
        'fixed inset-0 z-[var(--layer-modal)] bg-overlay/50 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0',
        className,
      )}
      data-slot="dialog-overlay"
      {...props}
    />
  );
}

function DialogContent({ className, ...props }) {
  return (
    <Dialog.Popup
      className={cn(
        'fixed left-1/2 top-1/2 z-[var(--layer-modal)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl outline-none transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
        className,
      )}
      data-slot="dialog-content"
      {...props}
    />
  );
}

function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn('space-y-2', className)}
      data-slot="dialog-header"
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        'mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      data-slot="dialog-footer"
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }) {
  return (
    <Dialog.Title
      className={cn('text-lg font-semibold', className)}
      data-slot="dialog-title"
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <Dialog.Description
      className={cn('text-sm text-muted-foreground', className)}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
};
