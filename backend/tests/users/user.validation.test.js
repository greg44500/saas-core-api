import { describe, expect, it } from 'vitest';

import {
  requestCurrentUserClosureSchema,
  updateCurrentUserProfileSchema,
  userIdentityInputSchema,
} from '../../modules/users/user.validation.js';

describe('userIdentityInputSchema', () => {
  const validPayload = {
    firstName: 'Greg',
    lastName: 'Ballat',
    email: 'greg@example.com',
  };

  it('accepte un payload User valide', () => {
    const result = userIdentityInputSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  it('supprime les espaces inutiles autour du prénom et du nom', () => {
    const result = userIdentityInputSchema.safeParse({
      ...validPayload,
      firstName: '  Greg  ',
      lastName: '  Ballat  ',
    });

    expect(result.success).toBe(true);

    expect(result.data).toEqual({
      firstName: 'Greg',
      lastName: 'Ballat',
      email: 'greg@example.com',
    });
  });

  it('refuse un prénom vide après trim', () => {
    const result = userIdentityInputSchema.safeParse({
      ...validPayload,
      firstName: '   ',
    });

    expect(result.success).toBe(false);
  });

  it('refuse un nom vide après trim', () => {
    const result = userIdentityInputSchema.safeParse({
      ...validPayload,
      lastName: '   ',
    });

    expect(result.success).toBe(false);
  });

  it('refuse un prénom de plus de 100 caractères', () => {
    const result = userIdentityInputSchema.safeParse({
      ...validPayload,
      firstName: 'a'.repeat(101),
    });

    expect(result.success).toBe(false);
  });

  it('refuse un nom de plus de 100 caractères', () => {
    const result = userIdentityInputSchema.safeParse({
      ...validPayload,
      lastName: 'a'.repeat(101),
    });

    expect(result.success).toBe(false);
  });

  it('refuse une adresse email invalide', () => {
    const result = userIdentityInputSchema.safeParse({
      ...validPayload,
      email: 'adresse-invalide',
    });

    expect(result.success).toBe(false);
  });

  it('refuse une adresse email de plus de 254 caractères', () => {
    const result = userIdentityInputSchema.safeParse({
      ...validPayload,
      email: `${'a'.repeat(243)}@example.com`,
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ['status', 'active'],
    ['platformRole', 'super_admin'],
    ['emailCanonical', 'greg@example.com'],
    ['emailVerifiedAt', new Date()],
    ['passwordChangedAt', new Date()],
    ['lastLoginAt', new Date()],
    ['disabledAt', new Date()],
    ['closedAt', new Date()],
    ['createdBy', 'user-id'],
    ['updatedBy', 'user-id'],
  ])('refuse le champ non autorisé "%s"', (field, value) => {
    const result = userIdentityInputSchema.safeParse({
      ...validPayload,
      [field]: value,
    });

    expect(result.success).toBe(false);
  });
});

describe('updateCurrentUserProfileSchema', () => {
  it('accepte une mise à jour partielle et trim les noms', () => {
    expect(
      updateCurrentUserProfileSchema.parse({
        firstName: '  Greg  ',
      }),
    ).toEqual({ firstName: 'Greg' });
  });

  it('refuse un body vide', () => {
    expect(() => updateCurrentUserProfileSchema.parse({})).toThrow();
  });

  it('refuse email et tout champ sensible inconnu', () => {
    expect(() => updateCurrentUserProfileSchema.parse({
      email: 'new@example.com',
    })).toThrow();

    expect(() => updateCurrentUserProfileSchema.parse({
      firstName: 'Greg',
      platformRole: 'super_admin',
    })).toThrow();
  });
});

describe('requestCurrentUserClosureSchema', () => {
  it('accepte uniquement une confirmation explicite à true', () => {
    expect(requestCurrentUserClosureSchema.parse({
      currentPassword: 'Correct Horse Battery Staple',
      confirmationEmail: 'greg@example.com',
      confirmAccountClosure: true,
    })).toEqual({
      currentPassword: 'Correct Horse Battery Staple',
      confirmationEmail: 'greg@example.com',
      confirmAccountClosure: true,
    });
  });

  it('refuse une confirmation absente ou false', () => {
    expect(() => requestCurrentUserClosureSchema.parse({
      currentPassword: 'Correct Horse Battery Staple',
      confirmationEmail: 'greg@example.com',
    })).toThrow();

    expect(() => requestCurrentUserClosureSchema.parse({
      currentPassword: 'Correct Horse Battery Staple',
      confirmationEmail: 'greg@example.com',
      confirmAccountClosure: false,
    })).toThrow();
  });

  it('refuse une adresse email invalide et les propriétés supplémentaires', () => {
    expect(() => requestCurrentUserClosureSchema.parse({
      currentPassword: 'Correct Horse Battery Staple',
      confirmationEmail: 'invalid-email',
      confirmAccountClosure: true,
    })).toThrow();

    expect(() => requestCurrentUserClosureSchema.parse({
      currentPassword: 'Correct Horse Battery Staple',
      confirmationEmail: 'greg@example.com',
      confirmAccountClosure: true,
      unexpectedField: true,
    })).toThrow();
  });
});
