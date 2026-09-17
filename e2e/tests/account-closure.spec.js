import { expect, test } from '@playwright/test';

import { registerAndLogin } from '../support/auth.js';

test('utilisateur ferme son compte jetable et la session ne peut plus être restaurée', async ({ page }) => {
  const identity = await registerAndLogin(page);

  await page.goto('/account/security');
  await expect(page.getByRole('heading', { name: 'Sécurité' })).toBeVisible();

  await page.getByRole('button', { name: 'Fermer mon compte' }).click();

  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Confirmer la fermeture du compte' }),
  ).toBeVisible();

  await dialog.getByLabel('Adresse email du compte').fill(identity.email);
  await dialog.getByLabel('Mot de passe actuel').fill(identity.password);
  await dialog.getByLabel(/Je comprends que cette fermeture/).check();
  await dialog.getByRole('button', { name: 'Fermer définitivement mon compte' }).click();

  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await page.reload();
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);

  // La navigation protégée force un bootstrap serveur : un compte fermé ne doit
  // pas récupérer une session via l'ancien refresh token.
  await page.goto('/account/security');
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
});
