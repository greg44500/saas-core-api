import { baseApi } from '@/services/api/base-api';

const platformWorkspacesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPlatformWorkspaces: builder.query({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/platform/workspaces',
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        workspaces: response?.data?.workspaces ?? [],
        pagination: response?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
      providesTags: (result) => [
        { type: 'PlatformWorkspaces', id: 'LIST' },
        ...(result?.workspaces ?? []).map((workspace) => ({
          type: 'PlatformWorkspaces',
          id: workspace.id,
        })),
      ],
    }),
    getPlatformWorkspace: builder.query({
      query: (workspaceId) => `/platform/workspaces/${workspaceId}`,
      transformResponse: (response) => response?.data?.workspace ?? null,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'PlatformWorkspaces', id: workspaceId },
      ],
    }),
    suspendPlatformWorkspace: builder.mutation({
      query: ({ workspaceId, statusReason, statusReasonDetails }) => ({
        url: `/platform/workspaces/${workspaceId}/suspend`,
        method: 'PATCH',
        body: {
          statusReason,
          ...(statusReasonDetails ? { statusReasonDetails } : {}),
        },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'PlatformWorkspaces', id: 'LIST' },
        { type: 'PlatformWorkspaces', id: workspaceId },
      ],
    }),
    reactivatePlatformWorkspace: builder.mutation({
      query: (workspaceId) => ({
        url: `/platform/workspaces/${workspaceId}/reactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, workspaceId) => [
        { type: 'PlatformWorkspaces', id: 'LIST' },
        { type: 'PlatformWorkspaces', id: workspaceId },
      ],
    }),
  }),
});

const {
  useGetPlatformWorkspaceQuery,
  useListPlatformWorkspacesQuery,
  useReactivatePlatformWorkspaceMutation,
  useSuspendPlatformWorkspaceMutation,
} = platformWorkspacesApi;

export {
  useGetPlatformWorkspaceQuery,
  useListPlatformWorkspacesQuery,
  useReactivatePlatformWorkspaceMutation,
  useSuspendPlatformWorkspaceMutation,
};
