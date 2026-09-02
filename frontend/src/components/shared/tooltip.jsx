import { useRef, useState } from 'react';

function Tooltip({ children, content }) {
  const [visible, setVisible] = useState(false);
  const pointerInteractionRef = useRef(false);

  if (!content) return children;

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
      {children}
      <span
        aria-hidden={!visible}
        className={`pointer-events-none absolute bottom-full left-1/2 z-[120] mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md transition-opacity duration-150 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}

export { Tooltip };
