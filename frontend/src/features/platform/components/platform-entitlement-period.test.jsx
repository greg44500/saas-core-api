import { describe, expect, it } from 'vitest';

import {
  getPeriodPresentation,
} from '@/features/platform/components/platform-entitlement-period';

const NOW = new Date('2026-09-11T12:00:00.000Z');

describe('getPeriodPresentation', () => {
  it('présente une dérogation permanente sur deux niveaux', () => {
    expect(getPeriodPresentation({
      lifecycle: 'active',
      startsAt: '2026-09-10T12:00:00.000Z',
      endsAt: null,
    }, NOW)).toEqual({
      primary: 'Permanente',
      secondary: 'Jusqu’à révocation',
    });
  });

  it('présente le temps avant une dérogation planifiée', () => {
    const result = getPeriodPresentation({
      lifecycle: 'scheduled',
      startsAt: '2026-09-14T12:00:00.000Z',
      endsAt: null,
    }, NOW);

    expect(result.primary).toBe('Dans 3 j');
    expect(result.secondary).toContain('14/09/2026');
  });

  it('présente le temps restant pour une dérogation active avec échéance', () => {
    const result = getPeriodPresentation({
      lifecycle: 'active',
      startsAt: '2026-09-10T12:00:00.000Z',
      endsAt: '2026-09-13T12:00:00.000Z',
    }, NOW);

    expect(result.primary).toBe('2 j restantes');
    expect(result.secondary).toContain('13/09/2026');
  });
});
