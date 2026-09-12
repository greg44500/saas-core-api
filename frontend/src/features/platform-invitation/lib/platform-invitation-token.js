import {
  platformInvitationTokenSchema,
} from '@/features/platform-invitation/validation/platform-invitation-schemas';
import {
  createValidatedTemporaryTokenVault,
} from '@/lib/temporary-token-vault';

const platformInvitationTokenVault =
  createValidatedTemporaryTokenVault(platformInvitationTokenSchema);

function getPlatformInvitationTokenFromHash(hash) {
  return platformInvitationTokenVault.capture(hash);
}

function clearPlatformInvitationTokenInMemory() {
  platformInvitationTokenVault.clear();
}

export {
  clearPlatformInvitationTokenInMemory,
  getPlatformInvitationTokenFromHash,
};
