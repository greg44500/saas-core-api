import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const mocks = vi.hoisted(() => ({
  reactivateMember: vi.fn(),
  reactivateUnwrap: vi.fn(),
  revokeMember: vi.fn(),
  revokeUnwrap: vi.fn(),
  suspendMember: vi.fn(),
  suspendUnwrap: vi.fn(),
  toast: vi.fn(),
  updateMemberRole: vi.fn(),
  updateRoleUnwrap: vi.fn(),
  useGetCurrentPlatformContextQuery: vi.fn(),
  useGetCurrentUserQuery: vi.fn(),
  useListPlatformRolesQuery: vi.fn(),
  useListPlatformTeamMembersQuery: vi.fn(),
}));

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: mocks.useGetCurrentUserQuery,
}));
vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: mocks.useGetCurrentPlatformContextQuery,
}));
vi.mock('@/features/platform/api/platform-roles-api', () => ({
  useListPlatformRolesQuery: mocks.useListPlatformRolesQuery,
}));
vi.mock('@/features/platform/api/platform-team-api', () => ({
  useListPlatformTeamMembersQuery: mocks.useListPlatformTeamMembersQuery,
  useReactivatePlatformTeamMemberMutation: () => [
    mocks.reactivateMember,
    { isLoading: false },
  ],
  useRevokePlatformTeamMemberMutation: () => [
    mocks.revokeMember,
    { isLoading: false },
  ],
  useSuspendPlatformTeamMemberMutation: () => [
    mocks.suspendMember,
    { isLoading: false },
  ],
  useUpdatePlatformTeamMemberRoleMutation: () => [
    mocks.updateMemberRole,
    { isLoading: false },
  ],
}));
vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

import { PlatformTeamMembersSection } from '@/features/platform/components/platform-team-members-section';

const ROLE_IDS = {
  superAdmin: '507f191e810c19729de860ea',
  technicalSupport: '507f191e810c19729de860eb',
  customerSupport: '507f191e810c19729de860ec',
};

const MEMBER_IDS = {
  founder: '507f1f77bcf86cd799439011',
  support: '507f1f77bcf86cd799439012',
};

const members = [
  {
    id: MEMBER_IDS.founder,
    isFounder: true,
    status: 'active',
    user: {
      id: 'founder-user-id',
      firstName: 'Gregory',
      lastName: 'BALLAT',
      email: 'gregory@example.com',
    },
    role: {
      id: ROLE_IDS.superAdmin,
      key: 'super_admin',
      name: 'Super administrateur',
      isSystem: true,
    },
  },
  {
    id: MEMBER_IDS.support,
    isFounder: false,
    status: 'suspended',
    user: {
      id: 'support-user-id',
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie@example.com',
    },
    role: {
      id: ROLE_IDS.technicalSupport,
      key: 'technical_support',
      name: 'Support technique',
      isSystem: true,
    },
  },
];

const roles = [
  {
    id: ROLE_IDS.superAdmin,
    key: 'super_admin',
    name: 'Super administrateur',
    permissions: Object.values(PLATFORM_PERMISSION),
    status: 'active',
    isSystem: true,
  },
  {
    id: ROLE_IDS.technicalSupport,
    key: 'technical_support',
    name: 'Support technique',
    permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
    status: 'active',
    isSystem: true,
  },
  {
    id: ROLE_IDS.customerSupport,
    key: 'customer_support',
    name: 'Support client',
    permissions: [PLATFORM_PERMISSION.USERS_READ],
    status: 'active',
    isSystem: true,
  },
];

const platformAccess = {
  isFounder: true,
  status: 'active',
  role: {
    id: ROLE_IDS.superAdmin,
    key: 'super_admin',
    name: 'Super administrateur',
  },
  permissions: Object.values(PLATFORM_PERMISSION),
};

function listMembersResult(nextMembers = members) {
  return {
    data: {
      members: nextMembers,
      pagination: {
        page: 1,
        limit: 20,
        total: nextMembers.length,
        totalPages: nextMembers.length > 0 ? 1 : 0,
      },
    },
    error: undefined,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

describe('PlatformTeamMembersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useGetCurrentUserQuery.mockReturnValue({
      data: { id: 'founder-user-id' },
    });
    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: platformAccess,
    });
    mocks.useListPlatformRolesQuery.mockReturnValue({
      data: { roles },
      error: undefined,
      isLoading: false,
    });
    mocks.useListPlatformTeamMembersQuery.mockReturnValue(
      listMembersResult(),
    );

    mocks.updateRoleUnwrap.mockResolvedValue({});
    mocks.reactivateUnwrap.mockResolvedValue({});
    mocks.suspendUnwrap.mockResolvedValue({});
    mocks.revokeUnwrap.mockResolvedValue({});

    mocks.updateMemberRole.mockImplementation(() => ({
      unwrap: mocks.updateRoleUnwrap,
    }));
    mocks.reactivateMember.mockImplementation(() => ({
      unwrap: mocks.reactivateUnwrap,
    }));
    mocks.suspendMember.mockImplementation(() => ({
      unwrap: mocks.suspendUnwrap,
    }));
    mocks.revokeMember.mockImplementation(() => ({
      unwrap: mocks.revokeUnwrap,
    }));
  });

  afterEach(() => cleanup());

  it('utilise la DataTable partagée pour afficher identité, qualité, rôle et statut', () => {
    render(<PlatformTeamMembersSection />);

    expect(mocks.useListPlatformTeamMembersQuery).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });

    expect(screen.getByRole('columnheader', { name: 'Membre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Qualité' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Rôle' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Statut' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();

    expect(screen.getByText('Gregory BALLAT (vous)')).toBeInTheDocument();
    expect(screen.getByText('Fondateur')).toBeInTheDocument();
    expect(screen.getByText('Super administrateur')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();

    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
    expect(screen.getByText('Support technique')).toBeInTheDocument();
    expect(screen.getByText('Suspendu')).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /retirer Gregory BALLAT/i }),
    ).not.toBeInTheDocument();
  });

  it('modifie le rôle d’un membre via la confirmation partagée', async () => {
    const user = userEvent.setup();
    render(<PlatformTeamMembersSection />);

    await user.click(
      screen.getByRole('button', { name: 'Modifier le rôle de Marie Martin' }),
    );

    expect(
      screen.getByRole('dialog', { name: 'Modifier le rôle' }),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Nouveau rôle' }),
      ROLE_IDS.customerSupport,
    );
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(mocks.updateMemberRole).toHaveBeenCalledWith({
      memberId: MEMBER_IDS.support,
      roleId: ROLE_IDS.customerSupport,
    });
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Rôle mis à jour' }),
    );
  });

  it('réactive un membre suspendu après confirmation', async () => {
    const user = userEvent.setup();
    render(<PlatformTeamMembersSection />);

    await user.click(
      screen.getByRole('button', { name: 'Réactiver Marie Martin' }),
    );
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(mocks.reactivateMember).toHaveBeenCalledWith(
      MEMBER_IDS.support,
    );
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Membre réactivé' }),
    );
  });

  it('affiche un état vide explicite sans fabriquer de lignes', () => {
    mocks.useListPlatformTeamMembersQuery.mockReturnValue(
      listMembersResult([]),
    );

    render(<PlatformTeamMembersSection />);

    expect(
      screen.getByText('Aucun membre actif ou suspendu dans l’équipe de la Plateforme.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
