import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DashboardDisplayPreviewProvider,
  useDashboardDisplayPreview,
} from '@/components/shared/dashboard-display-preview-context';
import { TooltipProvider } from '@/components/ui/tooltip';

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

import { DashboardDisplayPreferences } from '@/components/shared/dashboard-display-preferences';

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

function PreviewProbe() {
  const { previewHiddenWidgetIds } = useDashboardDisplayPreview();

  return (
    <output data-testid="preview">
      {previewHiddenWidgetIds === null
        ? 'saved'
        : [...previewHiddenWidgetIds].sort().join(',') || 'none'}
    </output>
  );
}

function renderPreferences(hiddenWidgetIds = [], { triggerVariant = 'button' } = {}) {
  return render(
    <TooltipProvider delay={0}>
      <DashboardDisplayPreviewProvider>
        <DashboardDisplayPreferences
          accessibleWidgets={accessibleWidgets}
          preferencesQuery={createPreferencesQuery(hiddenWidgetIds)}
          triggerVariant={triggerVariant}
        />
        <PreviewProbe />
      </DashboardDisplayPreviewProvider>
    </TooltipProvider>,
  );
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

    renderPreferences();

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

  it('propose un raccourci icône avec l’infobulle Préférences d’affichage', async () => {
    const user = userEvent.setup();

    renderPreferences([], { triggerVariant: 'icon' });

    const trigger = screen.getByRole('button', { name: 'Préférences d’affichage' });
    expect(screen.queryByText('Personnaliser le tableau de bord')).not.toBeInTheDocument();

    await user.hover(trigger);
    expect(await screen.findByText('Préférences d’affichage')).toBeInTheDocument();
  });

  it('prévisualise immédiatement un switch puis restaure l’état enregistré avec Annuler', async () => {
    const user = userEvent.setup();

    renderPreferences(['core.files']);

    expect(screen.getByTestId('preview')).toHaveTextContent('saved');

    await user.click(screen.getByRole('button', {
      name: 'Personnaliser le tableau de bord',
    }));
    expect(screen.getByTestId('preview')).toHaveTextContent('core.files');

    await user.click(screen.getByRole('switch', { name: 'Afficher Membres' }));
    expect(screen.getByTestId('preview')).toHaveTextContent('core.files,core.members');

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByTestId('preview')).toHaveTextContent('saved');
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it('préserve les identifiants masqués hors contexte lors de l’enregistrement', async () => {
    const user = userEvent.setup();

    renderPreferences([
      'core.files',
      'platform.team',
      'removed-module.old-widget',
    ]);

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
          'platform.team',
          'removed-module.old-widget',
        ],
      },
    });
    expect(screen.getByTestId('preview')).toHaveTextContent('saved');
  });
});
