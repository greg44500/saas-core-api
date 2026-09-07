import { Navigate, Outlet, useLocation } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import {
  canAccessPlatformPath,
  getFirstPlatformDestination,
  hasActivePlatformAccess,
} from '@/features/platform/lib/platform-navigation';

function PlatformGuard() {
  const location = useLocation();
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

  if (!canAccessPlatformPath(location.pathname, platformAccess)) {
    return (
      <Navigate
        replace
        to={getFirstPlatformDestination(platformAccess) ?? '/workspaces'}
      />
    );
  }

  return <Outlet />;
}

export {
  PlatformGuard,
  canAccessPlatformPath,
  getFirstPlatformDestination,
  hasActivePlatformAccess,
};
