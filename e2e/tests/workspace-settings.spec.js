import { expect, test } from '@playwright/test';

import { registerAndLogin } from '../support/auth.js';
import { createFirstWorkspaceAndOpenDashboard } from '../support/workspace.js';

test('owner renomme son workspace et la modification persiste après rechargement', async ({ page }) => {
  await registerAndLogin(page);
  const { dashboardUrl, workspaceName } = await createFirstWorkspaceAndOpenDashboard(page);
  const updatedWorkspaceName = `${workspaceName} Renommé`;
  const settingsUrl = dashboardUrl.replace(/\/dashboard$/, '/settings');

  await page.goto(settingsUrl);

  await expect(
    page.getByRole('heading', { name: 'Paramètres du workspace' }),
  ).toBeVisible();

  await page.getByLabel('Nom du workspace').fill(updatedWorkspaceName);
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(
    page.getByText('Nom du workspace mis à jour', { exact: true }),
  ).toBeVisible();

  // Le reload garantit que le nom relu vient du backend et non du seul état UI.
  await page.reload();
  await expect(page.getByLabel('Nom du workspace')).toHaveValue(updatedWorkspaceName);
});
