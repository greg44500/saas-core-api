import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { useTheme } from '@/components/shared/theme-provider';
import { selectAuthStatus } from '@/features/auth/store/auth-slice';
import {
  useGetCurrentUserPreferencesQuery,
} from '@/features/preferences/api/user-preferences-api';

function UserPreferencesBootstrap({ children }) {
  const authStatus = useSelector(selectAuthStatus);
  const {
    applyComfortPreferences,
    restoreLocalPreferences,
  } = useTheme();
  const { data: preferences } = useGetCurrentUserPreferencesQuery(undefined, {
    skip: authStatus !== 'authenticated',
  });

  useEffect(() => {
    if (authStatus === 'authenticated' && preferences?.comfort) {
      applyComfortPreferences(preferences.comfort, { persistLocal: false });
      return;
    }

    if (authStatus === 'unauthenticated') {
      restoreLocalPreferences();
    }
  }, [
    applyComfortPreferences,
    authStatus,
    preferences,
    restoreLocalPreferences,
  ]);

  return children;
}

export { UserPreferencesBootstrap };
