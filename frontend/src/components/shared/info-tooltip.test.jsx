import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';

function renderTooltip(props) {
  return render(
    <TooltipProvider>
      <InfoTooltip {...props} />
    </TooltipProvider>,
  );
}

describe('InfoTooltip', () => {
  afterEach(() => cleanup());

  it('reste accessible au clavier et délègue Escape à la primitive Tooltip', async () => {
    const user = userEvent.setup();

    renderTooltip({
      content: 'Explication de la métrique',
      label: 'À propos de la métrique',
    });

    const trigger = screen.getByRole('button', { name: 'À propos de la métrique' });
    await user.tab();

    expect(document.activeElement).toBe(trigger);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Explication de la métrique');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('affiche le contenu au survol via le Tooltip partagé', async () => {
    const user = userEvent.setup();

    renderTooltip({
      content: 'Information non tronquée',
      label: 'Afficher l’information',
    });

    await user.hover(screen.getByRole('button', { name: 'Afficher l’information' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Information non tronquée');
  });
});
