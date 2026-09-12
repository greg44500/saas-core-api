import { beforeEach, describe, expect, it } from 'vitest';

import {
  createValidatedTemporaryTokenVault,
} from '@/lib/temporary-token-vault';

const TOKEN = 'a'.repeat(64);
const tokenSchema = {
  safeParse(value) {
    return /^[a-f\d]{64}$/i.test(value)
      ? { success: true, data: value }
      : { success: false };
  },
};


describe('createValidatedTemporaryTokenVault', () => {
  let vault;

  beforeEach(() => {
    vault = createValidatedTemporaryTokenVault(tokenSchema);
  });

  it('capture un token valide depuis le fragment', () => {
    expect(vault.capture(`#token=${TOKEN}`)).toBe(TOKEN);
  });

  it('conserve uniquement en mémoire le token pendant une navigation interne', () => {
    vault.capture(`#token=${TOKEN}`);

    expect(vault.capture('')).toBe(TOKEN);
  });

  it('efface une ancienne valeur si un nouveau fragment est invalide', () => {
    vault.capture(`#token=${TOKEN}`);

    expect(vault.capture('#token=invalide')).toBeNull();
    expect(vault.capture('')).toBeNull();
  });
});
