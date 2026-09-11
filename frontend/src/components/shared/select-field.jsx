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
 * sur le même primitive shadcn/Base UI.
 */
function SelectField({
  disabled = false,
  id,
  items = [],
  label,
  onValueChange,
  placeholder = 'Sélectionner…',
  value,
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" id={`${id}-label`}>
        {label}
      </label>
      <Select
        items={items}
        onValueChange={(nextValue) => {
          if (typeof nextValue === 'string') onValueChange?.(nextValue);
        }}
        value={value ?? null}
      >
        <SelectTrigger
          aria-labelledby={`${id}-label`}
          disabled={disabled}
          id={id}
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
    </div>
  );
}

export { SelectField };
