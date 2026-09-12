import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useWorkspaceContextMock = vi.hoisted(() => vi.fn());
const useGetWorkspaceOwnershipTransferAuthorizationQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: useWorkspaceContextMock,
}));

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useGetWorkspaceOwnershipTransferAuthorizationQuery:
    useGetWorkspaceOwnershipTransferAuthorizationQueryMock,
}));

vi.mock('@/features/workspace/components/workspace-general-settings-form', () => ({
  WorkspaceGeneralSettingsForm: () => <div>Paramètres généraux</div>,
}));

vi.mock('@/features/workspace/components/workspace-ownership-section', () => ({
  WorkspaceOwnershipSection: () => <div>Transfert ownership</div>,
}));

vi.mock('@/features/workspace/components/workspace-archive-section', () => ({
  WorkspaceArchiveSection: () => <div>Archivage workspace</div>,
}));

import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { WorkspaceSettingsPage } from '@/features/workspace/pages/workspace-settings-page';

const workspace = {
  id: '507f1f77bcf86cd799439011',
  name: 'Workspace Démo',
};

function mockContext({ permissions = [], roleKey = 'user' } = {}) {
  const permissionSet = new Set(permissions);

  useWorkspaceContextMock.mockReturnValue({
    workspace,
    membership: {
      role: {
        key: roleKey,
        name: roleKey,
      },
    },
    can: (permission) => permissionSet.has(permission),
  });
}

describe('WorkspaceSettingsPage', () => {
  beforeEach(() => {
    useWorkspaceContextMock.mockReset();
    useGetWorkspaceOwnershipTransferAuthorizationQueryMock.mockReset();
    useGetWorkspaceOwnershipTransferAuthorizationQueryMock.mockReturnValue({
      data: undefined,
      isFetching: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('permet à un admin autorisé de modifier les paramètres sans exposer les actions owner-only', () => {
    mockContext({
      permissions: [WORKSPACE_PERMISSION.WORKSPACE_UPDATE],
      roleKey: 'admin',
    });

    render(<WorkspaceSettingsPage />);

    expect(screen.getByText('Paramètres généraux')).toBeInTheDocument();
    expect(screen.queryByText('Transfert ownership')).not.toBeInTheDocument();
    expect(screen.queryByText('Archivage workspace')).not.toBeInTheDocument();
    expect(useGetWorkspaceOwnershipTransferAuthorizationQueryMock).toHaveBeenCalledWith(
      workspace.id,
      { skip: true },
    );
  });

  it('n’expose le transfert au propriétaire que pendant une autorisation exceptionnelle active', () => {
    mockContext({
      permissions: [
        WORKSPACE_PERMISSION.WORKSPACE_UPDATE,
        WORKSPACE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
      ],
      roleKey: 'owner',
    });
    useGetWorkspaceOwnershipTransferAuthorizationQueryMock.mockReturnValue({
      data: {
        id: 'authorization-id',
        active: true,
        status: 'active',
        expiresAt: '2026-09-13T12:00:00.000Z',
      },
      isFetching: false,
      isLoading: false,
    });

    render(<WorkspaceSettingsPage />);

    expect(screen.getByText('Paramètres généraux')).toBeInTheDocument();
    expect(screen.getByText('Transfert ownership')).toBeInTheDocument();
    expect(screen.getByText('Archivage workspace')).toBeInTheDocument();
    expect(useGetWorkspaceOwnershipTransferAuthorizationQueryMock).toHaveBeenCalledWith(
      workspace.id,
      { skip: false },
    );
  });

  it('masque entièrement le transfert lorsque l’autorisation exceptionnelle est inactive', () => {
    mockContext({
      permissions: [
        WORKSPACE_PERMISSION.WORKSPACE_UPDATE,
        WORKSPACE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
      ],
      roleKey: 'owner',
    });
    useGetWorkspaceOwnershipTransferAuthorizationQueryMock.mockReturnValue({
      data: { id: null, active: false, status: 'inactive' },
      isFetching: false,
      isLoading: false,
    });

    render(<WorkspaceSettingsPage />);

    expect(screen.queryByText('Transfert ownership')).not.toBeInTheDocument();
    expect(screen.getByText('Archivage workspace')).toBeInTheDocument();
  });

  it('garde l’archivage owner-only même si une permission de settings est absente', () => {
    mockContext({
      permissions: [],
      roleKey: 'owner',
    });

    render(<WorkspaceSettingsPage />);

    expect(screen.queryByText('Paramètres généraux')).not.toBeInTheDocument();
    expect(screen.queryByText('Transfert ownership')).not.toBeInTheDocument();
    expect(screen.getByText('Archivage workspace')).toBeInTheDocument();
  });

  it('refuse la surface d’administration sans permission de settings ni ownership', () => {
    mockContext({
      permissions: [WORKSPACE_PERMISSION.WORKSPACE_READ],
      roleKey: 'user',
    });

    render(<WorkspaceSettingsPage />);

    expect(
      screen.getByText('Vous ne disposez pas des permissions nécessaires pour administrer ces paramètres.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Paramètres généraux')).not.toBeInTheDocument();
    expect(screen.queryByText('Transfert ownership')).not.toBeInTheDocument();
    expect(screen.queryByText('Archivage workspace')).not.toBeInTheDocument();
  });
});
