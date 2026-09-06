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
  }),
});

export const {
  useListPlatformTeamMembersQuery,
} = platformTeamApi;

export {
  PLATFORM_TEAM_MEMBERS_LIST_TAG,
  platformTeamApi,
};
