import { describe, expect, it } from 'vitest';

import { workspaceInvitationTokenSchema } from '@/features/workspace-invitation/validation/workspace-invitation-schemas';

describe('workspaceInvitationTokenSchema', () => {
  it('accepte un token hexadécimal de 64 caractères', () => {
    expect(workspaceInvitationTokenSchema.safeParse('a'.repeat(64)).success).toBe(true);
  });

  it('refuse un token de forme invalide', () => {
    expect(workspaceInvitationTokenSchema.safeParse('token-invalide').success).toBe(false);
  });
});
