import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const Checkbox = forwardRef(function Checkbox({ className, ...props }, ref) {
  return (
    <input
      className={cn(
        'size-4 shrink-0 rounded-sm border border-input bg-background accent-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      data-slot="checkbox"
      ref={ref}
      type="checkbox"
      {...props}
    />
  );
});

Checkbox.displayName = 'Checkbox';

export { Checkbox };
