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

  it('associe une erreur de saisie au champ', async () => {
    const user = userEvent.setup();

    render(
      <DatePicker
        aria-label="Date du test"
        id="test-date"
        onChange={vi.fn()}
        value=""
      />,
    );

    const input = screen.getByLabelText('Date du test');
    await user.type(input, '31/02/2026');
    await user.tab();

    const error = screen.getByRole('alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('ouvre le calendrier sur la date sélectionnée avec des libellés français', async () => {
    const user = userEvent.setup();

    render(
      <DatePicker
        aria-label="Date du test"
        id="test-date"
        onChange={vi.fn()}
        value="2026-09-02"
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Ouvrir le calendrier' });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'septembre 2026' })).toBeInTheDocument();
    expect(screen.getByText('lun.')).toBeInTheDocument();

    const selectedDay = screen.getByRole('button', { name: /mercredi 2 septembre 2026/i });
    expect(selectedDay).toHaveAttribute('aria-pressed', 'true');
    expect(selectedDay).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Aujourd’hui' })).toBeInTheDocument();
  });

  it('permet de naviguer entre les jours au clavier et de fermer avec Escape', async () => {
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
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('button', { name: /jeudi 3 septembre 2026/i })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvrir le calendrier' })).toHaveFocus();
  });
});
