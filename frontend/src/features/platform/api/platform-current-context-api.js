import { baseApi } from '@/services/api/base-api';

const platformCurrentContextApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentPlatformContext: builder.query({
      query: () => '/platform/me',
      transformResponse: (response) => response?.data?.platformAccess ?? null,
    }),
  }),
});

export const {
  useGetCurrentPlatformContextQuery,
} = platformCurrentContextApi;

export { platformCurrentContextApi };
