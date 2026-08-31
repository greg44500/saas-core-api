import { describe, expect, it } from 'vitest';

import { formatMoneyFromMinor } from '@/utils/format-money';

describe('formatMoneyFromMinor', () => {
  it('formate les unités mineures EUR', () => {
    const result = formatMoneyFromMinor(1990, 'EUR');
    expect(result).toContain('19,90');
  });

  it('respecte une devise sans décimales comme JPY', () => {
    const result = formatMoneyFromMinor(1990, 'JPY');
    expect(result).toContain('1 990');
  });

  it('retourne null pour une valeur invalide', () => {
    expect(formatMoneyFromMinor(null, 'EUR')).toBeNull();
  });
});
