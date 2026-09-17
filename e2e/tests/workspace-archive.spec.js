import { expect, test } from '@playwright/test';

import { registerAndLogin } from '../support/auth.js';
import { createFirstWorkspaceAndOpenDashboard } from '../support/workspace.js';

test('owner archive son workspace jetable et il sort des espaces utilisables', async ({ page }) => {
  const identity = await registerAndLogin(page);
  const { dashboardUrl, workspaceName } = await createFirstWorkspaceAndOpenDashboard(page);
  const settingsUrl = dashboardUrl.replace(/\/dashboard$/, '/settings');

  await page.goto(settingsUrl);
  await expect(
    page.getByRole('heading', { name: 'Paramètres du workspace' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Archiver ce workspace' }).click();

  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Confirmer l’archivage du workspace' }),
  ).toBeVisible();

  await dialog.getByLabel('Nom du workspace').fill(workspaceName);
  await dialog.getByLabel('Mot de passe actuel').fill(identity.password);
  await dialog
    .getByRole('button', { name: 'Archiver définitivement ce workspace' })
    .click();

  // Comme ce compte jetable ne possédait qu'un seul workspace, la liste
  // utilisable devient vide et l'application revient vers l'onboarding.
  await expect(page).toHaveURL(/\/onboarding\/workspace$/);
  await expect(
    page.getByRole('heading', { name: 'Créez votre workspace' }),
  ).toBeVisible();
});
