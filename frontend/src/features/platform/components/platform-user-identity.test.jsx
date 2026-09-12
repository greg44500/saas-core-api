import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useGetCurrentPlatformContextQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: useGetCurrentPlatformContextQueryMock,
}));

vi.mock('@/features/auth/components/authenticated-user-identity', () => ({
  AuthenticatedUserIdentity: ({ actions, secondaryText }) => (
    <div data-testid="authenticated-user-identity">
      <span>{secondaryText}</span>
      {actions}
    </div>
  ),
}));

import {
  PlatformUserIdentity,
  getPlatformIdentitySecondaryText,
} from '@/features/platform/components/platform-user-identity';

describe('PlatformUserIdentity', () => {
  it('affiche le rôle Platform réel comme qualité', () => {
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        isFounder: false,
        role: { name: 'Administrateur Platform' },
      },
    });

    render(<PlatformUserIdentity />);

    expect(screen.getByTestId('authenticated-user-identity'))
      .toHaveTextContent('Administrateur Platform');
  });

  it('transmet les actions propres à la topbar Platform', () => {
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        isFounder: true,
        role: { name: 'Super administrateur' },
      },
    });

    render(
      <PlatformUserIdentity
        actions={<button type="button">Préférences d’affichage</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Préférences d’affichage' }))
      .toBeInTheDocument();
  });

  it('distingue le fondateur sans perdre le rôle assigné', () => {
    expect(getPlatformIdentitySecondaryText({
      isFounder: true,
      role: { name: 'Super administrateur' },
    })).toBe('Fondateur · Super administrateur');
  });
});
