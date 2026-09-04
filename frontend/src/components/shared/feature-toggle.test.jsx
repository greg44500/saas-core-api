import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeatureToggle } from '@/components/shared/feature-toggle';

describe('FeatureToggle', () => {
  afterEach(() => cleanup());

  it('expose un vrai switch accessible et déclenche le nouvel état', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <FeatureToggle
        checked={false}
        label="Gestion d’équipe"
        onCheckedChange={onCheckedChange}
      />,
    );

    const toggle = screen.getByRole('switch', { name: 'Activer Gestion d’équipe' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('compose le libellé avec le InfoTooltip partagé', async () => {
    const user = userEvent.setup();

    render(
      <FeatureToggle
        checked
        description="Incluse dans le plan Premium"
        helpText="Permet d’administrer les membres du workspace."
        label="Gestion d’équipe"
      />,
    );

    expect(screen.getByText('Gestion d’équipe')).toBeInTheDocument();
    expect(screen.getByText('Incluse dans le plan Premium')).toBeInTheDocument();

    const infoButton = screen.getByRole('button', {
      name: 'Informations sur Gestion d’équipe',
    });
    await user.tab();
    expect(infoButton).toBeInTheDocument();
    expect(
      screen.getByRole('tooltip'),
    ).toHaveTextContent('Permet d’administrer les membres du workspace.');

    expect(
      screen.getByRole('switch', { name: 'Désactiver Gestion d’équipe' }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});
