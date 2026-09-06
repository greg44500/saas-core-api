import { baseApi } from '@/services/api/base-api';

const PLATFORM_TEAM_MEMBERS_LIST_TAG = {
  type: 'PlatformTeamMembers',
  id: 'LIST',
};

const platformTeamApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformTeamMembers: build.query({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/platform/team/members',
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        members: response?.data?.members ?? [],
        pagination: response?.meta ?? {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }),
      providesTags: (result) => [
        PLATFORM_TEAM_MEMBERS_LIST_TAG,
        ...(result?.members ?? []).map((member) => ({
          type: 'PlatformTeamMembers',
          id: member.id,
        })),
      ],
    }),
    updatePlatformTeamMemberRole: build.mutation({
      query: ({ memberId, roleId }) => ({
        url: `/platform/team/members/${memberId}/role`,
        method: 'PATCH',
        body: { roleId },
      }),
      transformResponse: (response) => response?.data?.member ?? null,
      invalidatesTags: (_result, _error, { memberId }) => [
        PLATFORM_TEAM_MEMBERS_LIST_TAG,
        { type: 'PlatformTeamMembers', id: memberId },
      ],
    }),
    suspendPlatformTeamMember: build.mutation({
      query: (memberId) => ({
        url: `/platform/team/members/${memberId}/suspend`,
        method: 'PATCH',
      }),
      transformResponse: (response) => response?.data?.member ?? null,
      invalidatesTags: (_result, _error, memberId) => [
        PLATFORM_TEAM_MEMBERS_LIST_TAG,
        { type: 'PlatformTeamMembers', id: memberId },
      ],
    }),
    reactivatePlatformTeamMember: build.mutation({
      query: (memberId) => ({
        url: `/platform/team/members/${memberId}/reactivate`,
        method: 'PATCH',
      }),
      transformResponse: (response) => response?.data?.member ?? null,
      invalidatesTags: (_result, _error, memberId) => [
        PLATFORM_TEAM_MEMBERS_LIST_TAG,
        { type: 'PlatformTeamMembers', id: memberId },
      ],
    }),
    revokePlatformTeamMember: build.mutation({
      query: (memberId) => ({
        url: `/platform/team/members/${memberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, memberId) => [
        PLATFORM_TEAM_MEMBERS_LIST_TAG,
        { type: 'PlatformTeamMembers', id: memberId },
      ],
    }),
  }),
});

export const {
  useListPlatformTeamMembersQuery,
  useReactivatePlatformTeamMemberMutation,
  useRevokePlatformTeamMemberMutation,
  useSuspendPlatformTeamMemberMutation,
  useUpdatePlatformTeamMemberRoleMutation,
} = platformTeamApi;

export {
  PLATFORM_TEAM_MEMBERS_LIST_TAG,
  platformTeamApi,
};
