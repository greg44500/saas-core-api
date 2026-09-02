import { baseApi } from '@/services/api/base-api';

const invalidateWorkspaceSubscription = (workspaceId) => [
  { type: 'WorkspaceSubscription', id: workspaceId },
];

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
       * Les DTO de mutation ne sont pas des vues complètes des droits. Un
       * refetch serveur évite de reconstruire localement entitlement, fallback,
       * remédiation ou changement programmé après une transition commerciale.
       */
      invalidatesTags: (_result, _error, { workspaceId }) => (
        invalidateWorkspaceSubscription(workspaceId)
      ),
    }),
    endWorkspaceTrialToFree: build.mutation({
      query: ({ workspaceId }) => ({
        url: `/workspaces/${workspaceId}/subscription/trial/end-to-free`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => (
        invalidateWorkspaceSubscription(workspaceId)
      ),
    }),
    scheduleWorkspaceCancellation: build.mutation({
      query: ({ workspaceId, subscriptionId, reason }) => ({
        url: `/workspaces/${workspaceId}/subscription/${subscriptionId}/cancellation`,
        method: 'POST',
        body: reason ? { reason } : {},
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => (
        invalidateWorkspaceSubscription(workspaceId)
      ),
    }),
    revokeWorkspaceCancellation: build.mutation({
      query: ({ workspaceId, subscriptionId }) => ({
        url: `/workspaces/${workspaceId}/subscription/${subscriptionId}/cancellation`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => (
        invalidateWorkspaceSubscription(workspaceId)
      ),
    }),
    scheduleWorkspaceDowngrade: build.mutation({
      query: ({ workspaceId, subscriptionId, targetPlanId }) => ({
        url: `/workspaces/${workspaceId}/subscription/${subscriptionId}/downgrade`,
        method: 'POST',
        body: { targetPlanId },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => (
        invalidateWorkspaceSubscription(workspaceId)
      ),
    }),
    revokeWorkspaceDowngrade: build.mutation({
      query: ({ workspaceId, subscriptionId }) => ({
        url: `/workspaces/${workspaceId}/subscription/${subscriptionId}/downgrade`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => (
        invalidateWorkspaceSubscription(workspaceId)
      ),
    }),
  }),
});

export const {
  useEndWorkspaceTrialToFreeMutation,
  useGetWorkspaceSubscriptionQuery,
  useRevokeWorkspaceCancellationMutation,
  useRevokeWorkspaceDowngradeMutation,
  useScheduleWorkspaceCancellationMutation,
  useScheduleWorkspaceDowngradeMutation,
  useStartOrChangeWorkspaceTrialMutation,
} = subscriptionApi;

export { subscriptionApi };
