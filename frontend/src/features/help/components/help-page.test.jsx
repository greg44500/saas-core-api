import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
  useParams,
} from 'react-router';
import { describe, expect, it } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { HelpPage } from '@/features/help/components/help-page';

const catalog = {
  categories: [
    {
      id: 'platform_users_workspaces',
      context: 'platform',
      label: 'Utilisateurs & workspaces',
      description: 'Administrer les utilisateurs et les workspaces autorisés.',
      order: 10,
    },
  ],
  entries: [
    {
      id: 'platform.users.read',
      categoryId: 'platform_users_workspaces',
      title: 'Consulter un utilisateur',
      summary: 'Retrouver les informations administratives autorisées.',
      search: {
        keywords: ['utilisateur'],
        questions: ['Comment consulter un utilisateur ?'],
      },
      order: 10,
    },
  ],
};

const entry = {
  id: 'platform.users.read',
  categoryId: 'platform_users_workspaces',
  title: 'Consulter un utilisateur',
  summary: 'Retrouver les informations administratives autorisées.',
  whoCanPerform: 'Un membre Platform autorisé.',
  prerequisites: [],
  steps: ['Ouvrir la liste des utilisateurs.', 'Sélectionner le compte autorisé.'],
  outcome: 'Les informations autorisées sont affichées.',
  edgeCases: [],
  sensitiveConsequences: [],
  relatedEntryIds: [],
};

function RoutedHelpPage({ entryError }) {
  const { entryId } = useParams();

  return (
    <HelpPage
      basePath="/platform/help"
      catalog={catalog}
      catalogError={undefined}
      catalogLoading={false}
      description="Aide Platform"
      entry={entryError ? undefined : entry}
      entryError={entryError}
      entryId={entryId}
      entryLoading={false}
      title="Centre d’aide Platform"
    />
  );
}

function renderHelpRoute({
  entryError,
  initialEntry = '/platform/help/platform.users.read',
} = {}) {
  return render(
    <TooltipProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            element={<RoutedHelpPage entryError={entryError} />}
            path="/platform/help/:entryId"
          />
          <Route
            element={<RoutedHelpPage entryError={entryError} />}
            path="/platform/help"
          />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  );
}

describe('HelpPage', () => {
  it('conserve le catalogue monté derrière la fiche ouverte en drawer', async () => {
    const user = userEvent.setup();
    renderHelpRoute();

    // Le Drawer est modal : Base UI masque temporairement le catalogue de
    // l’arbre d’accessibilité tout en le conservant visuellement derrière.
    expect(
      screen.getByRole('heading', {
        name: 'Centre d’aide Platform',
        hidden: true,
      }),
    ).toBeInTheDocument();

    const drawer = screen.getByRole('dialog');
    expect(
      within(drawer).getByRole('heading', { name: 'Consulter un utilisateur' }),
    ).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Fermer' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: 'Centre d’aide Platform' }),
    ).toBeInTheDocument();
  });

  it('place les descriptions contextuelles dans des info-tooltips nommés', async () => {
    const user = userEvent.setup();
    renderHelpRoute();

    const drawer = screen.getByRole('dialog');
    await user.click(within(drawer).getByRole('button', { name: 'Fermer' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const centerInfo = screen.getByRole('button', {
      name: 'À propos de Centre d’aide Platform',
    });
    expect(
      screen.getByRole('button', {
        name: 'À propos de Utilisateurs & workspaces',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Aide Platform')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Administrer les utilisateurs et les workspaces autorisés.'),
    ).not.toBeInTheDocument();

    await user.hover(centerInfo);
    expect(await screen.findByText('Aide Platform')).toBeInTheDocument();
  });

  it('met le catalogue visuellement en retrait pendant les suggestions sans le rendre modal', async () => {
    const user = userEvent.setup();
    renderHelpRoute({ initialEntry: '/platform/help' });

    const searchInput = screen.getByRole('combobox', {
      name: 'Rechercher dans le centre d’aide',
    });

    await user.type(searchInput, 'utilisateur');

    expect(await screen.findByText('Suggestions')).toBeInTheDocument();
    expect(
      document.querySelector('[data-help-search-spotlight="active"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Utilisateurs & workspaces' }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(
        document.querySelector('[data-help-search-spotlight="active"]'),
      ).not.toBeInTheDocument();
    });
  });

  it('conserve une réponse générique dans le drawer pour une fiche indisponible', () => {
    renderHelpRoute({ entryError: { status: 404 } });

    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByRole('alert')).toHaveTextContent(
      'Cette aide n’existe pas ou n’est pas disponible avec vos droits actuels.',
    );
  });
});
