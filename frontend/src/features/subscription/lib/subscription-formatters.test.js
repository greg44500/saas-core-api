import { describe, expect, it } from 'vitest';

import {
  formatAccessMode,
  formatLimitLabel,
  formatSubscriptionStatus,
  getTrialProgress,
} from '@/features/subscription/lib/subscription-formatters';

describe('subscription formatters', () => {
  it('traduit les valeurs métier connues sans masquer une valeur future', () => {
    expect(formatSubscriptionStatus('trialing')).toBe('Période d’essai');
    expect(formatAccessMode('remediation')).toBe('Mise en conformité requise');
    expect(formatLimitLabel('storage_bytes')).toBe('Stockage');
    expect(formatLimitLabel('future_metric')).toBe('future_metric');
  });

  it('calcule la progression informative d’un trial', () => {
    expect(getTrialProgress({
      startAt: '2026-09-01T00:00:00.000Z',
      endAt: '2026-09-11T00:00:00.000Z',
      now: new Date('2026-09-06T00:00:00.000Z'),
    })).toEqual({
      progressPercent: 50,
      remainingDays: 5,
    });
  });

  it('borne la progression et refuse les périodes invalides', () => {
    expect(getTrialProgress({
      startAt: '2026-09-01T00:00:00.000Z',
      endAt: '2026-09-11T00:00:00.000Z',
      now: new Date('2026-09-20T00:00:00.000Z'),
    })).toEqual({
      progressPercent: 100,
      remainingDays: 0,
    });

    expect(getTrialProgress({ startAt: null, endAt: null })).toBeNull();
  });
});
