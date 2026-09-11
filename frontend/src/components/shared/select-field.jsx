import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
  items = [],
  label,
  labelClassName,
  name,
  onBlur,
  onValueChange,
  placeholder = 'Sélectionner…',
  triggerClassName,
  value,
}) {
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || hint);

  return (
    <div className={cn('space-y-2', className)}>
      <label className={cn('text-sm font-medium', labelClassName)} id={labelId}>
        {label}
      </label>
      <Select
        items={items}
        name={name}
        onValueChange={(nextValue) => {
          if (typeof nextValue === 'string') onValueChange?.(nextValue);
        }}
        value={value ?? null}
      >
        <SelectTrigger
          aria-describedby={hasMessage ? messageId : undefined}
          aria-invalid={error ? true : undefined}
          aria-labelledby={labelId}
          className={triggerClassName}
          disabled={disabled}
          id={id}
          onBlur={onBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasMessage && (
        <p
          className={error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
          id={messageId}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export { SelectField };
