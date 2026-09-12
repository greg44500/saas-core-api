import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { TooltipProvider } from '@/components/ui/tooltip';

const useLogoutMutationMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useLogoutMutation: useLogoutMutationMock,
}));

import { LogoutShortcut } from '@/features/auth/components/logout-shortcut';

describe('LogoutShortcut', () => {
  it('expose le raccourci avec le tooltip shadcn puis déconnecte et redirige', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockResolvedValue(undefined);
    const logout = vi.fn(() => ({ unwrap }));
    useLogoutMutationMock.mockReturnValue([logout, { isLoading: false }]);

    const router = createMemoryRouter(
      [
        { path: '/workspace', Component: LogoutShortcut },
        { path: '/login', Component: () => <h1>Connexion</h1> },
      ],
      { initialEntries: ['/workspace'] },
    );

    render(
      <TooltipProvider delay={0}>
        <RouterProvider router={router} />
      </TooltipProvider>,
    );

    const button = screen.getByRole('button', { name: 'Déconnexion' });

    expect(button).toBeInTheDocument();
    expect(screen.queryByText('Déconnexion')).not.toBeInTheDocument();

    await user.hover(button);

    expect(
      await screen.findByText('Déconnexion'),
    ).toBeInTheDocument();

    await user.click(button);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(unwrap).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe('/login');
  });
});
