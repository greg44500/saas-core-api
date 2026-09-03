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

export const {
  useGetPlatformOverviewQuery,
} = platformOverviewApi;
