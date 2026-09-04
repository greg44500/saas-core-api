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

  it('conserve le libellé et la description lorsque la capability est active', () => {
    render(
      <FeatureToggle
        checked
        description="Inclus dans le plan Premium"
        label="Téléversement de fichiers"
      />,
    );

    expect(screen.getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(screen.getByText('Inclus dans le plan Premium')).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Désactiver Téléversement de fichiers' }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});
