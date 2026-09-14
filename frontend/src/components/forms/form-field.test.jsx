import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DatePicker } from '@/components/forms/date-picker';
import { FormField } from '@/components/forms/form-field';
import { Input } from '@/components/ui/input';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('FormField', () => {
  it('associe automatiquement une erreur au champ', () => {
    render(
      <FormField id="name" label="Nom" error="Le nom est obligatoire.">
        <Input id="name" />
      </FormField>,
    );

    const input = screen.getByLabelText('Nom');
    const error = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('préserve une description existante tout en ajoutant le hint', () => {
    render(
      <FormField id="code" label="Code" hint="Utilisez un code court.">
        <Input aria-describedby="external-help" id="code" />
      </FormField>,
    );

    expect(screen.getByLabelText('Code')).toHaveAttribute(
      'aria-describedby',
      'external-help code-message',
    );
  });

  it('expose une aide pédagogique à la demande via InfoTooltip', () => {
    render(
      <TooltipProvider>
        <FormField
          id="email"
          info="Cette adresse sera utilisée lors de l’acceptation."
          label="Email"
        >
          <Input id="email" />
        </FormField>
      </TooltipProvider>,
    );

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'À propos de Email' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Cette adresse sera utilisée lors de l’acceptation.'),
    ).not.toBeInTheDocument();
  });

  it('relaie aussi les attributs accessibles vers un champ composite', () => {
    render(
      <FormField id="start-date" label="Date de début" error="La date est obligatoire.">
        <DatePicker id="start-date" onChange={vi.fn()} value="" />
      </FormField>,
    );

    const input = screen.getByLabelText('Date de début');
    const error = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });
});
