import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router/dom';

import { appRouter } from '@/app/router';
import { ThemeProvider } from '@/components/shared/theme-provider';
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
        <SessionBootstrap>
          <RouterProvider router={router} />
        </SessionBootstrap>
      </ThemeProvider>
    </Provider>
  );
}

export { AppProviders };
