import { describe, expect, it } from 'vitest';

import {
  changePasswordFormSchema,
  profileSchema,
} from '@/features/account/validation/account-schemas';

describe('account schemas', () => {
  it('trim les données de profil', () => {
    expect(
      profileSchema.parse({
        firstName: '  Greg  ',
        lastName: '  Martin ',
      }),
    ).toEqual({
      firstName: 'Greg',
      lastName: 'Martin',
    });
  });

  it('refuse un champ de profil inconnu', () => {
    expect(() => profileSchema.parse({
      firstName: 'Greg',
      lastName: 'Martin',
      email: 'greg@example.com',
    })).toThrow();
  });

  it('exige la confirmation du nouveau mot de passe', () => {
    const result = changePasswordFormSchema.safeParse({
      currentPassword: 'mot-de-passe-actuel-long',
      newPassword: 'nouveau-mot-de-passe-long',
      confirmNewPassword: 'confirmation-differente-longue',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['confirmNewPassword']);
  });
});
