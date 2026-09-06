import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/shared/tooltip';

/**
 * Bouton d'action compact avec libellé accessible précis et tooltip visuel
 * éventuellement plus court.
 */
function ActionIconButton({
  Icon,
  label,
  tooltipLabel = label,
  ...buttonProps
}) {
  return (
    <Tooltip content={tooltipLabel}>
      <Button aria-label={label} size="icon" type="button" {...buttonProps}>
        <Icon aria-hidden="true" className="size-4" />
      </Button>
    </Tooltip>
  );
}

export { ActionIconButton };
