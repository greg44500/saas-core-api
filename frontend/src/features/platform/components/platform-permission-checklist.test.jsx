import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlatformPermissionChecklist } from '@/features/platform/components/platform-permission-checklist';

const permissions = [
  {
    key: 'platform:users:read',
    label: 'Consulter les utilisateurs',
    category: 'users',
    categoryLabel: 'Utilisateurs',
    description: 'Consulter les comptes.',
    sensitivity: 'delegable',
    assignable: true,
  },
  {
    key: 'platform:users:close',
    label: 'Fermer un utilisateur',
    category: 'users',
    categoryLabel: 'Utilisateurs',
    description: 'Fermer définitivement un compte.',
    sensitivity: 'reserved',
    assignable: false,
  },
];

describe('PlatformPermissionChecklist', () => {
  afterEach(() => cleanup());

  it('groupe les permissions et bloque les permissions non assignables', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <PlatformPermissionChecklist
        onToggle={onToggle}
        permissions={permissions}
        selectedKeys={['platform:users:read']}
      />,
    );

    const group = screen.getByRole('group', { name: 'Utilisateurs' });
    expect(
      within(group).getByRole('checkbox', { name: 'Consulter les utilisateurs' }),
    ).toBeChecked();
    expect(
      within(group).getByRole('checkbox', { name: 'Fermer un utilisateur' }),
    ).toBeDisabled();
    expect(within(group).getByText(/Réservée · Non assignable/)).toBeInTheDocument();

    await user.click(
      within(group).getByRole('checkbox', { name: 'Consulter les utilisateurs' }),
    );
    expect(onToggle).toHaveBeenCalledWith('platform:users:read');
  });
});
