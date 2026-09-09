import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container) {
  if (!container) return [];

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('hidden')
      && element.getAttribute('aria-hidden') !== 'true',
  );
}

/**
 * Centralise le comportement structurel des vraies modales du Core : focus
 * initial, boucle Tab, Escape, verrouillage du scroll et restauration du focus.
 * Les popovers non modaux ne doivent pas utiliser ce hook par défaut.
 */
function useDialogFocus({
  open,
  containerRef,
  initialFocusRef,
  onClose,
  lockScroll = true,
}) {
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    }

    const initialElement = initialFocusRef?.current
      ?? getFocusableElements(containerRef.current)[0]
      ?? containerRef.current;
    initialElement?.focus?.();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const container = containerRef.current;
      const focusableElements = getFocusableElements(container);

      if (focusableElements.length === 0) {
        event.preventDefault();
        container?.focus?.();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!container?.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (lockScroll) {
        document.body.style.overflow = previousOverflow;
      }
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [containerRef, initialFocusRef, lockScroll, open]);
}

export { FOCUSABLE_SELECTOR, getFocusableElements, useDialogFocus };
