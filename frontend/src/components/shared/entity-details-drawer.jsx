import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';

const DRAWER_TRANSITION_MS = 300;

/**
 * Panneau de détails latéral partagé pour les entités du Core.
 *
 * Le contenu reste monté pendant la fermeture afin de préserver l'animation de
 * sortie et le focus est rendu à l'élément qui avait ouvert le panneau. Les
 * features fournissent uniquement leur contenu métier et ne réimplémentent pas
 * la mécanique de dialog, de focus ou de transition.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.description]
 * @param {() => void} props.onClose
 * @param {boolean} props.open
 * @param {string} props.title
 */
function EntityDetailsDrawer({ children, description, onClose, open, title }) {
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      return undefined;
    }

    setIsVisible(false);

    if (!isMounted) return undefined;

    const timeoutId = window.setTimeout(() => {
      setIsMounted(false);
    }, DRAWER_TRANSITION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isMounted, open]);

  useEffect(() => {
    if (!isMounted || !open) return undefined;

    const animationFrameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isMounted, open]);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!isMounted) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 top-16 z-[90] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <button
        aria-label="Fermer le panneau de détails"
        className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ease-in-out will-change-opacity motion-reduce:transition-none ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        title="Fermer le panneau"
        type="button"
      />

      <aside
        aria-describedby={description ? descriptionId : undefined}
        aria-hidden={!open}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`absolute inset-y-0 right-0 flex w-full max-w-xl min-w-0 transform-gpu flex-col overflow-hidden border-l border-border bg-background text-foreground shadow-lg transition-transform duration-300 ease-in-out will-change-transform motion-reduce:transition-none ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
      >
        <header className="flex min-w-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold" id={titleId}>
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground" id={descriptionId}>
                {description}
              </p>
            )}
          </div>
          <Button
            aria-label="Fermer"
            className="shrink-0"
            onClick={onClose}
            ref={closeButtonRef}
            size="icon"
            title="Fermer"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-5 [scrollbar-gutter:stable]">
          <div className="min-w-0 max-w-full">{children}</div>
        </div>
      </aside>
    </div>
  );
}

export { EntityDetailsDrawer };
