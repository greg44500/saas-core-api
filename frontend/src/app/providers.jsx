import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router/dom';

import { appRouter } from '@/app/router';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { ToastProvider } from '@/components/shared/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SessionBootstrap } from '@/features/auth/components/session-bootstrap';
import {
  UserPreferencesBootstrap,
} from '@/features/preferences/components/user-preferences-bootstrap';
import { appStore } from '@/store/store';

function AppProviders({
  router = appRouter,
  store = appStore,
  themeScope = 'anonymous',
}) {
  return (
    <Provider store={store}>
      <ThemeProvider storageScope={themeScope}>
        <TooltipProvider>
          <ToastProvider>
            <SessionBootstrap>
              <UserPreferencesBootstrap>
                <RouterProvider router={router} />
              </UserPreferencesBootstrap>
            </SessionBootstrap>
          </ToastProvider>
        </TooltipProvider>
      </ThemeProvider>
    </Provider>
  );
}

export { AppProviders };
