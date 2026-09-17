import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import {
  E2E_BACKEND_ORIGIN,
  E2E_FRONTEND_ORIGIN,
  getE2eBackendEnvironment,
} from './support/environment.js';

const e2eDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(e2eDirectory, '..');
const frontendDirectory = path.join(repositoryRoot, 'frontend');
const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: isCi,
  reporter: isCi
    ? [['line'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL: E2E_FRONTEND_ORIGIN,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      name: 'backend',
      command: 'npm run start',
      cwd: repositoryRoot,
      env: getE2eBackendEnvironment(),
      url: `${E2E_BACKEND_ORIGIN}/api/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      name: 'frontend',
      command: 'npm run dev -- --host 127.0.0.1 --port 5174',
      cwd: frontendDirectory,
      env: {
        VITE_API_PROXY_TARGET: E2E_BACKEND_ORIGIN,
      },
      url: E2E_FRONTEND_ORIGIN,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
