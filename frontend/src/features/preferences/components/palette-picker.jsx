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
    <fieldset aria-describedby={errorId} className="space-y-2">
      <legend className="text-sm font-medium">Palette de couleurs</legend>
      <p className="text-xs text-muted-foreground">
        Cliquez sur une palette pour prévisualiser immédiatement son rendu.
        L’enregistrement reste nécessaire pour conserver ce choix.
      </p>

      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[32rem] grid-cols-4 gap-2">
          {ACTIVE_APPEARANCE_PALETTES.map((palette) => {
            const isSelected = palette.id === value;

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  'relative rounded-lg border bg-card p-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
                  className="flex h-5 overflow-hidden rounded border border-border"
                >
                  {palette.previewColors.map((color) => (
                    <span
                      className="flex-1"
                      key={color}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>

                <span className="mt-1.5 block min-h-7 text-[11px] font-medium leading-tight">
                  {palette.label}
                </span>

                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-background text-primary shadow-sm"
                  >
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
