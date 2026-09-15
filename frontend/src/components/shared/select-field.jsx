import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Champ Select partagé pour les listes simples. Les catalogues volumineux avec
 * recherche et groupes utilisent GroupedSearchSelect, mais les deux reposent
 * sur la même primitive shadcn/Base UI.
 */
function SelectField({
  className,
  disabled = false,
  error,
  hint,
  id,
  info,
  items = [],
  label,
  labelClassName,
  name,
  onBlur,
  onValueChange,
  placeholder = 'Sélectionner…',
  triggerClassName,
  triggerRef,
  value,
}) {
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || hint);

  return (
    <Field className={className}>
      <div className="flex items-center gap-1.5">
        <FieldLabel
          className={labelClassName}
          htmlFor={id}
          id={labelId}
        >
          {label}
        </FieldLabel>
        <InfoTooltip
          className="size-5"
          content={info}
          label={`À propos de ${label}`}
        />
      </div>

      <Select
        disabled={disabled}
        items={items}
        name={name}
        onValueChange={(nextValue) => {
          if (typeof nextValue === 'string') onValueChange?.(nextValue);
        }}
        value={value === '' ? null : (value ?? null)}
      >
        <SelectTrigger
          aria-describedby={hasMessage ? messageId : undefined}
          aria-invalid={error ? true : undefined}
          aria-labelledby={labelId}
          className={triggerClassName}
          disabled={disabled}
          id={id}
          onBlur={onBlur}
          ref={triggerRef}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem
              disabled={item.disabled}
              key={item.value}
              value={item.value}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : hint ? (
        <FieldDescription id={messageId}>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}

export { SelectField };
