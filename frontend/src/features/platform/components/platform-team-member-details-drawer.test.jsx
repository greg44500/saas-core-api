import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PlatformTeamMemberDetailsDrawer } from '@/features/platform/components/platform-team-member-details-drawer';

const member = {
  id: '507f1f77bcf86cd799439012',
  isFounder: false,
  status: 'suspended',
  joinedAt: '2026-08-20T10:00:00.000Z',
  suspendedAt: '2026-09-01T08:30:00.000Z',
  revokedAt: null,
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-09-01T08:30:00.000Z',
  user: {
    id: 'support-user-id',
    firstName: 'Marie',
    lastName: 'Martin',
    email: 'marie@example.com',
    status: 'active',
  },
  role: {
    id: '507f191e810c19729de860eb',
    key: 'technical_support',
    name: 'Support technique',
    description: 'Diagnostic technique et assistance.',
    isSystem: true,
  },
};

afterEach(() => cleanup());

describe('PlatformTeamMemberDetailsDrawer', () => {
  it('affiche l’identité, l’accès Platform et le cycle de vie utile du membre', () => {
    render(
      <PlatformTeamMemberDetailsDrawer
        currentUserId="founder-user-id"
        member={member}
        onClose={() => {}}
        open
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Marie Martin' });

    expect(within(drawer).getByText('Identité')).toBeInTheDocument();
    expect(within(drawer).getByText('marie@example.com')).toBeInTheDocument();
    expect(within(drawer).getByText('Statut du compte')).toBeInTheDocument();
    expect(within(drawer).getByText('Actif')).toBeInTheDocument();

    expect(within(drawer).getByText('Accès à la Plateforme')).toBeInTheDocument();
    expect(within(drawer).getByText('Membre plateforme')).toBeInTheDocument();
    expect(within(drawer).getByText('Support technique')).toBeInTheDocument();
    expect(
      within(drawer).getByText('Diagnostic technique et assistance.'),
    ).toBeInTheDocument();
    expect(within(drawer).getByText('Suspendu')).toBeInTheDocument();

    expect(within(drawer).getByText('Cycle de vie')).toBeInTheDocument();
    expect(within(drawer).getByText('Membre depuis')).toBeInTheDocument();
    expect(within(drawer).getByText('Suspendu le')).toBeInTheDocument();
    expect(within(drawer).queryByText('Révoqué le')).not.toBeInTheDocument();
    expect(within(drawer).getByText('Créé le')).toBeInTheDocument();
    expect(within(drawer).getByText('Mis à jour le')).toBeInTheDocument();
  });

  it('identifie explicitement le Fondateur et le membre courant', () => {
    const founder = {
      ...member,
      isFounder: true,
      status: 'active',
      suspendedAt: null,
      user: {
        ...member.user,
        id: 'founder-user-id',
        firstName: 'Gregory',
        lastName: 'BALLAT',
      },
      role: {
        ...member.role,
        key: 'super_admin',
        name: 'Super administrateur',
      },
    };

    render(
      <PlatformTeamMemberDetailsDrawer
        currentUserId="founder-user-id"
        member={founder}
        onClose={() => {}}
        open
      />,
    );

    const drawer = screen.getByRole('dialog', {
      name: 'Gregory BALLAT (vous)',
    });

    expect(within(drawer).getByText('Fondateur')).toBeInTheDocument();
    expect(within(drawer).getByText('Super administrateur')).toBeInTheDocument();
    expect(within(drawer).queryByText('Suspendu le')).not.toBeInTheDocument();
  });
});
