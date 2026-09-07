import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DataTable } from '@/components/data-display/data-table';
import {
  createPlatformTeamMemberReadColumns,
} from '@/features/platform/components/platform-team-member-read-columns';

const members = [
  {
    id: 'founder-member-id',
    isFounder: true,
    status: 'active',
    user: {
      id: 'founder-user-id',
      firstName: 'Gregory',
      lastName: 'BALLAT',
    },
    role: {
      id: 'founder-role-id',
      name: 'Super administrateur',
    },
  },
  {
    id: 'member-id',
    isFounder: false,
    status: 'active',
    user: {
      id: 'member-user-id',
      firstName: 'Test',
      lastName: 'Admin',
    },
    role: {
      id: 'member-role-id',
      name: 'Administrateur de la Plateforme',
    },
  },
];

describe('createPlatformTeamMemberReadColumns', () => {
  afterEach(() => cleanup());

  it('dérive la qualité depuis isFounder sans référentiel statique', () => {
    render(
      <DataTable
        columns={createPlatformTeamMemberReadColumns()}
        data={members}
        getRowKey={(member) => member.id}
      />,
    );

    const rows = screen.getAllByRole('row');

    expect(within(rows[1]).getByText('Fondateur')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Membre plateforme')).toBeInTheDocument();
  });
});
