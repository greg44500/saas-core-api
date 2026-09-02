import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DatePicker,
  formatFrenchDate,
  parseFrenchDate,
} from '@/components/forms/date-picker';

describe('DatePicker', () => {
  afterEach(() => cleanup());

  it('convertit les dates entre affichage français et valeur ISO', () => {
    expect(formatFrenchDate('2026-09-02')).toBe('02/09/2026');
    expect(parseFrenchDate('02/09/2026')).toBe('2026-09-02');
    expect(parseFrenchDate('31/02/2026')).toBeNull();
  });

  it('affiche le placeholder français et renvoie une valeur ISO après saisie', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DatePicker
        aria-label="Date du test"
        id="test-date"
        onChange={onChange}
        value=""
      />,
    );

    const input = screen.getByLabelText('Date du test');
    expect(input).toHaveAttribute('placeholder', 'jj/mm/aaaa');

    await user.type(input, '02/09/2026');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith('2026-09-02');
  });

  it('présente le calendrier et ses libellés en français', async () => {
    const user = userEvent.setup();

    render(
      <DatePicker
        aria-label="Date du test"
        id="test-date"
        onChange={vi.fn()}
        value="2026-09-02"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ouvrir le calendrier' }));

    expect(screen.getByRole('dialog', { name: 'Calendrier' })).toBeInTheDocument();
    expect(screen.getByText('septembre 2026')).toBeInTheDocument();
    expect(screen.getByText('lun.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mercredi 2 septembre 2026/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aujourd’hui' })).toBeInTheDocument();
  });
});
