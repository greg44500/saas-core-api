import { expect, test } from '@playwright/test';

import { registerAndLogin } from '../support/auth.js';
import { createFirstWorkspaceAndOpenDashboard } from '../support/workspace.js';

test('déconnexion révoque la session et protège le dashboard après rechargement', async ({ page }) => {
  await registerAndLogin(page);
  const { dashboardUrl } = await createFirstWorkspaceAndOpenDashboard(page);

  await page.getByRole('button', { name: 'Déconnexion' }).click();

  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await page.reload();
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);

  // Une navigation directe après logout force un nouveau bootstrap de session.
  // Le dashboard doit rester inaccessible si le refresh token a bien été révoqué.
  await page.goto(dashboardUrl);

  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(
    page.getByRole('button', { name: 'Se connecter' }),
  ).toBeVisible();
});
