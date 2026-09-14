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
  useMemo,
} from 'react';

import { Button } from '@/components/ui/button';
import {
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider as ToastPrimitiveProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
  useToastManager,
} from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const DEFAULT_TOAST_DURATION = 5000;
const ToastContext = createContext(null);

const TOAST_VARIANTS = Object.freeze({
  success: {
    icon: CheckCircle2,
    iconClassName: 'text-success',
    priority: 'low',
    tone: 'success',
  },
  destructive: {
    icon: CircleAlert,
    iconClassName: 'text-destructive',
    priority: 'high',
    tone: 'destructive',
  },
  warning: {
    icon: TriangleAlert,
    iconClassName: 'text-warning',
    priority: 'low',
    tone: 'warning',
  },
  info: {
    icon: Info,
    iconClassName: 'text-info',
    priority: 'low',
    tone: 'info',
  },
});

function normalizeToastVariant(variant) {
  if (variant === 'error' || variant === 'destructive') return 'destructive';
  if (variant === 'success' || variant === 'warning' || variant === 'info') return variant;
  return 'info';
}

function ToastItem({ toast }) {
  const variant = TOAST_VARIANTS[toast.type] ?? TOAST_VARIANTS.info;
  const Icon = variant.icon;

  return (
    <ToastRoot
      swipeDirection="right"
      toast={toast}
      tone={variant.tone}
    >
      <ToastContent>
        <Icon
          aria-hidden="true"
          className={cn('mt-0.5 size-5 shrink-0', variant.iconClassName)}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <ToastTitle />
          {toast.description && <ToastDescription />}
        </div>
        <ToastClose
          render={(
            <Button
              aria-label="Fermer la notification"
              className="size-8 shrink-0"
              size="icon"
              type="button"
              variant="ghost"
            />
          )}
        >
          <X aria-hidden="true" />
        </ToastClose>
      </ToastContent>
    </ToastRoot>
  );
}

function ToastAdapter({ children }) {
  const { add, close, toasts } = useToastManager();

  const dismissToast = useCallback((id) => {
    if (id === undefined || id === null) return;
    close(id);
  }, [close]);

  const toast = useCallback(({
    description,
    duration = DEFAULT_TOAST_DURATION,
    title,
    variant = 'info',
  } = {}) => {
    const normalizedVariant = normalizeToastVariant(variant);
    const variantConfig = TOAST_VARIANTS[normalizedVariant];

    return add({
      description,
      priority: variantConfig.priority,
      timeout: duration > 0 ? duration : 0,
      title,
      type: normalizedVariant,
    });
  }, [add]);

  const contextValue = useMemo(
    () => ({ dismissToast, toast }),
    [dismissToast, toast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastPortal>
        <ToastViewport>
          {toasts.map((currentToast) => (
            <ToastItem key={currentToast.id} toast={currentToast} />
          ))}
        </ToastViewport>
      </ToastPortal>
    </ToastContext.Provider>
  );
}

/**
 * Fournit un feedback global pour les résultats d'actions serveur qui modifient
 * durablement l'état de l'application. Les erreurs de validation de champs
 * restent volontairement dans les formulaires afin de conserver leur contexte.
 * Base UI porte désormais la file, les timers et les annonces accessibles.
 */
function ToastProvider({ children }) {
  return (
    <ToastPrimitiveProvider
      limit={Number.MAX_SAFE_INTEGER}
      timeout={DEFAULT_TOAST_DURATION}
    >
      <ToastAdapter>{children}</ToastAdapter>
    </ToastPrimitiveProvider>
  );
}

function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast doit être utilisé dans ToastProvider.');
  }

  return context;
}

export {
  DEFAULT_TOAST_DURATION,
  ToastProvider,
  normalizeToastVariant,
  useToast,
};
