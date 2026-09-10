import { describe, expect, it } from 'vitest';

import {
  forgotPasswordFormSchema,
  loginSchema,
  registerSchema,
  resetPasswordFormSchema,
} from '@/features/auth/validation/auth-schemas';

describe('auth schemas', () => {
  it('accepte un credential non vide au login sans répliquer la politique backend', () => {
    expect(
      loginSchema.safeParse({
        email: 'user@example.com',
        password: 'Ancien!123',
      }).success,
    ).toBe(true);
  });

  it('refuse un credential vide au login', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
  });

  it('refuse des mots de passe de confirmation différents', () => {
    const result = registerSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'une valeur saisie',
      confirmPassword: 'une autre valeur',
      legalAccepted: true,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['confirmPassword']);
  });

  it('exige l’acceptation contractuelle explicite à l’inscription', () => {
    const result = registerSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'une valeur saisie',
      confirmPassword: 'une valeur saisie',
      legalAccepted: false,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['legalAccepted']);
  });

  it('trim prénom et nom sans modifier le mot de passe', () => {
    const result = registerSchema.parse({
      firstName: '  Ada  ',
      lastName: '  Lovelace ',
      email: 'ada@example.com',
      password: ' valeur avec espaces ',
      confirmPassword: ' valeur avec espaces ',
      legalAccepted: true,
    });

    expect(result.firstName).toBe('Ada');
    expect(result.lastName).toBe('Lovelace');
    expect(result.password).toBe(' valeur avec espaces ');
  });

  it('valide la demande de récupération uniquement avec un email conforme', () => {
    expect(
      forgotPasswordFormSchema.safeParse({ email: 'user@example.com' }).success,
    ).toBe(true);
    expect(
      forgotPasswordFormSchema.safeParse({ email: 'invalide' }).success,
    ).toBe(false);
  });

  it('exige la confirmation du nouveau mot de passe lors du reset', () => {
    const result = resetPasswordFormSchema.safeParse({
      newPassword: 'nouvelle valeur',
      confirmPassword: 'autre valeur',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['confirmPassword']);
  });
});
