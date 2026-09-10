import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const updatePreferences = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({ children, open, title }) => (
    open ? (
      <section aria-label={title}>
        {children}
      </section>
    ) : null
  ),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('@/features/preferences/api/user-preferences-api', () => ({
  useUpdateCurrentUserPreferencesMutation: () => [
    updatePreferences,
    { isLoading: false },
  ],
}));

import { DashboardDisplayPreferences } from '@/features/workspace/components/dashboard-display-preferences';

const accessibleWidgets = [
  {
    id: 'core.workspace-status',
    label: 'Statut du workspace',
    description: 'État courant.',
    configurable: false,
  },
  {
    id: 'core.members',
    label: 'Membres',
    description: 'Nombre de membres.',
    configurable: true,
  },
  {
    id: 'core.files',
    label: 'Fichiers actifs',
    description: 'Nombre de fichiers.',
    configurable: true,
  },
];

function createPreferencesQuery(hiddenWidgetIds = []) {
  return {
    data: {
      dashboard: { hiddenWidgetIds },
    },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

describe('DashboardDisplayPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePreferences.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        dashboard: { hiddenWidgetIds: [] },
      }),
    });
  });

  it('propose uniquement les widgets accessibles et configurables', async () => {
    const user = userEvent.setup();

    render(
      <DashboardDisplayPreferences
        accessibleWidgets={accessibleWidgets}
        preferencesQuery={createPreferencesQuery()}
      />,
    );

    await user.click(screen.getByRole('button', {
      name: 'Personnaliser le tableau de bord',
    }));

    expect(screen.getByRole('switch', { name: 'Afficher Membres' }))
      .toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Afficher Fichiers actifs' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Afficher Statut du workspace' }))
      .not.toBeInTheDocument();
    expect(screen.queryByText('Widget inaccessible')).not.toBeInTheDocument();
  });

  it('préserve les identifiants masqués hors contexte lors de l’enregistrement', async () => {
    const user = userEvent.setup();

    render(
      <DashboardDisplayPreferences
        accessibleWidgets={accessibleWidgets}
        preferencesQuery={createPreferencesQuery([
          'core.files',
          'removed-module.old-widget',
        ])}
      />,
    );

    await user.click(screen.getByRole('button', {
      name: 'Personnaliser le tableau de bord',
    }));
    await user.click(screen.getByRole('switch', { name: 'Afficher Membres' }));
    await user.click(screen.getByRole('switch', { name: 'Afficher Fichiers actifs' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(updatePreferences).toHaveBeenCalledWith({
      dashboard: {
        hiddenWidgetIds: [
          'core.members',
          'removed-module.old-widget',
        ],
      },
    });
  });
});
