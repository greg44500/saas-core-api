import { cloneElement, isValidElement } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';

function mergeAriaIds(...values) {
  const ids = values
    .flatMap((value) => value?.split(/\s+/) ?? [])
    .filter(Boolean);

  return [...new Set(ids)].join(' ') || undefined;
}

function FormField({ id, label, error, hint, info, children }) {
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
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <InfoTooltip
          className="size-5"
          content={info}
          label={`À propos de ${label}`}
        />
      </div>
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
