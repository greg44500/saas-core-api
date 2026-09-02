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
    startOrChangeWorkspaceTrial: build.mutation({
      query: ({ workspaceId, planId, billingInterval }) => ({
        url: `/workspaces/${workspaceId}/subscription/trial`,
        method: 'POST',
        body: {
          planId,
          billingInterval,
        },
      }),

      /*
       * Le DTO de mutation n'est pas une vue complète des droits. Invalider la
       * lecture consolidée évite de reconstruire localement entitlement, trial
       * effectif ou fallback vers Free après une transition commerciale.
       */
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceSubscription', id: workspaceId },
      ],
    }),
    endWorkspaceTrialToFree: build.mutation({
      query: ({ workspaceId }) => ({
        url: `/workspaces/${workspaceId}/subscription/trial/end-to-free`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceSubscription', id: workspaceId },
      ],
    }),
  }),
});

export const {
  useEndWorkspaceTrialToFreeMutation,
  useGetWorkspaceSubscriptionQuery,
  useStartOrChangeWorkspaceTrialMutation,
} = subscriptionApi;

export { subscriptionApi };
