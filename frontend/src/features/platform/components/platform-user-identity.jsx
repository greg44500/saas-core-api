import { AuthenticatedUserIdentity } from '@/features/auth/components/authenticated-user-identity';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';

function getPlatformIdentitySecondaryText(platformAccess) {
  const roleName = platformAccess?.role?.name?.trim() || null;

  if (platformAccess?.isFounder === true) {
    return roleName ? `Fondateur · ${roleName}` : 'Fondateur';
  }

  return roleName ?? 'Équipe Platform';
}

function PlatformUserIdentity() {
  const { data: platformAccess } = useGetCurrentPlatformContextQuery();

  return (
    <AuthenticatedUserIdentity
      secondaryText={getPlatformIdentitySecondaryText(platformAccess)}
    />
  );
}

export { PlatformUserIdentity, getPlatformIdentitySecondaryText };
