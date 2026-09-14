import { Toast } from '@base-ui/react/toast';

import { cn } from '@/lib/utils';

const toastToneClasses = Object.freeze({
  success: 'border-success/40 bg-card',
  destructive: 'border-destructive/40 bg-card',
  info: 'border-info/40 bg-card',
  warning: 'border-warning/40 bg-card',
});

function ToastProvider(props) {
  return <Toast.Provider {...props} />;
}

function ToastPortal(props) {
  return <Toast.Portal {...props} />;
}

function ToastViewport({ className, ...props }) {
  return (
    <Toast.Viewport
      aria-label="Notifications"
      className={cn(
        'pointer-events-none fixed right-4 top-4 z-[var(--layer-toast)] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 outline-none',
        className,
      )}
      data-slot="toast-viewport"
      {...props}
    />
  );
}

function ToastRoot({ className, tone = 'info', ...props }) {
  return (
    <Toast.Root
      className={cn(
        'pointer-events-auto w-full rounded-lg border p-4 text-card-foreground shadow-lg outline-none transition duration-200 motion-reduce:transition-none data-ending-style:translate-x-2 data-ending-style:opacity-0 data-starting-style:translate-x-2 data-starting-style:opacity-0',
        toastToneClasses[tone] ?? toastToneClasses.info,
        className,
      )}
      data-slot="toast"
      {...props}
    />
  );
}

function ToastContent({ className, ...props }) {
  return (
    <Toast.Content
      className={cn('flex items-start gap-3', className)}
      data-slot="toast-content"
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }) {
  return (
    <Toast.Title
      className={cn('text-sm font-semibold text-card-foreground', className)}
      data-slot="toast-title"
      {...props}
    />
  );
}

function ToastDescription({ className, ...props }) {
  return (
    <Toast.Description
      className={cn('text-sm text-muted-foreground', className)}
      data-slot="toast-description"
      {...props}
    />
  );
}

function ToastClose(props) {
  return <Toast.Close data-slot="toast-close" {...props} />;
}

function useToastManager() {
  return Toast.useToastManager();
}

export {
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
  useToastManager,
};
