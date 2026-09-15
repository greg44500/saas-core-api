import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

describe('Field', () => {
  it('compose un label et un contrôle natif accessibles', () => {
    render(
      <Field>
        <FieldLabel htmlFor="field-name">Nom</FieldLabel>
        <Input id="field-name" />
      </Field>,
    );

    expect(screen.getByLabelText('Nom')).toBeInTheDocument();
  });

  it('expose les descriptions et erreurs avec les rôles attendus', () => {
    render(
      <Field>
        <FieldDescription id="field-hint">Aide contextuelle.</FieldDescription>
        <FieldError id="field-error">Valeur invalide.</FieldError>
      </Field>,
    );

    expect(screen.getByText('Aide contextuelle.')).toHaveAttribute(
      'data-slot',
      'field-description',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Valeur invalide.');
  });
});
