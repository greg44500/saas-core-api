import { expect, test } from '@playwright/test';

import { registerAndLogin } from '../support/auth.js';

test('inscription, connexion et restauration de session après rechargement', async ({ page }) => {
  await registerAndLogin(page);

  // Le reload efface l'access token en mémoire. Rester authentifié valide donc
  // le refresh token HttpOnly et le bootstrap de session de bout en bout.
  await page.reload();

  await expect(page).toHaveURL(/\/onboarding\/workspace$/);
  await expect(
    page.getByRole('heading', { name: 'Créez votre workspace' }),
  ).toBeVisible();
});
