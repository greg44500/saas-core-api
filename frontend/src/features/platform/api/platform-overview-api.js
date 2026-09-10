import { useDashboardDisplayPreview } from '@/components/shared/dashboard-display-preview-context';
import { useGetCurrentUserPreferencesQuery } from '@/features/preferences/api/user-preferences-api';
import {
  applyPlatformDashboardPreferences,
} from '@/features/platform/lib/platform-dashboard-preferences';
import { baseApi } from '@/services/api/base-api';

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
 * renvoyée par le backend. Le preview reste local et n'élargit jamais les
 * données reçues : il ne peut que réduire temporairement les surfaces visibles.
 */
function useGetPlatformOverviewQuery(args, options) {
  const overviewQuery = useGetPlatformOverviewQueryBase(args, options);
  const preferencesQuery = useGetCurrentUserPreferencesQuery();
  const { previewHiddenWidgetIds } = useDashboardDisplayPreview();
  const preferencesResolved = preferencesQuery.data !== undefined
    || preferencesQuery.isError;
  const savedHiddenWidgetIds = preferencesQuery.data?.dashboard?.hiddenWidgetIds ?? [];
  const effectiveHiddenWidgetIds = previewHiddenWidgetIds ?? savedHiddenWidgetIds;

  return {
    ...overviewQuery,
    data: preferencesResolved
      ? applyPlatformDashboardPreferences(
        overviewQuery.data,
        effectiveHiddenWidgetIds,
      )
      : undefined,
    isLoading: overviewQuery.isLoading || !preferencesResolved,
    isFetching: overviewQuery.isFetching || (!preferencesResolved && preferencesQuery.isFetching),
  };
}

export { useGetPlatformOverviewQuery };

export { platformOverviewApi };
