import { useEffect, useRef } from 'react';

import { useRefreshSessionMutation } from '@/features/auth/api/auth-api';

function SessionBootstrap({ children }) {
  const [refreshSession] = useRefreshSessionMutation();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    refreshSession();
  }, [refreshSession]);

  return children;
}

export { SessionBootstrap };
