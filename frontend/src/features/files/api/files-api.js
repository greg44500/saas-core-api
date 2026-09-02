import { baseApi } from '@/services/api/base-api';

const workspaceFilesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkspaceFiles: build.query({
      query: ({ workspaceId, page = 1, limit = 20 }) => ({
        url: `/workspaces/${workspaceId}/files`,
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        files: response?.data?.files ?? [],
        pagination: response?.meta ?? null,
      }),
      providesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceFiles', id: workspaceId },
      ],
    }),
    downloadWorkspaceFile: build.mutation({
      query: ({ workspaceId, fileId }) => ({
        url: `/workspaces/${workspaceId}/files/${fileId}/download`,
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useDownloadWorkspaceFileMutation,
  useListWorkspaceFilesQuery,
} = workspaceFilesApi;

export { workspaceFilesApi };
