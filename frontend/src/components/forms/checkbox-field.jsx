import { cn } from '@/lib/utils';

/**
 * Case à cocher partagée pour les sélections multiples.
 *
 * Le composant reste purement UI : la feature conserve la validation et la
 * logique métier de sélection.
 */
function CheckboxField({
  checked,
  description = null,
  disabled = false,
  id,
  label,
  onChange,
  className,
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40',
        disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent',
        className,
      )}
      htmlFor={id}
    >
      <input
        checked={checked}
        className="mt-0.5 size-4 rounded border-input accent-primary"
        disabled={disabled}
        id={id}
        onChange={onChange}
        type="checkbox"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        {description && (
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export { CheckboxField };
