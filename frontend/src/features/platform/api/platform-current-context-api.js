import { baseApi } from '@/services/api/base-api';

const CURRENT_PLATFORM_CONTEXT_TAG = {
  type: 'CurrentPlatformContext',
  id: 'CURRENT',
};

const platformCurrentContextApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentPlatformContext: builder.query({
      query: () => '/platform/me',
      transformResponse: (response) => response?.data?.platformAccess ?? null,
      providesTags: [CURRENT_PLATFORM_CONTEXT_TAG],
    }),
  }),
});

export const {
  useGetCurrentPlatformContextQuery,
  useLazyGetCurrentPlatformContextQuery,
} = platformCurrentContextApi;

export {
  CURRENT_PLATFORM_CONTEXT_TAG,
  platformCurrentContextApi,
};
