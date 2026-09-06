import { baseApi } from '@/services/api/base-api';
import {
  CURRENT_PLATFORM_CONTEXT_TAG,
} from '@/features/platform/api/platform-current-context-api';

const platformInvitationAcceptanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    acceptExistingPlatformInvitation: build.mutation({
      query: (token) => ({
        url: '/platform-invitations/accept-existing',
        method: 'POST',
        body: { token },
      }),
      transformResponse: (response) => response?.data?.membership ?? null,
      invalidatesTags: [
        CURRENT_PLATFORM_CONTEXT_TAG,
        { type: 'PlatformTeamMembers', id: 'LIST' },
        { type: 'PlatformTeamSummary', id: 'CURRENT' },
        { type: 'PlatformTeamInvitations', id: 'LIST' },
      ],
    }),
    acceptNewPlatformInvitation: build.mutation({
      query: ({ token, password }) => ({
        url: '/platform-invitations/accept-new',
        method: 'POST',
        body: { token, password },
      }),
      extraOptions: { skipReauth: true },
      transformResponse: (response) => ({
        user: response?.data?.user ?? null,
        membership: response?.data?.membership ?? null,
      }),
      invalidatesTags: [
        { type: 'PlatformTeamMembers', id: 'LIST' },
        { type: 'PlatformTeamSummary', id: 'CURRENT' },
        { type: 'PlatformTeamInvitations', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useAcceptExistingPlatformInvitationMutation,
  useAcceptNewPlatformInvitationMutation,
} = platformInvitationAcceptanceApi;

export { platformInvitationAcceptanceApi };
