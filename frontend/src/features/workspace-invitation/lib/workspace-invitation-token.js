import {
  workspaceInvitationTokenSchema,
} from '@/features/workspace-invitation/validation/workspace-invitation-schemas';
import {
  createValidatedTemporaryTokenVault,
} from '@/lib/temporary-token-vault';

const workspaceInvitationTokenVault =
  createValidatedTemporaryTokenVault(workspaceInvitationTokenSchema);

function getWorkspaceInvitationTokenFromHash(hash) {
  return workspaceInvitationTokenVault.capture(hash);
}

function clearWorkspaceInvitationTokenInMemory() {
  workspaceInvitationTokenVault.clear();
}

export {
  clearWorkspaceInvitationTokenInMemory,
  getWorkspaceInvitationTokenFromHash,
};
