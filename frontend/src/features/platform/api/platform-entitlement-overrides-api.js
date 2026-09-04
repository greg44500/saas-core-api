import { baseApi } from '@/services/api/base-api';

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

const platformEntitlementOverridesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPlatformEntitlementOverrides: builder.query({
      query: ({
        page = 1,
        limit = 20,
        workspaceId,
        targetType,
        source,
      } = {}) => ({
        url: '/platform/entitlement-overrides',
        params: compactParams({
          page,
          limit,
          workspaceId,
          targetType,
          source,
        }),
      }),
      transformResponse: (response) => ({
        overrides: response?.data?.overrides ?? [],
        pagination: response?.meta ?? {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }),
      providesTags: (result) => [
        { type: 'PlatformEntitlementOverrides', id: 'LIST' },
        ...(result?.overrides ?? []).map((override) => ({
          type: 'PlatformEntitlementOverrides',
          id: override.id,
        })),
      ],
    }),

    getPlatformEntitlementOverride: builder.query({
      query: (overrideId) => `/platform/entitlement-overrides/${overrideId}`,
      transformResponse: (response) => response?.data?.override ?? null,
      providesTags: (_result, _error, overrideId) => [
        { type: 'PlatformEntitlementOverrides', id: overrideId },
      ],
    }),

    createPlatformEntitlementOverride: builder.mutation({
      query: (body) => ({
        url: '/platform/entitlement-overrides',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'PlatformEntitlementOverrides', id: 'LIST' },
        'PlatformOverview',
        'WorkspaceSubscription',
      ],
    }),

    updatePlatformEntitlementOverride: builder.mutation({
      query: ({ overrideId, ...body }) => ({
        url: `/platform/entitlement-overrides/${overrideId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { overrideId }) => [
        { type: 'PlatformEntitlementOverrides', id: 'LIST' },
        { type: 'PlatformEntitlementOverrides', id: overrideId },
        'PlatformOverview',
        'WorkspaceSubscription',
      ],
    }),

    revokePlatformEntitlementOverride: builder.mutation({
      query: ({ overrideId, reason }) => ({
        url: `/platform/entitlement-overrides/${overrideId}/revoke`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { overrideId }) => [
        { type: 'PlatformEntitlementOverrides', id: 'LIST' },
        { type: 'PlatformEntitlementOverrides', id: overrideId },
        'PlatformOverview',
        'WorkspaceSubscription',
      ],
    }),
  }),
});

export const {
  useCreatePlatformEntitlementOverrideMutation,
  useGetPlatformEntitlementOverrideQuery,
  useListPlatformEntitlementOverridesQuery,
  useRevokePlatformEntitlementOverrideMutation,
  useUpdatePlatformEntitlementOverrideMutation,
} = platformEntitlementOverridesApi;
