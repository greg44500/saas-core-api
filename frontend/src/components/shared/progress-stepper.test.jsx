import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressStepper } from '@/components/shared/progress-stepper';

const steps = [
  { id: 'account', label: 'Création du compte' },
  { id: 'login', label: 'Connexion' },
  { id: 'accept', label: 'Acceptation de l’offre' },
];

describe('ProgressStepper', () => {
  it('annonce l’étape active et marque les étapes précédentes comme terminées', () => {
    render(
      <ProgressStepper
        ariaLabel="Activation de votre accès"
        currentStep={2}
        steps={steps}
      />,
    );

    expect(
      screen.getByRole('navigation', { name: 'Activation de votre accès' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Étape 2 sur 3 — Connexion')).toBeInTheDocument();
    expect(screen.getByTitle('Étape 2 : Connexion')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByTitle('Étape 1 : Création du compte')).toHaveTextContent('✓');
  });
});
