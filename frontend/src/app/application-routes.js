const APPLICATION_ROUTE_COLLECTION_KEYS = Object.freeze([
  'publicRoutes',
  'authenticatedRoutes',
  'workspaceRoutes',
  'platformRoutes',
]);

/**
 * Compose les routes déclarées par les modules métier réellement installés.
 *
 * Le fichier reste indépendant de React : les modules fournissent simplement
 * des objets de route compatibles avec React Router. Le Core ne découvre aucun
 * fichier automatiquement et ne connaît aucun domaine métier concret.
 */
function composeApplicationFrontendRoutes(modules = []) {
  if (!Array.isArray(modules)) {
    throw new TypeError('modules must be an array');
  }

  const composedRoutes = Object.fromEntries(
    APPLICATION_ROUTE_COLLECTION_KEYS.map((collectionKey) => [collectionKey, []]),
  );

  modules.forEach((moduleDefinition, moduleIndex) => {
    if (
      moduleDefinition === null
      || Array.isArray(moduleDefinition)
      || typeof moduleDefinition !== 'object'
    ) {
      throw new TypeError(
        `Frontend route module at index ${moduleIndex} must be an object`,
      );
    }

    for (const collectionKey of APPLICATION_ROUTE_COLLECTION_KEYS) {
      const moduleRoutes = moduleDefinition[collectionKey] ?? [];

      if (!Array.isArray(moduleRoutes)) {
        throw new TypeError(
          `modules[${moduleIndex}].${collectionKey} must be an array`,
        );
      }

      composedRoutes[collectionKey].push(...moduleRoutes);
    }
  });

  return Object.freeze(
    Object.fromEntries(
      APPLICATION_ROUTE_COLLECTION_KEYS.map((collectionKey) => [
        collectionKey,
        Object.freeze([...composedRoutes[collectionKey]]),
      ]),
    ),
  );
}

/**
 * Point de composition unique des routes frontend du produit dérivé.
 *
 * Exemple de descriptor exporté par un module métier :
 *
 * {
 *   workspaceRoutes: [
 *     {
 *       path: 'catalog',
 *       lazy: async () => {
 *         const { CatalogRoute } = await import(
 *           '@/features/catalog/components/catalog-route'
 *         );
 *         return { Component: CatalogRoute };
 *       },
 *     },
 *   ],
 * }
 */
const APPLICATION_FRONTEND_ROUTE_MODULES = Object.freeze([]);

const APPLICATION_FRONTEND_ROUTES = composeApplicationFrontendRoutes(
  APPLICATION_FRONTEND_ROUTE_MODULES,
);

export {
  APPLICATION_FRONTEND_ROUTE_MODULES,
  APPLICATION_FRONTEND_ROUTES,
  composeApplicationFrontendRoutes,
};
