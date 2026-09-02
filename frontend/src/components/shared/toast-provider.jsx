import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DEFAULT_TOAST_DURATION = 5000;
const ToastContext = createContext(null);

const TOAST_VARIANTS = Object.freeze({
  success: {
    icon: CheckCircle2,
    containerClassName: 'border-success/40 bg-card',
    iconClassName: 'text-success',
  },
  error: {
    icon: CircleAlert,
    containerClassName: 'border-destructive/40 bg-card',
    iconClassName: 'text-destructive',
  },
  warning: {
    icon: TriangleAlert,
    containerClassName: 'border-warning/40 bg-card',
    iconClassName: 'text-warning',
  },
  info: {
    icon: Info,
    containerClassName: 'border-info/40 bg-card',
    iconClassName: 'text-info',
  },
});

function ToastItem({ toast, onDismiss }) {
  const variant = TOAST_VARIANTS[toast.variant] ?? TOAST_VARIANTS.info;
  const Icon = variant.icon;
  const isError = toast.variant === 'error';

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg',
        variant.containerClassName,
      )}
      role={isError ? 'alert' : 'status'}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-5 shrink-0', variant.iconClassName)}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-card-foreground">{toast.title}</p>
        {toast.description && (
          <p className="text-sm text-muted-foreground">{toast.description}</p>
        )}
      </div>
      <Button
        aria-label="Fermer la notification"
        className="size-8 shrink-0"
        onClick={() => onDismiss(toast.id)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * Fournit un feedback global pour les résultats d'actions serveur qui modifient
 * durablement l'état de l'application. Les erreurs de validation de champs
 * restent volontairement dans les formulaires afin de conserver leur contexte.
 */
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextIdRef = useRef(1);
  const timeoutIdsRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timeoutId = timeoutIdsRef.current.get(id);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
    }

    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  }, []);

  const toast = useCallback(
    ({
      description,
      duration = DEFAULT_TOAST_DURATION,
      title,
      variant = 'info',
    }) => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;

      setToasts((currentToasts) => [
        ...currentToasts,
        { id, title, description, variant },
      ]);

      if (duration > 0) {
        const timeoutId = window.setTimeout(() => {
          timeoutIdsRef.current.delete(id);
          setToasts((currentToasts) =>
            currentToasts.filter((currentToast) => currentToast.id !== id),
          );
        }, duration);

        timeoutIdsRef.current.set(id, timeoutId);
      }

      return id;
    },
    [],
  );

  useEffect(
    () => () => {
      timeoutIdsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutIdsRef.current.clear();
    },
    [],
  );

  const contextValue = useMemo(
    () => ({ dismissToast, toast }),
    [dismissToast, toast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      >
        {toasts.map((currentToast) => (
          <ToastItem
            key={currentToast.id}
            onDismiss={dismissToast}
            toast={currentToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast doit être utilisé dans ToastProvider.');
  }

  return context;
}

export { DEFAULT_TOAST_DURATION, ToastProvider, useToast };
