import { baseApi } from '@/services/api/base-api';

const helpApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkspaceHelpCatalog: builder.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/help`,
      transformResponse: (response) => response?.data?.catalog ?? null,
    }),
    getWorkspaceHelpEntry: builder.query({
      query: ({ workspaceId, entryId }) =>
        `/workspaces/${workspaceId}/help/${encodeURIComponent(entryId)}`,
      transformResponse: (response) => response?.data?.entry ?? null,
    }),
    getPlatformHelpCatalog: builder.query({
      query: () => '/platform/help',
      transformResponse: (response) => response?.data?.catalog ?? null,
    }),
    getPlatformHelpEntry: builder.query({
      query: (entryId) => `/platform/help/${encodeURIComponent(entryId)}`,
      transformResponse: (response) => response?.data?.entry ?? null,
    }),
  }),
});

export const {
  useGetPlatformHelpCatalogQuery,
  useGetPlatformHelpEntryQuery,
  useGetWorkspaceHelpCatalogQuery,
  useGetWorkspaceHelpEntryQuery,
} = helpApi;
