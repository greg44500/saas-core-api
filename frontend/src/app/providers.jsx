import { RouterProvider } from 'react-router/dom';

import { appRouter } from '@/app/router';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { PageLoader } from '@/components/shared/page-loader';

function AppProviders({ router = appRouter, themeScope = 'anonymous' }) {
  return (
    <ThemeProvider storageScope={themeScope}>
      <RouterProvider router={router} fallbackElement={<PageLoader />} />
    </ThemeProvider>
  );
}

export { AppProviders };
