import { expect, test } from '@playwright/test';

import { registerAndLogin } from '../support/auth.js';

test('utilisateur met à jour son profil et les données persistent après rechargement', async ({ page }) => {
  await registerAndLogin(page);

  await page.goto('/account/profile');

  await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();

  await page.getByLabel('Prénom').fill('Alicia');
  await page.getByLabel('Nom', { exact: true }).fill('Profil E2E');
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(page.getByText('Profil mis à jour', { exact: true })).toBeVisible();

  // Le reload garantit que les valeurs relues viennent du backend et non du seul état du formulaire.
  await page.reload();
  await expect(page.getByLabel('Prénom')).toHaveValue('Alicia');
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Profil E2E');
});
