import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuditLogFilters, EMPTY_FILTERS } from '@/features/audit-log/components/audit-log-filters';

describe('AuditLogFilters', () => {
  afterEach(() => {
    cleanup();
  });

  it('applique les filtres choisis', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AuditLogFilters
        filters={EMPTY_FILTERS}
        onApply={onApply}
        onReset={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Action'), 'FILE_DELETED');
    await user.selectOptions(screen.getByLabelText('Statut'), 'failed');
    await user.click(screen.getByRole('button', { name: 'Appliquer les filtres' }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'FILE_DELETED',
        status: 'failed',
      }),
    );
  });

  it('refuse une période inversée avant de modifier l’URL', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AuditLogFilters
        filters={EMPTY_FILTERS}
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
