import { z } from 'zod';

const workspaceInvitationTokenSchema = z
  .string()
  .regex(/^[a-f\d]{64}$/i, 'Invitation invalide.');

export { workspaceInvitationTokenSchema };
