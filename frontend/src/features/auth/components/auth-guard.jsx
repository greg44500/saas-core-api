import { useRef } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import { useGetCurrentUserQuery } from '@/features/auth/api/auth-api';
import {
  PLATFORM_HOME,
  getAuthenticatedHome,
  isPlatformSuperAdmin,
  isWorkspaceClientPath,
} from '@/features/auth/lib/authenticated-destination';

function AuthGuard() {
  const authStatus = useSelector((state) => state.auth.authStatus);
  const location = useLocation();
  const initialContextResolvedRef = useRef(false);
  const shouldResolveWorkspaceColdStart = (
    authStatus === 'authenticated'
    && !initialContextResolvedRef.current
    && isWorkspaceClientPath(location.pathname)
  );
  const {
    data: currentUser,
    error: currentUserError,
    isLoading: isCurrentUserLoading,
    isFetching: isCurrentUserFetching,
  } = useGetCurrentUserQuery(undefined, {
    skip: !shouldResolveWorkspaceColdStart,
  });

  if (authStatus === 'checking') {
    return <PageLoader />;
  }

  if (authStatus !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (shouldResolveWorkspaceColdStart) {
    if (isCurrentUserLoading || (isCurrentUserFetching && !currentUser)) {
      return <PageLoader />;
    }

    // Le contrôle est volontairement effectué une seule fois pendant la vie de
    // l'application. Un super-admin démarre dans Platform après restauration de
    // session, mais peut ensuite ouvrir explicitement un Workspace sans être
    // systématiquement renvoyé vers la console.
    initialContextResolvedRef.current = true;

    if (!currentUserError && isPlatformSuperAdmin(currentUser)) {
      return <Navigate to={PLATFORM_HOME} replace />;
    }
  } else if (!initialContextResolvedRef.current) {
    initialContextResolvedRef.current = true;
  }

  return <Outlet />;
}

function GuestGuard() {
  const authStatus = useSelector((state) => state.auth.authStatus);
  const {
    data: currentUser,
    error: currentUserError,
    isLoading: isCurrentUserLoading,
    isFetching: isCurrentUserFetching,
  } = useGetCurrentUserQuery(undefined, {
    skip: authStatus !== 'authenticated',
  });

  if (authStatus === 'checking') {
    return <PageLoader />;
  }

  if (authStatus === 'authenticated') {
    if (isCurrentUserLoading || (isCurrentUserFetching && !currentUser)) {
      return <PageLoader />;
    }

    return (
      <Navigate
        to={currentUserError ? '/workspaces' : getAuthenticatedHome(currentUser)}
        replace
      />
    );
  }

  return <Outlet />;
}

export { AuthGuard, GuestGuard };
