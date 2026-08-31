import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { ThemeProvider } from '@/components/shared/theme-provider';

function renderApp(storageScope = 'test-user') {
  return render(
    <ThemeProvider storageScope={storageScope}>
      <App />
    </ThemeProvider>,
  );
}

describe('App design system foundation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  it('rend les fondations F2 et les variantes principales du bouton', () => {
    renderApp();

    expect(
      screen.getByRole('heading', { name: 'Fondations UI prêtes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Action principale' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Secondaire' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contour' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Destructif' })).toBeInTheDocument();
  });

  it('persiste le thème choisi et le restaure au prochain montage', async () => {
    const user = userEvent.setup();
    const firstRender = renderApp('user-1');

    const themeToggle = screen.getByRole('button', {
      name: 'Activer le thème sombre',
    });

    expect(document.documentElement).not.toHaveClass('dark');

    await user.click(themeToggle);

    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem('saas-core:theme:user-1')).toBe('dark');

    firstRender.unmount();
    document.documentElement.classList.remove('dark');

    renderApp('user-1');

    expect(document.documentElement).toHaveClass('dark');
    expect(
      screen.getByRole('button', { name: 'Activer le thème clair' }),
    ).toBeInTheDocument();
  });

  it('isole la préférence de thème entre deux scopes utilisateur', async () => {
    const user = userEvent.setup();
    const firstRender = renderApp('user-1');

    await user.click(
      screen.getByRole('button', { name: 'Activer le thème sombre' }),
    );

    expect(window.localStorage.getItem('saas-core:theme:user-1')).toBe('dark');

    firstRender.unmount();
    document.documentElement.classList.remove('dark');

    renderApp('user-2');

    expect(document.documentElement).not.toHaveClass('dark');
    expect(window.localStorage.getItem('saas-core:theme:user-2')).toBe('light');
  });
});
