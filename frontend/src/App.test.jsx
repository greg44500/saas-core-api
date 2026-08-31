import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';

describe('App design system foundation', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove('dark');
  });

  it('rend les fondations F2 et les variantes principales du bouton', () => {
    render(<App />);

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

  it('bascule entre les thèmes clair et sombre sans persistance client', async () => {
    const user = userEvent.setup();

    render(<App />);

    const themeToggle = screen.getByRole('button', {
      name: 'Activer le thème sombre',
    });

    expect(document.documentElement).not.toHaveClass('dark');

    await user.click(themeToggle);

    expect(document.documentElement).toHaveClass('dark');
    expect(
      screen.getByRole('button', { name: 'Activer le thème clair' }),
    ).toBeInTheDocument();
  });
});
