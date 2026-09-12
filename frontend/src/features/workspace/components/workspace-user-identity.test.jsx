import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/components/authenticated-user-identity', () => ({
  AuthenticatedUserIdentity: ({ actions, secondaryText }) => (
    <div>
      <span>Identité utilisateur</span>
      <span>{secondaryText}</span>
      {actions}
    </div>
  ),
  getUserDisplayName: (user) => user?.email ?? 'Compte utilisateur',
}));

import {
  WorkspaceUserIdentity,
  getUserDisplayName,
} from '@/features/workspace/components/workspace-user-identity';

describe('WorkspaceUserIdentity', () => {
  it('transmet le plan du workspace au bloc d’identité partagé', () => {
    render(<WorkspaceUserIdentity planName="Free" />);

    expect(screen.getByText('Identité utilisateur')).toBeInTheDocument();
    expect(screen.getByText('Plan Free')).toBeInTheDocument();
  });

  it('transmet les actions contextuelles avant la déconnexion partagée', () => {
    render(
      <WorkspaceUserIdentity
        actions={<button type="button">Préférences d’affichage</button>}
        planName="Premium"
      />,
    );

    expect(screen.getByRole('button', { name: 'Préférences d’affichage' }))
      .toBeInTheDocument();
  });

  it('réexporte le fallback de nom partagé', () => {
    expect(getUserDisplayName({ email: 'user@example.com' }))
      .toBe('user@example.com');
  });
});
