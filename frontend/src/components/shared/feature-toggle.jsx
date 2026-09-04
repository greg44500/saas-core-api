import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/**
 * Présente une capability booléenne avec un libellé synchronisé visuellement
 * avec le switch. Le texte reste toujours présent et le switch conserve son
 * état accessible ; la couleur n'est donc jamais l'unique information.
 */
function FeatureToggle({
  checked,
  description = null,
  disabled = false,
  label,
  onCheckedChange,
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-sm font-medium transition-colors duration-200 ease-in-out',
            checked ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <Switch
        aria-label={`${checked ? 'Désactiver' : 'Activer'} ${label}`}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

export { FeatureToggle };
