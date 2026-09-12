import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Bouton d'action compact avec libellé accessible précis et tooltip visuel
 * éventuellement plus court. La mécanique de tooltip reste entièrement
 * déléguée à la primitive shadcn/Base UI canonique.
 */
function ActionIconButton({
  Icon,
  label,
  tooltipLabel = label,
  ...buttonProps
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            aria-label={label}
            size="icon"
            type="button"
            {...buttonProps}
          />
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}

export { ActionIconButton };
