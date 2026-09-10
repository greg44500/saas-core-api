import { baseApi } from '@/services/api/base-api';
import { useGetCurrentUserPreferencesQuery } from '@/features/preferences/api/user-preferences-api';
import {
  applyPlatformDashboardPreferences,
} from '@/features/platform/lib/platform-dashboard-preferences';

const platformOverviewApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformOverview: builder.query({
      query: ({ from, to } = {}) => ({
        url: '/platform/overview',
        params: {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
      }),
      transformResponse: (response) => response?.data?.overview ?? null,
      providesTags: ['PlatformOverview'],
    }),
  }),
});

const {
  useGetPlatformOverviewQuery: useGetPlatformOverviewQueryBase,
} = platformOverviewApi;

/**
 * Applique les préférences d'affichage après la projection d'autorisation
 * renvoyée par le backend. Les données reçues restent celles que l'acteur est
 * autorisé à consulter ; cette couche ne fait que réduire les surfaces visibles.
 */
function useGetPlatformOverviewQuery(args, options) {
  const overviewQuery = useGetPlatformOverviewQueryBase(args, options);
  const preferencesQuery = useGetCurrentUserPreferencesQuery();
  const hiddenWidgetIds = preferencesQuery.data?.dashboard?.hiddenWidgetIds ?? [];

  return {
    ...overviewQuery,
    data: applyPlatformDashboardPreferences(
      overviewQuery.data,
      hiddenWidgetIds,
    ),
  };
}

export { useGetPlatformOverviewQuery };

export { platformOverviewApi };
