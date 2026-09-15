import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      data-slot="input"
      ref={ref}
      type={type}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
