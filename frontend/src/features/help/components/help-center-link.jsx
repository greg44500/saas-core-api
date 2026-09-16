import { CircleHelp } from 'lucide-react';
import { Link } from 'react-router';

import { buttonVariants } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function HelpCenterLink({ to, label = "Centre d'aide" }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Link
            aria-label={label}
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            to={to}
          />
        )}
      >
        <CircleHelp aria-hidden="true" className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export { HelpCenterLink };
