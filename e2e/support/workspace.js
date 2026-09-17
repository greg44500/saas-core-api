import { randomUUID } from 'node:crypto';

import { expect } from '@playwright/test';

async function createFirstWorkspaceAndOpenDashboard(page) {
  const workspaceName = `Workspace E2E ${randomUUID().slice(0, 8)}`;

  await page.getByLabel('Nom du workspace').fill(workspaceName);
  await page.getByRole('button', { name: 'Créer mon espace' }).click();

  await expect(
    page.getByRole('heading', { name: `${workspaceName} est prêt` }),
  ).toBeVisible();
  await expect(page.getByText('Plan actuel : Free', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Accéder à mon espace' }).click();

  await expect(page).toHaveURL(/\/workspaces\/[^/]+\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: 'Tableau de bord' }),
  ).toBeVisible();

  return {
    dashboardUrl: page.url(),
    workspaceName,
  };
}

export { createFirstWorkspaceAndOpenDashboard };
