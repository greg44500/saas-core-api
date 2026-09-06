import { baseApi } from '@/services/api/base-api';

const PLATFORM_ROLES_LIST_TAG = { type: 'PlatformRoles', id: 'LIST' };

const platformRolesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformRoles: build.query({
      query: ({ page = 1, limit = 100, status = 'active' } = {}) => ({
        url: '/platform/team/roles',
        params: { page, limit, status },
      }),
      transformResponse: (response) => ({
        roles: response?.data?.roles ?? [],
        pagination: response?.meta ?? {
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 0,
        },
      }),
      providesTags: (result) => [
        PLATFORM_ROLES_LIST_TAG,
        ...(result?.roles ?? []).map((role) => ({
          type: 'PlatformRoles',
          id: role.id,
        })),
      ],
    }),
  }),
});

export const {
  useListPlatformRolesQuery,
} = platformRolesApi;

export {
  PLATFORM_ROLES_LIST_TAG,
  platformRolesApi,
};
