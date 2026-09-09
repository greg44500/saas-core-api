import { baseApi } from '@/services/api/base-api';

const userPreferencesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCurrentUserPreferences: build.query({
      query: () => '/users/me/preferences',
      transformResponse: (response) => response?.data?.preferences ?? null,
      providesTags: ['CurrentUserPreferences'],
    }),
    updateCurrentUserPreferences: build.mutation({
      query: (payload) => ({
        url: '/users/me/preferences',
        method: 'PATCH',
        body: payload,
      }),
      transformResponse: (response) => response?.data?.preferences ?? null,
      async onQueryStarted(_payload, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(
            userPreferencesApi.util.updateQueryData(
              'getCurrentUserPreferences',
              undefined,
              (draft) => {
                if (!draft || !data) return;
                Object.assign(draft, data);
              },
            ),
          );
        } catch {
          // Le composant appelant reste responsable du message d'échec.
        }
      },
    }),
  }),
});

export const {
  useGetCurrentUserPreferencesQuery,
  useUpdateCurrentUserPreferencesMutation,
} = userPreferencesApi;

export { userPreferencesApi };
