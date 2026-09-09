import { Check } from 'lucide-react';

import { ACTIVE_APPEARANCE_PALETTES } from '@/app/application-appearance';
import { cn } from '@/lib/utils';

function PalettePicker({
  disabled = false,
  error,
  onChange,
  value,
}) {
  const errorId = error ? 'palette-picker-error' : undefined;

  return (
    <fieldset aria-describedby={errorId} className="space-y-3">
      <legend className="text-sm font-medium">Palette de couleurs</legend>
      <p className="text-sm text-muted-foreground">
        Cliquez sur une palette pour prévisualiser immédiatement son rendu.
        L’enregistrement reste nécessaire pour conserver ce choix.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ACTIVE_APPEARANCE_PALETTES.map((palette) => {
          const isSelected = palette.id === value;

          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                'rounded-xl border bg-card p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isSelected
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-border hover:border-primary/60 hover:bg-accent/40',
              )}
              disabled={disabled}
              key={palette.id}
              onClick={() => onChange(palette.id)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="flex h-9 overflow-hidden rounded-md border border-border"
              >
                {palette.previewColors.map((color) => (
                  <span
                    className="flex-1"
                    key={color}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>

              <span className="mt-3 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{palette.label}</span>
                {isSelected && <Check aria-hidden="true" className="size-4 text-primary" />}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export { PalettePicker };
