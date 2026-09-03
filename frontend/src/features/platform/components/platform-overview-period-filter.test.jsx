import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlatformOverviewPeriodFilter } from '@/features/platform/components/platform-overview-period-filter';
import { OVERVIEW_PERIOD_PRESET } from '@/features/platform/lib/platform-overview-period';

describe('PlatformOverviewPeriodFilter', () => {
  afterEach(() => cleanup());

  it('applique immédiatement un preset complet', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <PlatformOverviewPeriodFilter
        onChange={onChange}
        period={{
          preset: OVERVIEW_PERIOD_PRESET.DAYS_30,
          from: '',
          to: '',
        }}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText('Période d’analyse'),
      OVERVIEW_PERIOD_PRESET.DAYS_90,
    );

    expect(onChange).toHaveBeenCalledWith({
      preset: OVERVIEW_PERIOD_PRESET.DAYS_90,
      from: '',
      to: '',
    });
  });

  it('ne déclenche la période personnalisée qu’après validation des deux bornes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <PlatformOverviewPeriodFilter
        onChange={onChange}
        period={{
          preset: OVERVIEW_PERIOD_PRESET.DAYS_30,
          from: '',
          to: '',
        }}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText('Période d’analyse'),
      OVERVIEW_PERIOD_PRESET.CUSTOM,
    );

    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Appliquer' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/date de début/i);

    const fromInput = screen.getByLabelText('Date de début de la période');
    await user.type(fromInput, '01/08/2026');
    await user.tab();

    const toInput = screen.getByLabelText('Date de fin de la période');
    await user.type(toInput, '31/08/2026');
    await user.tab();

    await user.click(screen.getByRole('button', { name: 'Appliquer' }));

    expect(onChange).toHaveBeenCalledWith({
      preset: OVERVIEW_PERIOD_PRESET.CUSTOM,
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });
});
