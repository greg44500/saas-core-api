import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

const useWorkspaceDashboardDataMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/hooks/use-workspace-dashboard-data', () => ({
  useWorkspaceDashboardData: useWorkspaceDashboardDataMock,
}));

import { WorkspaceDashboardPage } from '@/features/workspace/pages/workspace-dashboard-page';

const baseData = {
  workspace: { id: 'workspace-1', name: 'Acme', status: 'active' },
  membership: { id: 'membership-1', role: { key: 'admin', name: 'Administrateur' } },
  permissions: {
    canReadMembers: true,
    canInviteMembers: true,
    canReadFiles: true,
    canReadSubscription: true,
    canReadAudit: true,
  },
  members: {
    query: { isLoading: false, isError: false },
    total: 4,
  },
  invitations: {
    query: { isLoading: false, isError: false },
    total: 2,
  },
  files: {
    query: { isLoading: false, isError: false },
    total: 7,
  },
  subscription: {
    query: { isLoading: false, isError: false },
    data: {
      effectiveEntitlement: {
        plan: { name: 'Premium' },
        subscriptionStatus: 'active',
        accessMode: 'normal',
      },
    },
  },
  activity: {
    query: { isLoading: false, isError: false },
    metadataQuery: { isLoading: false, isError: false },
    metadata: {
      actions: [
        { value: 'WORKSPACE_UPDATED', label: 'Workspace modifié' },
      ],
      entityTypes: [
        { value: 'Workspace', label: 'Workspace' },
      ],
      statuses: [
        { value: 'success', label: 'Réussie' },
      ],
    },
    entries: [
      {
        id: 'audit-1',
        actor: {
          id: 'user-1',
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean@example.com',
        },
        action: 'WORKSPACE_UPDATED',
        status: 'success',
        entity: { type: 'Workspace', id: 'workspace-1' },
        createdAt: '2026-09-02T10:00:00.000Z',
      },
    ],
  },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkspaceDashboardPage />
    </MemoryRouter>,
  );
}

describe('WorkspaceDashboardPage', () => {
  beforeEach(() => {
    useWorkspaceDashboardDataMock.mockReset();
    useWorkspaceDashboardDataMock.mockReturnValue(baseData);
  });

  afterEach(() => {
    cleanup();
  });

  it('affiche uniquement des synthèses dérivées des contrats Core autorisés', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByText('Administrateur')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Actif · Accès normal')).toBeInTheDocument();
    expect(screen.getByText('Workspace modifié')).toBeInTheDocument();
    expect(screen.getByText('Jean Dupont · Réussie')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Membres/ })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/members',
    );
    expect(screen.getByRole('link', { name: /Fichiers actifs/ })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/files',
    );
    expect(screen.getByRole('link', { name: /Abonnement/ })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/subscription',
    );
    expect(screen.getByRole('link', { name: 'Voir tout' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/activity',
    );
  });

  it('n’affiche pas les surfaces dont les permissions de lecture manquent', () => {
    useWorkspaceDashboardDataMock.mockReturnValue({
      ...baseData,
      permissions: {
        canReadMembers: false,
        canInviteMembers: false,
        canReadFiles: false,
        canReadSubscription: false,
        canReadAudit: false,
      },
    });

    renderPage();

    expect(screen.getByText('Statut du workspace')).toBeInTheDocument();
    expect(screen.getByText('Votre rôle')).toBeInTheDocument();
    expect(screen.queryByText('Membres')).not.toBeInTheDocument();
    expect(screen.queryByText('Invitations en attente')).not.toBeInTheDocument();
    expect(screen.queryByText('Fichiers actifs')).not.toBeInTheDocument();
    expect(screen.queryByText('Abonnement')).not.toBeInTheDocument();
    expect(screen.queryByText('Activité récente')).not.toBeInTheDocument();
  });

  it('reste utilisable lorsqu’une synthèse autorisée est indisponible', () => {
    useWorkspaceDashboardDataMock.mockReturnValue({
      ...baseData,
      files: {
        query: { isLoading: false, isError: true },
        total: null,
      },
    });

    renderPage();

    expect(screen.getByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(screen.getByText('Fichiers actifs')).toBeInTheDocument();
    expect(screen.getByText('Indisponible')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });
});
