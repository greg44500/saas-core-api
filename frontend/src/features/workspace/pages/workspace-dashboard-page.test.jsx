import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useWorkspaceDashboardWidgetsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/hooks/use-workspace-dashboard-widgets', () => ({
  useWorkspaceDashboardWidgets: useWorkspaceDashboardWidgetsMock,
}));

vi.mock('@/components/shared/dashboard-display-preferences', () => ({
  DashboardDisplayPreferences: () => (
    <button type="button">Personnaliser le tableau de bord</button>
  ),
}));

import { WorkspaceDashboardPage } from '@/features/workspace/pages/workspace-dashboard-page';

function WorkspaceStatusWidget() {
  return <div>Statut du workspace : Actif</div>;
}

function WorkspaceRoleWidget() {
  return <div>Votre rôle : Administrateur</div>;
}

function MembersWidget() {
  return <div>Membres : 4</div>;
}

function FilesWidget() {
  return <div>Fichiers actifs : 7</div>;
}

function ActivityWidget() {
  return <div>Activité récente : Workspace modifié</div>;
}

const allWidgets = [
  {
    id: 'core.workspace-status',
    label: 'Statut du workspace',
    description: 'État courant du workspace.',
    slot: 'summary',
    configurable: false,
    component: WorkspaceStatusWidget,
  },
  {
    id: 'core.workspace-role',
    label: 'Votre rôle',
    description: 'Rôle effectif dans ce workspace.',
    slot: 'summary',
    configurable: false,
    component: WorkspaceRoleWidget,
  },
  {
    id: 'core.members',
    label: 'Membres',
    description: 'Nombre de membres visibles dans le workspace.',
    slot: 'summary',
    configurable: true,
    component: MembersWidget,
  },
  {
    id: 'core.files',
    label: 'Fichiers actifs',
    description: 'Nombre de fichiers actifs accessibles dans le workspace.',
    slot: 'summary',
    configurable: true,
    component: FilesWidget,
  },
  {
    id: 'core.recent-activity',
    label: 'Activité récente',
    description: 'Dernières actions auditables du workspace.',
    slot: 'content',
    configurable: true,
    component: ActivityWidget,
  },
];

const baseData = {
  workspace: { id: 'workspace-1', name: 'Acme', status: 'active' },
  accessibleWidgets: allWidgets,
  visibleWidgets: allWidgets,
  preferencesQuery: {
    data: { dashboard: { hiddenWidgetIds: [] } },
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  isPreferencesLoading: false,
};

describe('WorkspaceDashboardPage', () => {
  beforeEach(() => {
    useWorkspaceDashboardWidgetsMock.mockReset();
    useWorkspaceDashboardWidgetsMock.mockReturnValue(baseData);
  });

  afterEach(() => cleanup());

  it('compose les widgets visibles fournis par le registre', () => {
    render(<WorkspaceDashboardPage />);

    expect(screen.getByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(screen.getByText('Statut du workspace : Actif')).toBeInTheDocument();
    expect(screen.getByText('Votre rôle : Administrateur')).toBeInTheDocument();
    expect(screen.getByText('Membres : 4')).toBeInTheDocument();
    expect(screen.getByText('Fichiers actifs : 7')).toBeInTheDocument();
    expect(screen.getByText('Activité récente : Workspace modifié')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Personnaliser le tableau de bord',
    })).toBeInTheDocument();
  });

  it('ne monte pas un widget accessible mais masqué par la préférence utilisateur', () => {
    useWorkspaceDashboardWidgetsMock.mockReturnValue({
      ...baseData,
      visibleWidgets: allWidgets.filter((widget) => widget.id !== 'core.files'),
    });

    render(<WorkspaceDashboardPage />);

    expect(screen.queryByText('Fichiers actifs : 7')).not.toBeInTheDocument();
    expect(screen.getByText('Membres : 4')).toBeInTheDocument();
  });

  it('affiche des skeletons sans monter les widgets configurables pendant le chargement des préférences', () => {
    useWorkspaceDashboardWidgetsMock.mockReturnValue({
      ...baseData,
      visibleWidgets: allWidgets.filter((widget) => !widget.configurable),
      isPreferencesLoading: true,
    });

    render(<WorkspaceDashboardPage />);

    expect(screen.getByText('Statut du workspace : Actif')).toBeInTheDocument();
    expect(screen.getByText('Votre rôle : Administrateur')).toBeInTheDocument();
    expect(screen.queryByText('Membres : 4')).not.toBeInTheDocument();
    expect(screen.queryByText('Fichiers actifs : 7')).not.toBeInTheDocument();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});
