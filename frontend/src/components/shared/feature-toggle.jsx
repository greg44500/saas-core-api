import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/**
 * Présente une capability booléenne avec un libellé synchronisé visuellement
 * avec le switch. L'aide contextuelle est déléguée au composant InfoTooltip
 * partagé afin de conserver le même comportement au survol et au clavier.
 */
function FeatureToggle({
  checked,
  description = null,
  disabled = false,
  helpText = null,
  label,
  onCheckedChange,
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              'truncate text-sm font-medium transition-colors duration-200 ease-in-out',
              checked ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {label}
          </span>
          <InfoTooltip
            content={helpText}
            label={`Informations sur ${label}`}
          />
        </div>
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
