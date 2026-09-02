import { baseApi } from '@/services/api/base-api';

const subscriptionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWorkspaceSubscription: build.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/subscription`,
      transformResponse: (response) => response?.data?.subscription ?? null,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'WorkspaceSubscription', id: workspaceId },
      ],
    }),
  }),
});

export const { useGetWorkspaceSubscriptionQuery } = subscriptionApi;

export { subscriptionApi };
