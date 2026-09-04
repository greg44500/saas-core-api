import { baseApi } from '@/services/api/base-api';

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

function entitlementContextTag(workspaceId) {
  return workspaceId
    ? { type: 'PlatformEntitlementContext', id: workspaceId }
    : null;
}

function workspaceTag(workspaceId) {
  return workspaceId
    ? { type: 'Workspace', id: workspaceId }
    : null;
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
        lifecycle,
      } = {}) => ({
        url: '/platform/entitlement-overrides',
        params: compactParams({
          page,
          limit,
          workspaceId,
          targetType,
          source,
          lifecycle,
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

    getPlatformEntitlementContext: builder.query({
      query: (workspaceId) =>
        `/platform/entitlement-overrides/workspaces/${workspaceId}/context`,
      transformResponse: (response) => response?.data?.context ?? null,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'PlatformEntitlementContext', id: workspaceId },
      ],
    }),

    createPlatformEntitlementOverride: builder.mutation({
      query: (body) => ({
        url: '/platform/entitlement-overrides',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, body) => [
        { type: 'PlatformEntitlementOverrides', id: 'LIST' },
        entitlementContextTag(body?.workspaceId),
        workspaceTag(body?.workspaceId),
        'PlatformOverview',
        'WorkspaceSubscription',
      ].filter(Boolean),
    }),

    updatePlatformEntitlementOverride: builder.mutation({
      query: ({ overrideId, workspaceId: _workspaceId, ...body }) => ({
        url: `/platform/entitlement-overrides/${overrideId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { overrideId, workspaceId }) => [
        { type: 'PlatformEntitlementOverrides', id: 'LIST' },
        { type: 'PlatformEntitlementOverrides', id: overrideId },
        entitlementContextTag(workspaceId),
        workspaceTag(workspaceId),
        'PlatformOverview',
        'WorkspaceSubscription',
      ].filter(Boolean),
    }),

    revokePlatformEntitlementOverride: builder.mutation({
      query: ({ overrideId, reason, workspaceId: _workspaceId }) => ({
        url: `/platform/entitlement-overrides/${overrideId}/revoke`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { overrideId, workspaceId }) => [
        { type: 'PlatformEntitlementOverrides', id: 'LIST' },
        { type: 'PlatformEntitlementOverrides', id: overrideId },
        entitlementContextTag(workspaceId),
        workspaceTag(workspaceId),
        'PlatformOverview',
        'WorkspaceSubscription',
      ].filter(Boolean),
    }),
  }),
});

export const {
  useCreatePlatformEntitlementOverrideMutation,
  useGetPlatformEntitlementContextQuery,
  useGetPlatformEntitlementOverrideQuery,
  useListPlatformEntitlementOverridesQuery,
  useRevokePlatformEntitlementOverrideMutation,
  useUpdatePlatformEntitlementOverrideMutation,
} = platformEntitlementOverridesApi;
