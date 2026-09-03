import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { InfoTooltip } from '@/components/shared/info-tooltip';

describe('InfoTooltip', () => {
  afterEach(() => cleanup());

  it('relie l’explication au bouton utilisable au clavier', () => {
    render(
      <InfoTooltip
        content="Explication de la métrique"
        label="À propos de la métrique"
      />,
    );

    const trigger = screen.getByRole('button', { name: 'À propos de la métrique' });
    const tooltip = screen.getByRole('tooltip');

    expect(tooltip).toHaveTextContent('Explication de la métrique');
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);
  });
});
