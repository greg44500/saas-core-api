import { baseApi } from '@/services/api/base-api';

/**
 * Construit le payload multipart sans imposer manuellement Content-Type.
 * Le navigateur doit générer lui-même la boundary multipart utilisée par
 * `fetchBaseQuery`, sinon le backend Multer ne pourrait pas parser le fichier.
 */
function createFileUploadFormData({ file, category }) {
  const body = new FormData();
  body.append('file', file);
  body.append('category', category);
  return body;
}

const workspaceFilesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkspaceFiles: build.query({
      query: ({ workspaceId, page = 1, limit = 20, category, search }) => ({
        url: `/workspaces/${workspaceId}/files`,
        params: {
          page,
          limit,
          ...(category ? { category } : {}),
          ...(search ? { search } : {}),
        },
      }),
      transformResponse: (response) => ({
        files: response?.data?.files ?? [],
        pagination: response?.meta ?? null,
      }),
      providesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceFiles', id: workspaceId },
      ],
    }),
    uploadWorkspaceFile: build.mutation({
      query: ({ workspaceId, file, category }) => ({
        url: `/workspaces/${workspaceId}/files`,
        method: 'POST',
        body: createFileUploadFormData({ file, category }),
      }),
      transformResponse: (response) => response?.data?.file ?? null,
      invalidatesTags: (_result, _error, { workspaceId }) => [
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
    deleteWorkspaceFile: build.mutation({
      query: ({ workspaceId, fileId }) => ({
        url: `/workspaces/${workspaceId}/files/${fileId}`,
        method: 'DELETE',
        // Le backend répond 204 : éviter une tentative de parsing JSON sur un
        // corps vide conserve le contrat HTTP réel du soft-delete.
        responseHandler: 'text',
      }),
      // La suppression retire immédiatement le fichier du listing actif ; le
      // cache doit donc être invalidé même si le contenu physique est conservé
      // côté serveur jusqu'à la purge différée.
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceFiles', id: workspaceId },
      ],
    }),
  }),
});

export const {
  useDeleteWorkspaceFileMutation,
  useDownloadWorkspaceFileMutation,
  useListWorkspaceFilesQuery,
  useUploadWorkspaceFileMutation,
} = workspaceFilesApi;

export { createFileUploadFormData, workspaceFilesApi };
