import { baseApi } from '@/services/api/base-api';

const PLATFORM_ROLES_LIST_TAG = { type: 'PlatformRoles', id: 'LIST' };
const PLATFORM_ROLE_PERMISSIONS_TAG = {
  type: 'PlatformRoles',
  id: 'PERMISSIONS',
};

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

    getPlatformRole: build.query({
      query: (roleId) => `/platform/team/roles/${roleId}`,
      transformResponse: (response) => response?.data?.role ?? null,
      providesTags: (result, error, roleId) => [
        { type: 'PlatformRoles', id: roleId },
      ],
    }),

    getPlatformRolePermissionCatalog: build.query({
      query: () => '/platform/team/roles/permissions',
      transformResponse: (response) => response?.data?.permissions ?? [],
      providesTags: [PLATFORM_ROLE_PERMISSIONS_TAG],
    }),

    createPlatformRole: build.mutation({
      query: (body) => ({
        url: '/platform/team/roles',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response?.data?.role ?? null,
      invalidatesTags: [PLATFORM_ROLES_LIST_TAG],
    }),

    updatePlatformRole: build.mutation({
      query: ({ roleId, body }) => ({
        url: `/platform/team/roles/${roleId}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response?.data?.role ?? null,
      invalidatesTags: (result, error, { roleId }) => [
        PLATFORM_ROLES_LIST_TAG,
        { type: 'PlatformRoles', id: roleId },
      ],
    }),

    archivePlatformRole: build.mutation({
      query: (roleId) => ({
        url: `/platform/team/roles/${roleId}/archive`,
        method: 'PATCH',
      }),
      transformResponse: (response) => response?.data?.role ?? null,
      invalidatesTags: (result, error, roleId) => [
        PLATFORM_ROLES_LIST_TAG,
        { type: 'PlatformRoles', id: roleId },
      ],
    }),
  }),
});

export const {
  useArchivePlatformRoleMutation,
  useCreatePlatformRoleMutation,
  useGetPlatformRolePermissionCatalogQuery,
  useGetPlatformRoleQuery,
  useListPlatformRolesQuery,
  useUpdatePlatformRoleMutation,
} = platformRolesApi;

export {
  PLATFORM_ROLE_PERMISSIONS_TAG,
  PLATFORM_ROLES_LIST_TAG,
  platformRolesApi,
};
