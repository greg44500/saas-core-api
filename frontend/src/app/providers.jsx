import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router/dom';

import { appRouter } from '@/app/router';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { ToastProvider } from '@/components/shared/toast-provider';
import { SessionBootstrap } from '@/features/auth/components/session-bootstrap';
import { appStore } from '@/store/store';

function AppProviders({
  router = appRouter,
  store = appStore,
  themeScope = 'anonymous',
}) {
  return (
    <Provider store={store}>
      <ThemeProvider storageScope={themeScope}>
        <ToastProvider>
          <SessionBootstrap>
            <RouterProvider router={router} />
          </SessionBootstrap>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

export { AppProviders };
