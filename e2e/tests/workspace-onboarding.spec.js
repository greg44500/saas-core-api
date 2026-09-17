import { test } from '@playwright/test';

import { registerAndLogin } from '../support/auth.js';
import { createFirstWorkspaceAndOpenDashboard } from '../support/workspace.js';

test('création du premier workspace avec offre Free puis accès au dashboard', async ({ page }) => {
  await registerAndLogin(page);
  await createFirstWorkspaceAndOpenDashboard(page);
});
