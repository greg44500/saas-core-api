import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

function Tooltip({ children, content }) {
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);
  const pointerInteractionRef = useRef(false);

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
      className="relative inline-flex"
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
        className={`absolute bottom-full left-1/2 z-[var(--layer-tooltip)] mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md transition-opacity duration-150 motion-reduce:transition-none ${
          visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        id={tooltipId}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}

export { Tooltip };
