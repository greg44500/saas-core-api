import { useEffect, useRef } from 'react';

const MAX_TIMER_DELAY = 2_147_000_000;

function serializeSnapshot(value) {
  return JSON.stringify(value ?? null);
}

/**
 * Rafraîchit un entitlement à sa prochaine échéance et au retour sur l'onglet.
 *
 * Le timer ne constitue jamais une barrière de sécurité : il maintient
 * uniquement l'UI synchronisée. Le backend reste l'autorité sur chaque requête.
 */
function useEntitlementAutoRefresh({
  data,
  nextChangeAt,
  onChanged,
  refetch,
  selectSnapshot,
}) {
  const refetchRef = useRef(refetch);
  const onChangedRef = useRef(onChanged);
  const selectSnapshotRef = useRef(selectSnapshot);
  const snapshotRef = useRef(null);

  useEffect(() => {
    refetchRef.current = refetch;
    onChangedRef.current = onChanged;
    selectSnapshotRef.current = selectSnapshot;
  }, [onChanged, refetch, selectSnapshot]);

  useEffect(() => {
    if (!data || typeof selectSnapshot !== 'function') return;
    snapshotRef.current = serializeSnapshot(selectSnapshot(data));
  }, [data, selectSnapshot]);

  useEffect(() => {
    if (!nextChangeAt) return undefined;

    const targetTime = new Date(nextChangeAt).getTime();
    if (!Number.isFinite(targetTime)) return undefined;

    let timeoutId;
    let cancelled = false;

    const refresh = async (reason) => {
      try {
        const before = snapshotRef.current;
        const result = await refetchRef.current?.();
        if (cancelled || !result?.data || !selectSnapshotRef.current) return;

        const after = serializeSnapshot(
          selectSnapshotRef.current(result.data),
        );
        snapshotRef.current = after;

        if (before !== null && before !== after) {
          onChangedRef.current?.({
            data: result.data,
            reason,
          });
        }
      } catch {
        // Les états d'erreur restent gérés par RTK Query et les composants.
      }
    };

    const schedule = () => {
      const remaining = targetTime - Date.now();

      if (remaining <= 0) {
        void refresh('schedule');
        return;
      }

      timeoutId = window.setTimeout(
        schedule,
        Math.min(remaining, MAX_TIMER_DELAY),
      );
    };

    schedule();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh('focus');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [nextChangeAt]);
}

export { useEntitlementAutoRefresh };
