import { waitFor, within } from '@testing-library/react';

/**
 * Retourne le toast applicatif visible qui contient le texte attendu.
 *
 * Base UI maintient sa propre couche d'annonce accessible. Les tests métier
 * doivent donc cibler notre surface applicative (`data-slot="toast"`) plutôt
 * que les rôles ou live regions internes de la primitive.
 */
async function findToastByText(text, queryOptions) {
  return waitFor(() => {
    const toast = Array.from(
      document.querySelectorAll('[data-slot="toast"]'),
    ).find((element) => within(element).queryByText(text, queryOptions));

    if (!toast) {
      throw new Error(
        `Aucun toast visible ne contient le texte attendu : ${String(text)}`,
      );
    }

    return toast;
  });
}

export { findToastByText };
