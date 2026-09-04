import { cn } from '@/lib/utils';

/**
 * Primitive de switch accessible et réutilisable.
 *
 * La couleur et le mouvement sont centralisés ici afin que les features ne
 * recréent pas leur propre interrupteur. La valeur sémantique reste portée par
 * `aria-checked`, la couleur ne constituant jamais l'unique signal d'état.
 */
function Switch({
  checked = false,
  disabled = false,
  onCheckedChange,
  className,
  'aria-label': ariaLabel,
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-primary bg-primary'
          : 'border-border bg-muted',
        className,
      )}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

export { Switch };
