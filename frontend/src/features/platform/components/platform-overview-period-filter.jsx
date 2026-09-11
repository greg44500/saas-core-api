import { useEffect, useState } from 'react';

import { DatePicker, toIsoDate } from '@/components/forms/date-picker';
import { SelectField } from '@/components/shared/select-field';
import { Button } from '@/components/ui/button';
import {
  OVERVIEW_PERIOD_PRESET,
  PERIOD_OPTIONS,
  validateCustomOverviewPeriod,
} from '@/features/platform/lib/platform-overview-period';

/**
 * Contrôle la période analytique sans stocker d'état serveur dans Redux.
 *
 * Les presets modifient immédiatement l'URL via le parent. Le mode personnalisé
 * conserve un brouillon local jusqu'à validation afin de ne jamais déclencher
 * une requête backend avec une demi-période (`from` sans `to`, ou inversement).
 */
function PlatformOverviewPeriodFilter({
  period,
  onChange,
  disabled = false,
}) {
  const [mode, setMode] = useState(period.preset);
  const [from, setFrom] = useState(period.from ?? '');
  const [to, setTo] = useState(period.to ?? '');
  const [error, setError] = useState(null);
  const today = toIsoDate(new Date());

  useEffect(() => {
    setMode(period.preset);
    setFrom(period.from ?? '');
    setTo(period.to ?? '');
    setError(null);
  }, [period.from, period.preset, period.to]);

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setError(null);

    if (nextMode !== OVERVIEW_PERIOD_PRESET.CUSTOM) {
      onChange({ preset: nextMode, from: '', to: '' });
    }
  }

  function applyCustomPeriod() {
    const validationError = validateCustomOverviewPeriod({ from, to });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onChange({
      preset: OVERVIEW_PERIOD_PRESET.CUSTOM,
      from,
      to,
    });
  }

  return (
    <div className="flex flex-col gap-3 lg:items-end">
      <SelectField
        className="w-full lg:w-auto"
        disabled={disabled}
        id="platform-overview-period"
        items={PERIOD_OPTIONS}
        label="Période d’analyse"
        labelClassName="sr-only"
        onValueChange={handleModeChange}
        triggerClassName="min-w-52"
        value={mode}
      />

      {mode === OVERVIEW_PERIOD_PRESET.CUSTOM && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Du
            <DatePicker
              aria-label="Date de début de la période"
              disabled={disabled}
              max={to || today}
              onChange={setFrom}
              value={from}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Au
            <DatePicker
              aria-label="Date de fin de la période"
              disabled={disabled}
              max={today}
              min={from || undefined}
              onChange={setTo}
              value={to}
            />
          </label>
          <Button
            disabled={disabled}
            onClick={applyCustomPeriod}
            type="button"
            variant="outline"
          >
            Appliquer
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { PlatformOverviewPeriodFilter };
