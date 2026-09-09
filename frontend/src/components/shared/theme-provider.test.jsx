import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider, useTheme } from '@/components/shared/theme-provider';

function ThemeProbe() {
  const {
    applyComfortPreferences,
    resolvedTheme,
    theme,
  } = useTheme();

  return (
    <div>
      <span data-testid="theme-preference">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button
        onClick={() => applyComfortPreferences({
          theme: 'light',
          fontFamily: 'geist',
          paletteId: 'core',
          accessibilityMode: 'enhanced',
        })}
        type="button"
      >
        Appliquer
      </button>
    </div>
  );
}

describe('ThemeProvider comfort preferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'a11y-enhanced');
    delete root.dataset.fontFamily;
    delete root.dataset.palette;
    root.style.colorScheme = '';
  });

  it('conserve system comme préférence tout en résolvant le thème système', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-preference')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('applique police, palette et profil renforcé via des identifiants contrôlés', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Appliquer' }).click();
    });

    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement).toHaveClass('a11y-enhanced');
    expect(document.documentElement.dataset.fontFamily).toBe('geist');
    expect(document.documentElement.dataset.palette).toBe('core');
  });
});
