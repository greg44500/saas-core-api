import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/shared/tooltip';

function ActionIconButton({ Icon, label, ...buttonProps }) {
  return (
    <Tooltip content={label}>
      <Button aria-label={label} size="icon" type="button" {...buttonProps}>
        <Icon aria-hidden="true" className="size-4" />
      </Button>
    </Tooltip>
  );
}

export { ActionIconButton };
