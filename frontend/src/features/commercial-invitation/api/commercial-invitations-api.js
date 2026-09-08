import { baseApi } from '@/services/api/base-api';

const COMMERCIAL_INVITATIONS_LIST_TAG = {
  type: 'PlatformCommercialInvitations',
  id: 'LIST',
};

/**
 * API RTK Query du domaine CommercialInvitation.
 *
 * Les endpoints Platform et bénéficiaire partagent le même cache technique,
 * mais gardent des contrats HTTP distincts. Le token n'est jamais stocké dans
 * Redux : il est seulement fourni comme argument éphémère aux mutations.
 */
const commercialInvitationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCommercialInvitations: build.query({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/platform/commercial-invitations',
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
        COMMERCIAL_INVITATIONS_LIST_TAG,
        ...(result?.invitations ?? []).map((invitation) => ({
          type: 'PlatformCommercialInvitations',
          id: invitation.id,
        })),
      ],
    }),

    createCommercialInvitation: build.mutation({
      query: (body) => ({
        url: '/platform/commercial-invitations',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response?.data?.invitation ?? null,
      invalidatesTags: [COMMERCIAL_INVITATIONS_LIST_TAG],
    }),

    resendCommercialInvitation: build.mutation({
      query: (invitationId) => ({
        url: `/platform/commercial-invitations/${invitationId}/resend`,
        method: 'POST',
      }),
      transformResponse: (response) => response?.data?.invitation ?? null,
      invalidatesTags: (_result, _error, invitationId) => [
        COMMERCIAL_INVITATIONS_LIST_TAG,
        { type: 'PlatformCommercialInvitations', id: invitationId },
      ],
    }),

    revokeCommercialInvitation: build.mutation({
      query: ({ invitationId, reason }) => ({
        url: `/platform/commercial-invitations/${invitationId}/revoke`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { invitationId }) => [
        COMMERCIAL_INVITATIONS_LIST_TAG,
        { type: 'PlatformCommercialInvitations', id: invitationId },
      ],
    }),

    previewCommercialInvitation: build.mutation({
      query: (token) => ({
        url: '/commercial-invitations/preview',
        method: 'POST',
        body: { token },
      }),
      transformResponse: (response) => response?.data?.invitation ?? null,
    }),

    acceptCommercialInvitation: build.mutation({
      query: (token) => ({
        url: '/commercial-invitations/accept',
        method: 'POST',
        body: { token },
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: [
        'WorkspaceList',
        'Workspace',
        'WorkspaceSubscription',
        'PlanCatalog',
      ],
    }),
  }),
});

export const {
  useAcceptCommercialInvitationMutation,
  useCreateCommercialInvitationMutation,
  useListCommercialInvitationsQuery,
  usePreviewCommercialInvitationMutation,
  useResendCommercialInvitationMutation,
  useRevokeCommercialInvitationMutation,
} = commercialInvitationsApi;

export {
  COMMERCIAL_INVITATIONS_LIST_TAG,
  commercialInvitationsApi,
};
