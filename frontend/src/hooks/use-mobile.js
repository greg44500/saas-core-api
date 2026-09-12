import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Aligne le comportement responsive des composants shadcn sur le breakpoint
 * `md` de Tailwind sans dupliquer cette détection dans chaque layout.
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => (
    typeof window === 'undefined' ? false : window.innerWidth < MOBILE_BREAKPOINT
  ));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia?.(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const updateViewport = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    mediaQuery?.addEventListener?.('change', updateViewport);
    updateViewport();

    return () => mediaQuery?.removeEventListener?.('change', updateViewport);
  }, []);

  return isMobile;
}

export { MOBILE_BREAKPOINT, useIsMobile };
