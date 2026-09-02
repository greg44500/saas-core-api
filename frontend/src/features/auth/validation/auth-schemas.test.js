import { describe, expect, it } from 'vitest';

import {
  forgotPasswordFormSchema,
  loginSchema,
  registerSchema,
  resetPasswordFormSchema,
} from '@/features/auth/validation/auth-schemas';

describe('auth schemas', () => {
  it('accepte un login conforme au contrat backend', () => {
    expect(
      loginSchema.safeParse({
        email: 'user@example.com',
        password: 'mot-de-passe-assez-long',
      }).success,
    ).toBe(true);
  });

  it('refuse un mot de passe inférieur à 15 caractères', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'trop-court',
    });

    expect(result.success).toBe(false);
  });

  it('refuse des mots de passe de confirmation différents', () => {
    const result = registerSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'mot-de-passe-assez-long',
      confirmPassword: 'autre-mot-de-passe-long',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['confirmPassword']);
  });

  it('trim prénom et nom sans modifier le mot de passe', () => {
    const result = registerSchema.parse({
      firstName: '  Ada  ',
      lastName: '  Lovelace ',
      email: 'ada@example.com',
      password: ' mot-de-passe-avec-espaces ',
      confirmPassword: ' mot-de-passe-avec-espaces ',
    });

    expect(result.firstName).toBe('Ada');
    expect(result.lastName).toBe('Lovelace');
    expect(result.password).toBe(' mot-de-passe-avec-espaces ');
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
      newPassword: 'nouveau-mot-de-passe-long',
      confirmPassword: 'autre-mot-de-passe-long',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['confirmPassword']);
  });
});
