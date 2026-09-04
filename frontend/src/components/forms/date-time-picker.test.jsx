import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DateTimePicker,
  isoToLocalDateTimeParts,
  localDateTimeToIso,
} from '@/components/forms/date-time-picker';

describe('DateTimePicker', () => {
  afterEach(() => cleanup());

  it('convertit un instant ISO vers les valeurs locales du composant', () => {
    const value = new Date(2026, 8, 4, 14, 30).toISOString();

    expect(isoToLocalDateTimeParts(value)).toEqual({
      date: '2026-09-04',
      time: '14:30',
    });
    expect(localDateTimeToIso('2026-09-04', '14:30')).toBe(value);
  });

  it('réutilise le calendrier français et émet un instant ISO', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DateTimePicker id="demo" onChange={onChange} value="" />);

    await user.type(screen.getByPlaceholderText('jj/mm/aaaa'), '04/09/2026');
    await user.tab();

    expect(screen.getByLabelText('Heure')).toHaveValue('00:00');
    expect(onChange).toHaveBeenCalledWith(
      localDateTimeToIso('2026-09-04', '00:00'),
    );
  });
});
