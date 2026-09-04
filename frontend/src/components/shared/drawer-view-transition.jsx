import { useLayoutEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Anime les changements de vue internes d'un drawer sans démonter le drawer
 * lui-même. Cela évite les empilements de panneaux et conserve un contexte
 * visuel stable pendant un drill-down liste → détail → édition.
 */
function DrawerViewTransition({ children, className, viewKey }) {
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    setVisible(false);

    const frameId = window.requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [viewKey]);

  return (
    <div
      className={cn(
        'transform-gpu transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none',
        visible ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export { DrawerViewTransition };
