import {
  AuthenticatedUserIdentity,
  getUserDisplayName,
} from '@/features/auth/components/authenticated-user-identity';

function WorkspaceUserIdentity({ planName }) {
  return (
    <AuthenticatedUserIdentity
      secondaryText={planName ? `Plan ${planName}` : undefined}
    />
  );
}

export { WorkspaceUserIdentity, getUserDisplayName };
