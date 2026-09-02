import { baseApi } from '@/services/api/base-api';

/**
 * La feature Roles possède l'ensemble de la ressource /roles. Toutes les
 * features consommatrices utilisent la même instance `baseApi`, donc déplacer
 * le listing ici conserve un cache RTK Query unique sans dépendance inversée
 * vers workspace-members.
 */
const workspaceRolesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkspaceRoles: build.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/roles`,
      transformResponse: (response) => response?.data?.roles ?? [],
      providesTags: (_result, _error, workspaceId) => [
        { type: 'WorkspaceRoles', id: workspaceId },
      ],
    }),
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
