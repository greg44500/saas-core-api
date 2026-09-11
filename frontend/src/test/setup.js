import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * jsdom n'implémente pas ResizeObserver alors que certains primitives Radix
 * l'utilisent pour mesurer leur géométrie. Ce stub reproduit uniquement le
 * contrat navigateur nécessaire aux tests de composants, sans simuler de
 * dimensions arbitraires.
 */
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
});
