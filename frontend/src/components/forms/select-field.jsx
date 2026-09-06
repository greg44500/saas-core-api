import { FormField } from '@/components/forms/form-field';
import { cn } from '@/lib/utils';

/**
 * Champ select natif partagé.
 *
 * Le composant conserve l’accessibilité et le style communs sans imposer de
 * logique métier aux features. Les options restent fournies par l’appelant.
 */
function SelectField({
  error,
  hint,
  id,
  label,
  options,
  placeholder = 'Sélectionner…',
  selectClassName,
  ...selectProps
}) {
  const messageId = `${id}-message`;

  return (
    <FormField error={error} hint={hint} id={id} label={label}>
      <select
        aria-describedby={(error || hint) ? messageId : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          selectClassName,
        )}
        id={id}
        {...selectProps}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

export { SelectField };
