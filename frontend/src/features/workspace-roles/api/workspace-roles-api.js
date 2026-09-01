import { workspaceMembersApi } from '@/features/workspace-members/api/workspace-members-api';

const workspaceRolesApi = workspaceMembersApi.injectEndpoints({
  endpoints: (build) => ({
    createWorkspaceRole: build.mutation({
      query: ({ workspaceId, ...body }) => ({
        url: `/workspaces/${workspaceId}/roles`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceRoles', id: workspaceId },
      ],
    }),
    updateWorkspaceRole: build.mutation({
      query: ({ workspaceId, roleId, ...body }) => ({
        url: `/workspaces/${workspaceId}/roles/${roleId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceRoles', id: workspaceId },
        { type: 'WorkspaceMembers', id: workspaceId },
      ],
    }),
    deleteWorkspaceRole: build.mutation({
      query: ({ workspaceId, roleId }) => ({
        url: `/workspaces/${workspaceId}/roles/${roleId}`,
        method: 'DELETE',
        responseHandler: 'text',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceRoles', id: workspaceId },
      ],
    }),
  }),
});

export const {
  useCreateWorkspaceRoleMutation,
  useDeleteWorkspaceRoleMutation,
  useListWorkspaceRolesQuery,
  useUpdateWorkspaceRoleMutation,
} = workspaceRolesApi;

export { workspaceRolesApi };
