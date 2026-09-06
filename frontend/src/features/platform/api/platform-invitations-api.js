import { baseApi } from '@/services/api/base-api';

const PLATFORM_TEAM_INVITATIONS_LIST_TAG = {
  type: 'PlatformTeamInvitations',
  id: 'LIST',
};

const platformInvitationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformTeamInvitations: build.query({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/platform/team/invitations',
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        invitations: response?.data?.invitations ?? [],
        pagination: response?.meta ?? {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }),
      providesTags: (result) => [
        PLATFORM_TEAM_INVITATIONS_LIST_TAG,
        ...(result?.invitations ?? []).map((invitation) => ({
          type: 'PlatformTeamInvitations',
          id: invitation.id,
        })),
      ],
    }),

    createPlatformTeamInvitation: build.mutation({
      query: (body) => ({
        url: '/platform/team/invitations',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response?.data?.invitation ?? null,
      invalidatesTags: [PLATFORM_TEAM_INVITATIONS_LIST_TAG],
    }),

    resendPlatformTeamInvitation: build.mutation({
      query: (invitationId) => ({
        url: `/platform/team/invitations/${invitationId}/resend`,
        method: 'POST',
      }),
      transformResponse: (response) => response?.data?.invitation ?? null,
      invalidatesTags: (result, error, invitationId) => [
        PLATFORM_TEAM_INVITATIONS_LIST_TAG,
        { type: 'PlatformTeamInvitations', id: invitationId },
      ],
    }),

    revokePlatformTeamInvitation: build.mutation({
      query: (invitationId) => ({
        url: `/platform/team/invitations/${invitationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, invitationId) => [
        PLATFORM_TEAM_INVITATIONS_LIST_TAG,
        { type: 'PlatformTeamInvitations', id: invitationId },
      ],
    }),
  }),
});

export const {
  useCreatePlatformTeamInvitationMutation,
  useListPlatformTeamInvitationsQuery,
  useResendPlatformTeamInvitationMutation,
  useRevokePlatformTeamInvitationMutation,
} = platformInvitationsApi;

export {
  PLATFORM_TEAM_INVITATIONS_LIST_TAG,
  platformInvitationsApi,
};
