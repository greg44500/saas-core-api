import { Info } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const TOOLTIP_GAP = 8;
const VIEWPORT_PADDING = 12;
const TOOLTIP_MAX_WIDTH = 256;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Affiche une explication courte au survol ou au focus clavier sans occuper
 * l'espace permanent de la carte.
 *
 * La bulle est rendue dans `document.body` afin de ne jamais être tronquée par
 * un Drawer, un tableau ou tout autre conteneur scrollable avec `overflow`.
 * Son positionnement reste recalculé au scroll et au redimensionnement.
 */
function InfoTooltip({ content, label = 'Plus d’informations', className }) {
  const tooltipId = useId();
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);

  function updatePosition() {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;

    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const maxLeft = Math.max(
      VIEWPORT_PADDING,
      window.innerWidth - tooltipRect.width - VIEWPORT_PADDING,
    );
    const left = clamp(
      triggerRect.right - tooltipRect.width,
      VIEWPORT_PADDING,
      maxLeft,
    );

    const spaceBelow = window.innerHeight - triggerRect.bottom - TOOLTIP_GAP;
    const shouldOpenAbove = (
      spaceBelow < tooltipRect.height
      && triggerRect.top > spaceBelow
    );
    const rawTop = shouldOpenAbove
      ? triggerRect.top - TOOLTIP_GAP - tooltipRect.height
      : triggerRect.bottom + TOOLTIP_GAP;
    const maxTop = Math.max(
      VIEWPORT_PADDING,
      window.innerHeight - tooltipRect.height - VIEWPORT_PADDING,
    );

    setPosition({
      left,
      top: clamp(rawTop, VIEWPORT_PADDING, maxTop),
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();
  }, [open, content]);

  useEffect(() => {
    if (!open) return undefined;

    const handleViewportChange = () => updatePosition();

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  if (!content) return null;

  const tooltip = open
    ? createPortal(
      <span
        className="pointer-events-none fixed z-[110] rounded-lg border border-border bg-popover px-3 py-2 text-left text-xs font-normal leading-relaxed text-popover-foreground shadow-lg"
        id={tooltipId}
        ref={tooltipRef}
        role="tooltip"
        style={{
          left: position?.left ?? VIEWPORT_PADDING,
          maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
          opacity: position ? 1 : 0,
          top: position?.top ?? VIEWPORT_PADDING,
          width: Math.min(
            TOOLTIP_MAX_WIDTH,
            Math.max(0, window.innerWidth - VIEWPORT_PADDING * 2),
          ),
        }}
      >
        {content}
      </span>,
      document.body,
    )
    : null;

  return (
    <>
      <span className={cn('inline-flex shrink-0', className)}>
        <button
          aria-describedby={open ? tooltipId : undefined}
          aria-label={label}
          className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onBlur={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          ref={triggerRef}
          type="button"
        >
          <Info aria-hidden="true" className="size-4" />
        </button>
      </span>
      {tooltip}
    </>
  );
}

export { InfoTooltip };
