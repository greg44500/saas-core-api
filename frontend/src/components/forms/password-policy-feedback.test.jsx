import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PasswordPolicyFeedback,
  evaluateFromPolicy,
  isRejectedByPublicPolicy,
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
  rejection: {
    weakTerms: ['password', 'motdepasse', 'azerty'],
    leetspeakMap: {
      '@': 'a',
      '4': 'a',
      '3': 'e',
      '1': 'i',
      '!': 'i',
      '0': 'o',
      '$': 's',
      '5': 's',
      '7': 't',
    },
    knownSequences: [
      '0123456789',
      '1234567890',
      'abcdefghijklmnopqrstuvwxyz',
      'azertyuiop',
    ],
    minimumSequenceLength: 6,
    repeatedCharacterMinimum: 6,
    repeatedPatternMaximumLength: 8,
    repeatedPatternMinimumRepeats: 3,
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
      rejection: undefined,
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

  it.each([
    'Password123456!',
    'P@ssw0rd-2026-super',
    '123456789012345',
    'aaaaaaaaaaaaaaa',
    'azertyuiopazerty',
  ])('reflète le refus backend pour %s', (password) => {
    const policy = createPolicy();

    expect(isRejectedByPublicPolicy(password, policy)).toBe(true);
    expect(evaluateFromPolicy(password, policy)).toEqual(
      expect.objectContaining({
        key: 'weak',
        label: 'Faible',
      }),
    );
  });

  it('affiche qu’un mot de passe prévisible sera refusé', () => {
    render(
      <PasswordPolicyFeedback
        password="Password123456!"
        policy={createPolicy()}
      />,
    );

    expect(screen.getByText('Robustesse : Faible')).toBeInTheDocument();
    expect(
      screen.getByText('Ce mot de passe est trop prévisible et sera refusé.'),
    ).toBeInTheDocument();
  });
});
