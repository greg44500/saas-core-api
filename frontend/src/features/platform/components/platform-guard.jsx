import { Navigate, Outlet } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';

function hasActivePlatformAccess(platformAccess) {
  return platformAccess?.status === 'active'
    && Array.isArray(platformAccess.permissions)
    && platformAccess.permissions.length > 0;
}

function PlatformGuard() {
  const {
    data: platformAccess,
    error,
    isLoading,
    isFetching,
  } = useGetCurrentPlatformContextQuery();

  if (isLoading || (isFetching && platformAccess === undefined)) {
    return <PageLoader />;
  }

  if (error || !hasActivePlatformAccess(platformAccess)) {
    return <Navigate to="/workspaces" replace />;
  }

  return <Outlet />;
}

export { PlatformGuard, hasActivePlatformAccess };
