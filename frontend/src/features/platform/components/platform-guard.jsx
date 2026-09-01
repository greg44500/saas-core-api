import { Navigate, Outlet } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import { useGetCurrentUserQuery } from '@/features/auth/api/auth-api';
import { PLATFORM_ROLE } from '@/features/platform/constants/platform-roles';

function PlatformGuard() {
  const {
    data: user,
    error,
    isLoading,
    isFetching,
  } = useGetCurrentUserQuery();

  if (isLoading || (isFetching && !user)) {
    return <PageLoader />;
  }

  if (error || !user || user.platformRole !== PLATFORM_ROLE.SUPER_ADMIN) {
    return <Navigate to="/workspaces" replace />;
  }

  return <Outlet />;
}

export { PlatformGuard };
