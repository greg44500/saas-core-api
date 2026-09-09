import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useGetCurrentUserQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: useGetCurrentUserQueryMock,
}));
vi.mock('@/features/auth/components/user-menu', () => ({
  UserMenu: () => <button type="button">Avatar utilisateur</button>,
}));
vi.mock('@/features/auth/components/logout-shortcut', () => ({
  LogoutShortcut: () => <button type="button">Déconnexion</button>,
}));

import {
  WorkspaceUserIdentity,
  getUserDisplayName,
} from '@/features/workspace/components/workspace-user-identity';

describe('WorkspaceUserIdentity', () => {
  it('compose le nom complet avec le plan du workspace', () => {
    useGetCurrentUserQueryMock.mockReturnValue({
      data: {
        firstName: 'Laetitia',
        lastName: 'BALLAT',
        email: 'laetitia@test.com',
      },
    });

    render(<WorkspaceUserIdentity planName="Free" />);

    expect(screen.getByText('Laetitia BALLAT')).toBeInTheDocument();
    expect(screen.getByText('Plan Free')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avatar utilisateur' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Déconnexion' })).toBeInTheDocument();
  });

  it('retombe sur l’email lorsqu’aucun nom n’est disponible', () => {
    expect(getUserDisplayName({ email: 'user@example.com' })).toBe('user@example.com');
  });
});
