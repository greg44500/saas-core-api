import { baseApi } from '@/services/api/base-api';

const PLATFORM_USERS_LIST_TAG = { type: 'PlatformUsers', id: 'LIST' };

const platformUsersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformUsers: build.query({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/platform/users',
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        users: response?.data?.users ?? [],
        pagination: response?.meta ?? {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }),
      providesTags: (result) => [
        PLATFORM_USERS_LIST_TAG,
        ...(result?.users ?? []).map((user) => ({
          type: 'PlatformUsers',
          id: user.id,
        })),
      ],
    }),
    getPlatformUser: build.query({
      query: (userId) => `/platform/users/${userId}`,
      transformResponse: (response) => response?.data?.user ?? null,
      providesTags: (_result, _error, userId) => [
        { type: 'PlatformUsers', id: userId },
      ],
    }),
    disablePlatformUser: build.mutation({
      query: ({ userId, disabledReason }) => ({
        url: `/platform/users/${userId}/disable`,
        method: 'PATCH',
        body: { disabledReason },
      }),
      transformResponse: (response) => response?.data?.user ?? null,
      invalidatesTags: (_result, _error, { userId }) => [
        PLATFORM_USERS_LIST_TAG,
        { type: 'PlatformUsers', id: userId },
      ],
    }),
    enablePlatformUser: build.mutation({
      query: (userId) => ({
        url: `/platform/users/${userId}/enable`,
        method: 'PATCH',
      }),
      transformResponse: (response) => response?.data?.user ?? null,
      invalidatesTags: (_result, _error, userId) => [
        PLATFORM_USERS_LIST_TAG,
        { type: 'PlatformUsers', id: userId },
      ],
    }),
    revokePlatformUserSessions: build.mutation({
      query: (userId) => ({
        url: `/platform/users/${userId}/revoke-sessions`,
        method: 'POST',
      }),
      transformResponse: (response) => response?.data ?? null,
    }),
  }),
});

export const {
  useDisablePlatformUserMutation,
  useEnablePlatformUserMutation,
  useGetPlatformUserQuery,
  useListPlatformUsersQuery,
  useRevokePlatformUserSessionsMutation,
} = platformUsersApi;

export { platformUsersApi };
