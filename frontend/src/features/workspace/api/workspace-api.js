import { baseApi } from '@/services/api/base-api';

const workspaceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkspaces: build.query({
      query: () => '/workspaces',
      transformResponse: (response) => response?.data?.workspaces ?? [],
      providesTags: ['WorkspaceList'],
    }),
    createWorkspace: build.mutation({
      query: (payload) => ({
        url: '/workspaces',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response) => response?.data?.workspace ?? null,
      invalidatesTags: ['WorkspaceList'],
    }),
  }),
});

export const {
  useCreateWorkspaceMutation,
  useListWorkspacesQuery,
} = workspaceApi;

export { workspaceApi };
