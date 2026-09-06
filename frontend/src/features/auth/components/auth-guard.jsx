import { useRef } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import {
  WORKSPACE_HOME,
  getAuthenticatedHome,
  isWorkspaceClientPath,
} from '@/features/auth/lib/authenticated-destination';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';

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
    data: platformAccess,
    error: platformAccessError,
    isLoading: isPlatformAccessLoading,
    isFetching: isPlatformAccessFetching,
  } = useGetCurrentPlatformContextQuery(undefined, {
    skip: !shouldResolveWorkspaceColdStart,
  });

  if (authStatus === 'checking') {
    return <PageLoader />;
  }

  if (authStatus !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (shouldResolveWorkspaceColdStart) {
    if (
      isPlatformAccessLoading
      || (isPlatformAccessFetching && platformAccess === undefined)
    ) {
      return <PageLoader />;
    }

    // Le contrôle est volontairement effectué une seule fois pendant la vie de
    // l'application. Un membre Platform actif démarre dans sa première section
    // autorisée après restauration de session, mais peut ensuite ouvrir
    // explicitement un Workspace sans redirection systématique.
    initialContextResolvedRef.current = true;

    if (!platformAccessError) {
      const authenticatedHome = getAuthenticatedHome(platformAccess);

      if (authenticatedHome !== WORKSPACE_HOME) {
        return <Navigate to={authenticatedHome} replace />;
      }
    }
  } else if (!initialContextResolvedRef.current) {
    initialContextResolvedRef.current = true;
  }

  return <Outlet />;
}

function GuestGuard() {
  const authStatus = useSelector((state) => state.auth.authStatus);
  const {
    data: platformAccess,
    error: platformAccessError,
    isLoading: isPlatformAccessLoading,
    isFetching: isPlatformAccessFetching,
  } = useGetCurrentPlatformContextQuery(undefined, {
    skip: authStatus !== 'authenticated',
  });

  if (authStatus === 'checking') {
    return <PageLoader />;
  }

  if (authStatus === 'authenticated') {
    if (
      isPlatformAccessLoading
      || (isPlatformAccessFetching && platformAccess === undefined)
    ) {
      return <PageLoader />;
    }

    return (
      <Navigate
        to={platformAccessError
          ? WORKSPACE_HOME
          : getAuthenticatedHome(platformAccess)}
        replace
      />
    );
  }

  return <Outlet />;
}

export { AuthGuard, GuestGuard };
