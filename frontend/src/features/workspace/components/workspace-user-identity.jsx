import {
  AuthenticatedUserIdentity,
  getUserDisplayName,
} from '@/features/auth/components/authenticated-user-identity';

function WorkspaceUserIdentity({ actions = null, planName }) {
  return (
    <AuthenticatedUserIdentity
      actions={actions}
      secondaryText={planName ? `Plan ${planName}` : undefined}
    />
  );
}

export { WorkspaceUserIdentity, getUserDisplayName };
