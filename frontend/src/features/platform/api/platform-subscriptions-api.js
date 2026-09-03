import { baseApi } from '@/services/api/base-api';

const platformSubscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPlatformSubscriptions: builder.query({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/platform/subscriptions',
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        subscriptions: response?.data?.subscriptions ?? [],
        pagination: response?.meta ?? {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }),
      providesTags: (result) => [
        { type: 'PlatformSubscriptions', id: 'LIST' },
        ...(result?.subscriptions ?? []).map((subscription) => ({
          type: 'PlatformSubscriptions',
          id: subscription.id,
        })),
      ],
    }),

    getPlatformSubscription: builder.query({
      query: (subscriptionId) => `/platform/subscriptions/${subscriptionId}`,
      transformResponse: (response) => response?.data?.subscription ?? null,
      providesTags: (result, error, subscriptionId) => [
        { type: 'PlatformSubscriptions', id: subscriptionId },
      ],
    }),

    updatePlatformSubscription: builder.mutation({
      query: ({ subscriptionId, ...body }) => ({
        url: `/platform/subscriptions/${subscriptionId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { subscriptionId }) => [
        { type: 'PlatformSubscriptions', id: 'LIST' },
        { type: 'PlatformSubscriptions', id: subscriptionId },
        'WorkspaceSubscription',
      ],
    }),

    cancelPlatformSubscription: builder.mutation({
      query: ({ subscriptionId, ...body }) => ({
        url: `/platform/subscriptions/${subscriptionId}/cancel`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { subscriptionId }) => [
        { type: 'PlatformSubscriptions', id: 'LIST' },
        { type: 'PlatformSubscriptions', id: subscriptionId },
        'WorkspaceSubscription',
      ],
    }),

    resumePlatformSubscription: builder.mutation({
      query: (subscriptionId) => ({
        url: `/platform/subscriptions/${subscriptionId}/resume`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, subscriptionId) => [
        { type: 'PlatformSubscriptions', id: 'LIST' },
        { type: 'PlatformSubscriptions', id: subscriptionId },
        'WorkspaceSubscription',
      ],
    }),

    grantPlatformSubscriptionTrial: builder.mutation({
      query: (body) => ({
        url: '/platform/subscriptions/grant-trial',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'PlatformSubscriptions', id: 'LIST' },
        'WorkspaceSubscription',
      ],
    }),
  }),
});

export const {
  useCancelPlatformSubscriptionMutation,
  useGetPlatformSubscriptionQuery,
  useGrantPlatformSubscriptionTrialMutation,
  useListPlatformSubscriptionsQuery,
  useResumePlatformSubscriptionMutation,
  useUpdatePlatformSubscriptionMutation,
} = platformSubscriptionsApi;
