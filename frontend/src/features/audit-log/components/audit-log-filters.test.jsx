import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuditLogFilters, EMPTY_FILTERS } from '@/features/audit-log/components/audit-log-filters';

const metadata = {
  actions: [
    { value: 'FILE_DELETED', label: 'Fichier supprimé' },
  ],
  entityTypes: [
    { value: 'File', label: 'Fichier' },
    { value: 'EntitlementOverride', label: 'Dérogation' },
  ],
  statuses: [
    { value: 'success', label: 'Réussie' },
    { value: 'failed', label: 'Échouée' },
  ],
};

async function chooseOption(user, label, optionName) {
  await user.click(screen.getByRole('combobox', { name: label }));
  const option = await screen.findByRole('option', { name: optionName });
  await user.click(option);
}

describe('AuditLogFilters', () => {
  afterEach(() => {
    cleanup();
  });

  it('applique les filtres choisis depuis les métadonnées backend', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AuditLogFilters
        filters={EMPTY_FILTERS}
        metadata={metadata}
        onApply={onApply}
        onReset={vi.fn()}
      />,
    );

    await chooseOption(user, 'Action', 'Fichier supprimé');
    await chooseOption(user, 'Statut', 'Échouée');
    await user.click(screen.getByRole('button', { name: 'Appliquer les filtres' }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'FILE_DELETED',
        status: 'failed',
      }),
    );
  });

  it('affiche automatiquement une nouvelle ressource fournie par le backend', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AuditLogFilters
        filters={EMPTY_FILTERS}
        metadata={metadata}
        onApply={onApply}
        onReset={vi.fn()}
      />,
    );

    await chooseOption(user, 'Ressource', 'Dérogation');
    await user.click(screen.getByRole('button', { name: 'Appliquer les filtres' }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'EntitlementOverride' }),
    );
  });

  it('retraduit la valeur Toutes vers un filtre vide pour le contrat de requête', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AuditLogFilters
        filters={{ ...EMPTY_FILTERS, status: 'failed' }}
        metadata={metadata}
        onApply={onApply}
        onReset={vi.fn()}
      />,
    );

    await chooseOption(user, 'Statut', 'Tous');
    await user.click(screen.getByRole('button', { name: 'Appliquer les filtres' }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ status: '' }),
    );
  });

  it('refuse une période inversée avant de modifier l’URL', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AuditLogFilters
        filters={EMPTY_FILTERS}
        metadata={metadata}
        onApply={onApply}
        onReset={vi.fn()}
      />,
    );

    const fromInput = screen.getByLabelText('Du');
    const toInput = screen.getByLabelText('Au');

    await user.type(fromInput, '10/09/2026');
    await user.tab();
    await user.type(toInput, '01/09/2026');
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'Appliquer les filtres' }));

    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent('La date de début doit être antérieure ou égale à la date de fin.');
    expect(onApply).not.toHaveBeenCalled();
  });
});
