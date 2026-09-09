import '@fontsource-variable/geist';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from '@/app/providers';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
