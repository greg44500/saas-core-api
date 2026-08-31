import { RouterProvider } from 'react-router/dom';

import { appRouter } from '@/app/router';
import { ThemeProvider } from '@/components/shared/theme-provider';

function AppProviders({ router = appRouter, themeScope = 'anonymous' }) {
  return (
    <ThemeProvider storageScope={themeScope}>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export { AppProviders };
