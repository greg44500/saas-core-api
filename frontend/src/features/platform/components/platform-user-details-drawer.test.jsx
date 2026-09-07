import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlatformUserDetailsDrawer } from '@/features/platform/components/platform-user-details-drawer';

const user = {
  id: '507f1f77bcf86cd799439010',
  firstName: 'Test',
  lastName: 'Admin',
  email: 'test.admin@example.com',
  status: 'active',
  emailVerifiedAt: '2026-09-01T10:00:00.000Z',
  lastLoginAt: '2026-09-07T10:00:00.000Z',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-07T10:00:00.000Z',
  passwordChangedAt: null,
  disabledAt: null,
  disabledReason: null,
  deletionRequestedAt: null,
  closedAt: null,
  closureReason: null,
};

function renderDrawer({ currentUserId = user.id } = {}) {
  return render(
    <PlatformUserDetailsDrawer
      currentUserId={currentUserId}
      error={undefined}
      isLoading={false}
      onClose={vi.fn()}
      onRequestAction={vi.fn()}
      onRetry={vi.fn()}
      open
      user={user}
    />,
  );
}

describe('PlatformUserDetailsDrawer', () => {
  afterEach(() => cleanup());

  it('ne rend aucune section d’administration pour son propre compte', () => {
    renderDrawer();

    expect(
      screen.queryByText('Actions d’administration'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/actions sensibles sur votre propre compte/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Désactiver' }),
    ).not.toBeInTheDocument();
  });

  it('conserve les actions d’administration pour un autre utilisateur', () => {
    renderDrawer({ currentUserId: 'another-user-id' });

    expect(screen.getByText('Actions d’administration')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Désactiver' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Révoquer les sessions' }),
    ).toBeInTheDocument();
  });
});
