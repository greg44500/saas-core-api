import { useState } from 'react';

import { DEFAULT_DATA_PAGE_SIZE } from '@/components/data-display/data-pagination-config';

/**
 * Centralise l'état local des listes paginées sans déplacer la donnée serveur
 * dans Redux. La page reste un état d'interface local ; RTK Query reste
 * responsable du cache et des données récupérées depuis l'API.
 *
 * Le retour à la première page lors d'un changement de taille évite de
 * conserver un numéro de page devenu invalide après recalcul côté serveur.
 */
function useDataPagination({
  initialPage = 1,
  initialPageSize = DEFAULT_DATA_PAGE_SIZE,
} = {}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  function changePageSize(nextPageSize) {
    setPage(1);
    setPageSize(nextPageSize);
  }

  return {
    page,
    pageSize,
    setPage,
    setPageSize: changePageSize,
  };
}

export { useDataPagination };
