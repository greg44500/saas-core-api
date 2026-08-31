import { baseApi } from '@/services/api/base-api';

const workspaceInvitationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    acceptWorkspaceInvitation: build.mutation({
      query: (token) => ({
        url: '/invitations/accept',
        method: 'POST',
        body: { token },
      }),
      transformResponse: (response) => response?.data?.membership ?? null,
      invalidatesTags: ['WorkspaceList'],
    }),
  }),
});

export const { useAcceptWorkspaceInvitationMutation } = workspaceInvitationApi;

export { workspaceInvitationApi };
