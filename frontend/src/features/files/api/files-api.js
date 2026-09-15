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
    listWorkspaceFileTrash: build.query({
      query: ({ workspaceId, page = 1, limit = 20, category, search }) => ({
        url: `/workspaces/${workspaceId}/files/trash`,
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
        { type: 'WorkspaceFileTrash', id: workspaceId },
      ],
    }),
    getWorkspaceFileStorage: build.query({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/files/storage`,
      }),
      transformResponse: (response) => response?.data?.storage ?? null,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'WorkspaceFileStorage', id: workspaceId },
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
        { type: 'WorkspaceFileStorage', id: workspaceId },
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
      // Le fichier quitte le listing actif et entre immédiatement dans la
      // corbeille ; le stockage reste volontairement inchangé jusqu'à sa
      // suppression définitive.
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceFiles', id: workspaceId },
        { type: 'WorkspaceFileTrash', id: workspaceId },
      ],
    }),
    restoreWorkspaceFile: build.mutation({
      query: ({ workspaceId, fileId }) => ({
        url: `/workspaces/${workspaceId}/files/${fileId}/restore`,
        method: 'POST',
      }),
      transformResponse: (response) => response?.data?.file ?? null,
      // La restauration effectue la transition inverse sans réserver une
      // seconde fois le stockage déjà comptabilisé pendant la rétention.
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceFiles', id: workspaceId },
        { type: 'WorkspaceFileTrash', id: workspaceId },
      ],
    }),
    permanentlyDeleteWorkspaceFile: build.mutation({
      query: ({ workspaceId, fileId }) => ({
        url: `/workspaces/${workspaceId}/files/${fileId}/permanent`,
        method: 'DELETE',
        responseHandler: 'text',
      }),
      // L'effacement est irréversible : le fichier quitte la Corbeille et la
      // consommation storage_bytes est réellement libérée côté backend.
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceFileTrash', id: workspaceId },
        { type: 'WorkspaceFileStorage', id: workspaceId },
      ],
    }),
  }),
});

export const {
  useDeleteWorkspaceFileMutation,
  useDownloadWorkspaceFileMutation,
  useGetWorkspaceFileStorageQuery,
  useListWorkspaceFilesQuery,
  useListWorkspaceFileTrashQuery,
  usePermanentlyDeleteWorkspaceFileMutation,
  useRestoreWorkspaceFileMutation,
  useUploadWorkspaceFileMutation,
} = workspaceFilesApi;

export { createFileUploadFormData, workspaceFilesApi };
