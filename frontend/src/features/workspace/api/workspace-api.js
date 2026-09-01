import { baseApi } from '@/services/api/base-api';

const workspaceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkspaces: build.query({
      query: () => '/workspaces',
      transformResponse: (response) => response?.data?.workspaces ?? [],
      providesTags: ['WorkspaceList'],
    }),
    getWorkspaceById: build.query({
      query: (workspaceId) => `/workspaces/${workspaceId}`,
      transformResponse: (response) => response?.data ?? null,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'Workspace', id: workspaceId },
      ],
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
  useGetWorkspaceByIdQuery,
  useListWorkspacesQuery,
} = workspaceApi;

export { workspaceApi };
