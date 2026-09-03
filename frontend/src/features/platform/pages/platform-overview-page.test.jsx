import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { PlatformOverviewPage } from '@/features/platform/pages/platform-overview-page';

describe('PlatformOverviewPage', () => {
  afterEach(() => cleanup());

  it('présente une vue d’ensemble entièrement francisée et structurée', () => {
    render(<PlatformOverviewPage />);

    expect(screen.getByRole('heading', { name: 'Vue d’ensemble' })).toBeInTheDocument();
    expect(screen.getByText('Plateforme')).toBeInTheDocument();
    expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('Espaces de travail')).toBeInTheDocument();
    expect(screen.getByText('Abonnements actifs')).toBeInTheDocument();
    expect(screen.getByText('MRR contractuel estimé')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Croissance et répartition' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Santé et exploitation' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Points nécessitant une attention' })).toBeInTheDocument();
  });

  it('permet de révéler les informations secondaires sans surcharger la vue initiale', async () => {
    const user = userEvent.setup();
    render(<PlatformOverviewPage />);

    expect(
      screen.queryByText(/métriques d’usage disponibles dans le registre applicatif/i),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole('button', { name: 'Afficher le détail' })[0],
    );

    expect(
      screen.getByText(/métriques d’usage disponibles dans le registre applicatif/i),
    ).toBeInTheDocument();
  });
});
