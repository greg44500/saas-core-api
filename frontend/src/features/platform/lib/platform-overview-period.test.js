import { describe, expect, it } from 'vitest';

import {
  OVERVIEW_PERIOD_PRESET,
  readOverviewPeriod,
  resolveOverviewApiPeriod,
  validateCustomOverviewPeriod,
  writeOverviewPeriodSearchParams,
} from '@/features/platform/lib/platform-overview-period';

const NOW = new Date('2026-09-03T12:00:00.000Z');

describe('platform overview period helpers', () => {
  it('utilise 30 jours comme période canonique par défaut', () => {
    expect(readOverviewPeriod(new URLSearchParams())).toEqual({
      preset: OVERVIEW_PERIOD_PRESET.DAYS_30,
      from: '',
      to: '',
    });

    expect(
      writeOverviewPeriodSearchParams({
        preset: OVERVIEW_PERIOD_PRESET.DAYS_30,
      }).toString(),
    ).toBe('');

    expect(
      resolveOverviewApiPeriod({
        preset: OVERVIEW_PERIOD_PRESET.DAYS_30,
      }, NOW),
    ).toEqual({});
  });

  it('résout un preset roulant avec un argument RTK Query stable', () => {
    expect(
      resolveOverviewApiPeriod({
        preset: OVERVIEW_PERIOD_PRESET.DAYS_7,
      }, NOW),
    ).toEqual({
      from: '2026-08-27T12:00:00.000Z',
      to: '2026-09-03T12:00:00.000Z',
    });
  });

  it('conserve une période personnalisée dans l’URL et rend la date de fin inclusive pour l’utilisateur', () => {
    const params = writeOverviewPeriodSearchParams({
      preset: OVERVIEW_PERIOD_PRESET.CUSTOM,
      from: '2026-08-01',
      to: '2026-08-31',
    });

    expect(readOverviewPeriod(params)).toEqual({
      preset: OVERVIEW_PERIOD_PRESET.CUSTOM,
      from: '2026-08-01',
      to: '2026-08-31',
    });
    expect(
      resolveOverviewApiPeriod(readOverviewPeriod(params), NOW),
    ).toEqual({
      from: new Date(2026, 7, 1, 0, 0, 0, 0).toISOString(),
      to: new Date(2026, 8, 1, 0, 0, 0, 0).toISOString(),
    });
  });

  it('retombe sur 30 jours pour une URL personnalisée incomplète ou inconnue', () => {
    expect(
      readOverviewPeriod(new URLSearchParams('period=custom&from=2026-08-01')),
    ).toMatchObject({ preset: OVERVIEW_PERIOD_PRESET.DAYS_30 });

    expect(
      readOverviewPeriod(new URLSearchParams('period=unknown')),
    ).toMatchObject({ preset: OVERVIEW_PERIOD_PRESET.DAYS_30 });
  });

  it('refuse une période personnalisée inversée ou supérieure à 366 jours', () => {
    expect(validateCustomOverviewPeriod({
      from: '2026-09-03',
      to: '2026-09-01',
    })).toMatch(/précéder/i);

    expect(validateCustomOverviewPeriod({
      from: '2025-01-01',
      to: '2026-09-01',
    })).toMatch(/366 jours/i);

    expect(validateCustomOverviewPeriod({
      from: '2026-08-01',
      to: '2026-08-31',
    })).toBeNull();
  });
});
