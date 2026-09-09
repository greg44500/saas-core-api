import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlatformUserDetailsDrawer } from '@/features/platform/components/platform-user-details-drawer';

const user = {
  id: 'user-1',
  firstName: 'Marie',
  lastName: 'Martin',
  email: 'marie@example.com',
  status: 'active',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
};

function renderUserDrawer({ isLoading, drawerUser }) {
  return render(
    <PlatformUserDetailsDrawer
      currentUserId="another-user"
      error={undefined}
      isLoading={isLoading}
      onClose={vi.fn()}
      onRequestAction={vi.fn()}
      onRetry={vi.fn()}
      open
      user={drawerUser}
    />,
  );
}

describe('Platform details loading contract', () => {
  afterEach(() => cleanup());

  it('utilise le skeleton partagé lorsqu’aucun détail utilisateur n’est encore disponible', () => {
    renderUserDrawer({ isLoading: true, drawerUser: undefined });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement des détails de l’utilisateur…',
    );
    expect(screen.queryByText('Chargement des détails…')).not.toBeInTheDocument();
  });

  it('conserve une donnée déjà disponible pendant un refetch', () => {
    renderUserDrawer({ isLoading: true, drawerUser: user });

    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
    expect(
      screen.queryByText('Chargement des détails de l’utilisateur…'),
    ).not.toBeInTheDocument();
  });
});
