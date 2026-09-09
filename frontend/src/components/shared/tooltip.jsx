import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';

const TOOLTIP_SIDE_CLASS = Object.freeze({
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  right: 'left-full top-1/2 ml-3 -translate-y-1/2',
  'bottom-end': 'right-0 top-full mt-2',
});

function Tooltip({
  children,
  content,
  side = 'top',
  wrapperClassName,
}) {
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);
  const pointerInteractionRef = useRef(false);
  const sideClassName = TOOLTIP_SIDE_CLASS[side] ?? TOOLTIP_SIDE_CLASS.top;

  useEffect(() => {
    if (!visible) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setVisible(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  if (!content) return children;

  const describedChild = isValidElement(children)
    ? cloneElement(children, {
      'aria-describedby': visible
        ? [children.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')
        : children.props['aria-describedby'],
    })
    : children;

  return (
    <span
      className={cn('relative inline-flex', wrapperClassName)}
      onBlurCapture={() => setVisible(false)}
      onClickCapture={() => setVisible(false)}
      onFocusCapture={() => {
        if (!pointerInteractionRef.current) setVisible(true);
      }}
      onPointerDownCapture={() => {
        pointerInteractionRef.current = true;
        setVisible(false);
      }}
      onPointerEnter={() => setVisible(true)}
      onPointerLeave={() => setVisible(false)}
      onPointerUpCapture={() => {
        pointerInteractionRef.current = false;
      }}
    >
      {describedChild}
      <span
        aria-hidden={!visible}
        className={cn(
          'absolute z-[var(--layer-tooltip)] whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md transition-opacity duration-150 motion-reduce:transition-none',
          sideClassName,
          visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        id={tooltipId}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}

export { TOOLTIP_SIDE_CLASS, Tooltip };
