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
  disabled = false,
  error,
  hint,
  id,
  items = [],
  label,
  name,
  onBlur,
  onValueChange,
  placeholder = 'Sélectionner…',
  value,
}) {
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || hint);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" id={labelId}>
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
