import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PasswordPolicyFeedback,
  evaluateFromPolicy,
} from '@/components/forms/password-policy-feedback';

const createPolicy = (overrides = {}) => ({
  minLength: 15,
  maxLength: 128,
  levels: [
    { key: 'weak', label: 'Faible', minScore: 0 },
    { key: 'good', label: 'Correct', minScore: 3 },
    { key: 'strong', label: 'Robuste', minScore: 5 },
  ],
  scoring: {
    lengthBands: [
      { minLength: 15, points: 1 },
      { minLength: 20, points: 1 },
      { minLength: 28, points: 1 },
    ],
    characterClassBands: [
      { minClasses: 2, points: 1 },
      { minClasses: 4, points: 1 },
    ],
    uniqueRatio: { minRatio: 0.6, points: 1 },
  },
  guidance: ['Une phrase de passe longue est recommandée.'],
  ...overrides,
});

describe('PasswordPolicyFeedback', () => {
  it('affiche les limites et libellés fournis par le backend', () => {
    render(
      <PasswordPolicyFeedback
        password="Phrase beaucoup plus longue, Unique 47!"
        policy={createPolicy()}
      />,
    );

    expect(
      screen.getByText('15 à 128 caractères. Lettres, chiffres, espaces et caractères spéciaux sont autorisés.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Robustesse : Robuste/)).toBeInTheDocument();
    expect(screen.getByText('Une phrase de passe longue est recommandée.')).toBeInTheDocument();
  });

  it('ne contient pas ses propres seuils de robustesse', () => {
    const policy = createPolicy({
      levels: [
        { key: 'weak', label: 'Niveau A', minScore: 0 },
        { key: 'good', label: 'Niveau B', minScore: 1 },
        { key: 'strong', label: 'Niveau C', minScore: 2 },
      ],
      scoring: {
        lengthBands: [{ minLength: 1, points: 2 }],
        characterClassBands: [],
        uniqueRatio: { minRatio: 2, points: 0 },
      },
    });

    expect(evaluateFromPolicy('abc', policy)).toEqual(
      expect.objectContaining({
        key: 'strong',
        label: 'Niveau C',
      }),
    );
  });
});
