import { Navigate, Outlet } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import { hasActivePlatformAccess } from '@/features/platform/lib/platform-navigation';

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
