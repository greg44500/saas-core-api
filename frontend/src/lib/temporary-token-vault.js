function getTokenFromHash(hash) {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;

  return new URLSearchParams(fragment).get('token');
}

/**
 * Crée un vault runtime pour un secret temporaire validé.
 *
 * Un fragment explicite remplace toujours la valeur précédente, y compris
 * lorsqu'il est invalide. En revanche, un hash vide permet de retrouver le
 * secret déjà capturé après une navigation interne, par exemple via /login.
 * Rien n'est persisté dans Redux, history.state ou un stockage navigateur.
 *
 * @param {object} schema Schéma exposant safeParse(value).
 * @returns {{capture: (hash: string) => string|null, clear: () => void}}
 */
function createValidatedTemporaryTokenVault(schema) {
  if (!schema || typeof schema.safeParse !== 'function') {
    throw new TypeError('schema.safeParse is required to create a temporary token vault');
  }

  let tokenInMemory = null;

  return Object.freeze({
    capture(hash = '') {
      if (!hash) {
        return tokenInMemory;
      }

      const tokenFromFragment = getTokenFromHash(hash);
      const result = schema.safeParse(tokenFromFragment ?? '');

      tokenInMemory = result.success
        ? result.data
        : null;

      return tokenInMemory;
    },

    clear() {
      tokenInMemory = null;
    },
  });
}

export {
  createValidatedTemporaryTokenVault,
  getTokenFromHash,
};
