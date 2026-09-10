import { describe, expect, it } from 'vitest';

import {
  workspaceInvitationNewAccountSchema,
  workspaceInvitationTokenSchema,
} from '@/features/workspace-invitation/validation/workspace-invitation-schemas';

describe('workspaceInvitationTokenSchema', () => {
  it('accepte un token hexadécimal de 64 caractères', () => {
    expect(workspaceInvitationTokenSchema.safeParse('a'.repeat(64)).success).toBe(true);
  });

  it('refuse un token de forme invalide', () => {
    expect(workspaceInvitationTokenSchema.safeParse('token-invalide').success).toBe(false);
  });
});

describe('workspaceInvitationNewAccountSchema', () => {
  it('exige le profil minimal, la confirmation et l’acceptation juridique', () => {
    expect(workspaceInvitationNewAccountSchema.safeParse({
      firstName: 'Marie',
      lastName: 'Martin',
      password: 'Phrase unique pour workspace 47!',
      confirmPassword: 'Phrase unique pour workspace 47!',
      legalAccepted: true,
    }).success).toBe(true);

    expect(workspaceInvitationNewAccountSchema.safeParse({
      firstName: 'Marie',
      lastName: 'Martin',
      password: 'Phrase unique pour workspace 47!',
      confirmPassword: 'Autre phrase pour workspace 83!',
      legalAccepted: true,
    }).success).toBe(false);

    expect(workspaceInvitationNewAccountSchema.safeParse({
      firstName: 'Marie',
      lastName: 'Martin',
      password: 'Phrase unique pour workspace 47!',
      confirmPassword: 'Phrase unique pour workspace 47!',
      legalAccepted: false,
    }).success).toBe(false);
  });
});
