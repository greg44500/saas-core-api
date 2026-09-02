import { baseApi } from '@/services/api/base-api';

const workspaceMembersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkspaceMembers: build.query({
      query: ({ workspaceId, page = 1, limit = 20 }) => ({
        url: `/workspaces/${workspaceId}/members`,
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        members: response?.data?.members ?? [],
        pagination: response?.meta ?? null,
      }),
      providesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceMembers', id: workspaceId },
      ],
    }),
    listWorkspaceInvitations: build.query({
      query: ({ workspaceId, page = 1, limit = 20 }) => ({
        url: `/workspaces/${workspaceId}/invitations`,
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        invitations: response?.data?.invitations ?? [],
        pagination: response?.meta ?? null,
      }),
      providesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceInvitations', id: workspaceId },
      ],
    }),
    createWorkspaceInvitation: build.mutation({
      query: ({ workspaceId, ...body }) => ({
        url: `/workspaces/${workspaceId}/invitations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceInvitations', id: workspaceId },
      ],
    }),
    resendWorkspaceInvitation: build.mutation({
      query: ({ workspaceId, invitationId }) => ({
        url: `/workspaces/${workspaceId}/invitations/${invitationId}/resend`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceInvitations', id: workspaceId },
      ],
    }),
    revokeWorkspaceInvitation: build.mutation({
      query: ({ workspaceId, invitationId }) => ({
        url: `/workspaces/${workspaceId}/invitations/${invitationId}`,
        method: 'DELETE',
        responseHandler: 'text',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceInvitations', id: workspaceId },
      ],
    }),
    updateWorkspaceMemberRole: build.mutation({
      query: ({ workspaceId, memberId, roleId }) => ({
        url: `/workspaces/${workspaceId}/members/${memberId}/role`,
        method: 'PATCH',
        body: { roleId },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceMembers', id: workspaceId },
      ],
    }),
    suspendWorkspaceMember: build.mutation({
      query: ({ workspaceId, memberId }) => ({
        url: `/workspaces/${workspaceId}/members/${memberId}/suspend`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceMembers', id: workspaceId },
      ],
    }),
    removeWorkspaceMember: build.mutation({
      query: ({ workspaceId, memberId }) => ({
        url: `/workspaces/${workspaceId}/members/${memberId}`,
        method: 'DELETE',
        responseHandler: 'text',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceMembers', id: workspaceId },
      ],
    }),
  }),
});

export const {
  useCreateWorkspaceInvitationMutation,
  useListWorkspaceInvitationsQuery,
  useListWorkspaceMembersQuery,
  useRemoveWorkspaceMemberMutation,
  useResendWorkspaceInvitationMutation,
  useRevokeWorkspaceInvitationMutation,
  useSuspendWorkspaceMemberMutation,
  useUpdateWorkspaceMemberRoleMutation,
} = workspaceMembersApi;

export { workspaceMembersApi };
