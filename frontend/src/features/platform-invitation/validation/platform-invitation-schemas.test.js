import { describe, expect, it } from 'vitest';

import {
  platformInvitationNewAccountSchema,
  platformInvitationTokenSchema,
} from '@/features/platform-invitation/validation/platform-invitation-schemas';

describe('platformInvitationTokenSchema', () => {
  it('accepte uniquement un token hexadécimal de 64 caractères', () => {
    expect(platformInvitationTokenSchema.safeParse('a'.repeat(64)).success).toBe(true);
    expect(platformInvitationTokenSchema.safeParse('a'.repeat(63)).success).toBe(false);
    expect(platformInvitationTokenSchema.safeParse('z'.repeat(64)).success).toBe(false);
  });
});

describe('platformInvitationNewAccountSchema', () => {
  it('exige un mot de passe conforme et une confirmation identique', () => {
    expect(platformInvitationNewAccountSchema.safeParse({
      password: 'mot-de-passe-tres-securise',
      confirmPassword: 'mot-de-passe-tres-securise',
    }).success).toBe(true);

    expect(platformInvitationNewAccountSchema.safeParse({
      password: 'mot-de-passe-tres-securise',
      confirmPassword: 'autre-mot-de-passe-securise',
    }).success).toBe(false);
  });
});
