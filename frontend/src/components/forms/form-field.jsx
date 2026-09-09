import { cloneElement, isValidElement } from 'react';

function mergeAriaIds(...values) {
  const ids = values
    .flatMap((value) => value?.split(/\s+/) ?? [])
    .filter(Boolean);

  return [...new Set(ids)].join(' ') || undefined;
}

function FormField({ id, label, error, hint, children }) {
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || hint);
  const field = isValidElement(children)
    ? cloneElement(children, {
      'aria-describedby': mergeAriaIds(
        children.props['aria-describedby'],
        hasMessage ? messageId : undefined,
      ),
      'aria-invalid': error
        ? true
        : children.props['aria-invalid'],
    })
    : children;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {field}
      {hasMessage && (
        <p
          id={messageId}
          className={error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export { FormField, mergeAriaIds };
