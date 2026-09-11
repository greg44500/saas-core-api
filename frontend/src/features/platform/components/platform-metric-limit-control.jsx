import { Slider } from '@/components/ui/slider';
import {
  formatPlatformPlanLimit,
  formatPlatformPlanMetric,
} from '@/features/platform/lib/platform-plan-formatters';


function isByteMetric(metric) {
  return metric?.presentation?.unit === 'bytes'
    || metric?.unit === 'bytes'
    || metric?.key === 'storage_bytes';
}

function getLinearSliderValue({ policy, value, minimumValue }) {
  const min = Math.max(policy.min, minimumValue ?? policy.min);
  const max = policy.max;

  if (min > max) return null;

  const step = policy.step;
  const candidate = Number.isInteger(value) ? value : min;
  const clamped = Math.min(max, Math.max(min, candidate));
  const normalized = min + Math.round((clamped - min) / step) * step;

  return {
    sliderMin: min,
    sliderMax: max,
    sliderStep: step,
    sliderValue: normalized,
    rawValue: normalized,
    resolveRawValue: (nextValue) => nextValue,
  };
}

function getPresetSliderValue({ policy, value, minimumValue }) {
  const allowedValues = policy.values.filter(
    (item) => item >= (minimumValue ?? 0),
  );

  if (allowedValues.length === 0) {
    return null;
  }

  const exactIndex = allowedValues.indexOf(value);
  const fallbackIndex = allowedValues.findIndex(
    (item) => !Number.isInteger(value) || item >= value,
  );
  const selectedIndex = exactIndex >= 0
    ? exactIndex
    : fallbackIndex >= 0
      ? fallbackIndex
      : allowedValues.length - 1;

  return {
    sliderMin: 0,
    sliderMax: allowedValues.length - 1,
    sliderStep: 1,
    sliderValue: selectedIndex,
    rawValue: allowedValues[selectedIndex],
    resolveRawValue: (nextIndex) => allowedValues[nextIndex],
  };
}

function getSliderConfiguration({ metric, value, minimumValue = null }) {
  const policy = metric?.overridePolicy;
  if (!policy) return null;

  if (policy.control === 'linear_slider') {
    return getLinearSliderValue({ policy, value, minimumValue });
  }

  if (policy.control === 'preset_slider') {
    return getPresetSliderValue({ policy, value, minimumValue });
  }

  return null;
}

function PlatformMetricLimitControl({
  disabled = false,
  idPrefix,
  metric,
  minimumValue = null,
  mode = 'limited',
  onModeChange,
  onValueChange,
  value,
}) {
  const policy = metric?.overridePolicy ?? null;
  const slider = getSliderConfiguration({
    metric,
    value,
    minimumValue,
  });
  const label = metric?.presentation?.label
    ?? formatPlatformPlanMetric(metric?.key);
  const unlimitedAllowed = policy?.allowUnlimited === true;

  if (policy && !slider) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-foreground" role="alert">
        Aucune valeur de dérogation autorisée ne permet de conserver la capacité minimale requise. Le plan ou la politique de limite doit être réévalué.
      </p>
    );
  }

  if (slider) {
    const effectiveMode = unlimitedAllowed ? mode : 'limited';

    return (
      <div className="space-y-3">
        {unlimitedAllowed && (
          <div className="space-y-2">
            <label className="text-xs font-medium" htmlFor={`${idPrefix}-mode`}>
              Mode
            </label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={disabled}
              id={`${idPrefix}-mode`}
              onChange={(event) => onModeChange?.(event.target.value)}
              value={effectiveMode}
            >
              <option value="limited">Plafond défini</option>
              <option value="unlimited">Illimité</option>
            </select>
          </div>
        )}

        {effectiveMode !== 'unlimited' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Valeur accordée</span>
              <span className="rounded-md bg-muted px-2 py-1 font-semibold tabular-nums">
                {formatPlatformPlanLimit(metric?.key, slider.rawValue)}
              </span>
            </div>

            <Slider
              aria-label={`Limite ${label}`}
              disabled={disabled}
              max={slider.sliderMax}
              min={slider.sliderMin}
              onValueChange={([nextValue]) => {
                const rawValue = slider.resolveRawValue(nextValue);
                if (rawValue !== undefined) onValueChange?.(rawValue);
              }}
              step={slider.sliderStep}
              value={[slider.sliderValue]}
            />

            <div className="flex justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Min. {formatPlatformPlanLimit(
                  metric?.key,
                  slider.resolveRawValue(slider.sliderMin),
                )}
              </span>
              <span>
                Max. {formatPlatformPlanLimit(
                  metric?.key,
                  slider.resolveRawValue(slider.sliderMax),
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor={`${idPrefix}-mode`}>
          Mode
        </label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          disabled={disabled}
          id={`${idPrefix}-mode`}
          onChange={(event) => onModeChange?.(event.target.value)}
          value={mode}
        >
          <option value="limited">Plafond défini</option>
          <option value="unlimited">Illimité</option>
        </select>
      </div>

      {mode !== 'unlimited' && (
        <div className="space-y-2">
          <label className="text-xs font-medium" htmlFor={`${idPrefix}-value`}>
            {isByteMetric(metric) ? 'Limite en Mo' : 'Limite'}
          </label>
          <input
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            disabled={disabled}
            id={`${idPrefix}-value`}
            min={isByteMetric(metric) && minimumValue !== null
              ? minimumValue / (1024 * 1024)
              : minimumValue ?? 0}
            onChange={(event) => {
              const numericValue = Number(event.target.value);
              if (!Number.isFinite(numericValue) || numericValue < 0) return;
              onValueChange?.(
                isByteMetric(metric)
                  ? Math.round(numericValue * 1024 * 1024)
                  : Math.round(numericValue),
              );
            }}
            step={isByteMetric(metric) ? '0.01' : '1'}
            type="number"
            value={
              Number.isInteger(value)
                ? isByteMetric(metric)
                  ? value / (1024 * 1024)
                  : value
                : ''
            }
          />
        </div>
      )}
    </div>
  );
}


export {
  PlatformMetricLimitControl,
  getSliderConfiguration,
};
