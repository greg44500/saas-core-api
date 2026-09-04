import { render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEntitlementAutoRefresh } from '@/hooks/use-entitlement-auto-refresh';

function Probe({ data, nextChangeAt, onChanged, refetch }) {
  useEntitlementAutoRefresh({
    data,
    nextChangeAt,
    onChanged,
    refetch,
    selectSnapshot: (value) => value.features,
  });

  return null;
}

describe('useEntitlementAutoRefresh', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('refetch à l’échéance et signale uniquement un changement réel', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T12:00:00.000Z'));

    const onChanged = vi.fn();
    const refetch = vi.fn().mockResolvedValue({
      data: { features: ['team_management'] },
    });

    render(
      <Probe
        data={{ features: ['file_upload'] }}
        nextChangeAt="2026-09-04T12:00:10.000Z"
        onChanged={onChanged}
        refetch={refetch}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(refetch).toHaveBeenCalledOnce();
    expect(onChanged).toHaveBeenCalledWith({
      data: { features: ['team_management'] },
      reason: 'schedule',
    });
  });
});
