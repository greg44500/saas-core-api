import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DashboardSection } from '@/components/shared/dashboard-section';

describe('DashboardSection', () => {
  afterEach(() => cleanup());

  it('associe le titre au contenu et expose l’aide contextuelle sans texte visuel permanent', () => {
    render(
      <DashboardSection
        action={<button type="button">Changer la période</button>}
        description="Analyse de la croissance"
        title="Croissance"
      >
        <p>Contenu du dashboard</p>
      </DashboardSection>,
    );

    const section = screen.getByRole('region', { name: 'Croissance' });

    expect(section).toHaveTextContent('Analyse de la croissance');
    expect(section).toHaveTextContent('Contenu du dashboard');
    expect(
      screen.getByRole('button', { name: 'À propos de Croissance' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Changer la période' }),
    ).toBeInTheDocument();
  });
});
