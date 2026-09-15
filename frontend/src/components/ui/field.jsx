import { cn } from '@/lib/utils';

function Field({ className, ...props }) {
  return (
    <div
      className={cn('grid gap-2', className)}
      data-slot="field"
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }) {
  return (
    <label
      className={cn('text-sm font-medium text-foreground', className)}
      data-slot="field-label"
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      data-slot="field-description"
      {...props}
    />
  );
}

function FieldError({ className, children, ...props }) {
  if (!children) return null;

  return (
    <p
      className={cn('text-sm text-destructive', className)}
      data-slot="field-error"
      role="alert"
      {...props}
    >
      {children}
    </p>
  );
}

export {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
};
