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
    acceptNewWorkspaceInvitation: build.mutation({
      query: (payload) => ({
        url: '/invitations/accept-new',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response) => response?.data?.membership ?? null,
    }),
  }),
});

export const {
  useAcceptNewWorkspaceInvitationMutation,
  useAcceptWorkspaceInvitationMutation,
} = workspaceInvitationApi;

export { workspaceInvitationApi };
