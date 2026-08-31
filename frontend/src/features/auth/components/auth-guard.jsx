import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';

function AuthGuard() {
  const authStatus = useSelector((state) => state.auth.authStatus);
  const location = useLocation();

  if (authStatus === 'checking') {
    return <PageLoader />;
  }

  if (authStatus !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function GuestGuard() {
  const authStatus = useSelector((state) => state.auth.authStatus);

  if (authStatus === 'checking') {
    return <PageLoader />;
  }

  if (authStatus === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export { AuthGuard, GuestGuard };
