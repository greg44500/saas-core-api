import { cloneElement, isValidElement } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';

function mergeAriaIds(...values) {
  const ids = values
    .flatMap((value) => value?.split(/\s+/) ?? [])
    .filter(Boolean);

  return [...new Set(ids)].join(' ') || undefined;
}

function FormField({ className, id, label, error, hint, info, children }) {
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
    <Field className={className}>
      <div className="flex items-center gap-1.5">
        <FieldLabel htmlFor={id}>
          {label}
        </FieldLabel>
        <InfoTooltip
          className="size-5"
          content={info}
          label={`À propos de ${label}`}
        />
      </div>

      {field}

      {error ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : hint ? (
        <FieldDescription id={messageId}>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}

export { FormField, mergeAriaIds };
