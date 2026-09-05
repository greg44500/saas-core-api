import { baseApi } from '@/services/api/base-api';

const workspaceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkspaces: build.query({
      query: () => '/workspaces',
      transformResponse: (response) => response?.data?.workspaces ?? [],
      providesTags: ['WorkspaceList'],
    }),
    getWorkspaceById: build.query({
      query: (workspaceId) => `/workspaces/${workspaceId}`,
      transformResponse: (response) => response?.data ?? null,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'Workspace', id: workspaceId },
      ],
    }),
    createWorkspace: build.mutation({
      query: (payload) => ({
        url: '/workspaces',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response) => response?.data?.workspace ?? null,
      invalidatesTags: ['WorkspaceList'],
    }),
    updateWorkspace: build.mutation({
      query: ({ workspaceId, name }) => ({
        url: `/workspaces/${workspaceId}`,
        method: 'PATCH',
        body: { name },
      }),
      transformResponse: (response) => response?.data?.workspace ?? null,
      invalidatesTags: (_result, _error, { workspaceId }) => [
        'WorkspaceList',
        { type: 'Workspace', id: workspaceId },
      ],
    }),
    transferWorkspaceOwnership: build.mutation({
      query: ({ workspaceId, newOwnerMemberId, previousOwnerRoleId, currentPassword }) => ({
        url: `/workspaces/${workspaceId}/ownership`,
        method: 'PATCH',
        body: {
          newOwnerMemberId,
          previousOwnerRoleId,
          currentPassword,
        },
      }),
      transformResponse: (response) => response?.data?.ownership ?? null,
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'Workspace', id: workspaceId },
        { type: 'WorkspaceMembers', id: workspaceId },
      ],
    }),
    archiveWorkspace: build.mutation({
      query: ({ workspaceId, currentPassword, confirmationName }) => ({
        url: `/workspaces/${workspaceId}/archive`,
        method: 'POST',
        body: {
          currentPassword,
          confirmationName,
        },
      }),
      transformResponse: (response) => response?.data?.workspace ?? null,
      invalidatesTags: (_result, _error, { workspaceId }) => [
        'WorkspaceList',
        { type: 'Workspace', id: workspaceId },
        { type: 'WorkspaceMembers', id: workspaceId },
        { type: 'WorkspaceInvitations', id: workspaceId },
        { type: 'WorkspaceSubscription', id: workspaceId },
      ],
    }),
  }),
});

export const {
  useArchiveWorkspaceMutation,
  useCreateWorkspaceMutation,
  useGetWorkspaceByIdQuery,
  useListWorkspacesQuery,
  useTransferWorkspaceOwnershipMutation,
  useUpdateWorkspaceMutation,
} = workspaceApi;

export { workspaceApi };
