import { baseApi } from '@/services/api/base-api';

const platformRetentionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformRetentionTargets: builder.query({
      query: () => '/platform/retention',
      transformResponse: (response) => response?.data?.targets ?? [],
      providesTags: ['PlatformRetentionTargets'],
    }),
    getPlatformRetentionState: builder.query({
      query: (targetKey) => `/platform/retention/${targetKey}`,
      transformResponse: (response) => response?.data?.state ?? null,
      providesTags: (_result, _error, targetKey) => [
        { type: 'PlatformRetentionState', id: targetKey },
      ],
    }),
    getPlatformRetentionExecutions: builder.query({
      query: ({ targetKey, page = 1, limit = 20 }) => ({
        url: `/platform/retention/${targetKey}/executions`,
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        executions: response?.data?.executions ?? [],
        pagination: {
          ...(response?.meta ?? {}),
          totalPages: response?.meta?.pages ?? 1,
        },
      }),
      providesTags: (_result, _error, { targetKey }) => [
        { type: 'PlatformRetentionExecutions', id: targetKey },
      ],
    }),
    previewPlatformRetention: builder.mutation({
      query: (targetKey) => ({
        url: `/platform/retention/${targetKey}/preview`,
        method: 'POST',
      }),
      transformResponse: (response) => response?.data?.preview ?? null,
    }),
    createPlatformRetentionPolicyVersion: builder.mutation({
      query: ({ targetKey, body }) => ({
        url: `/platform/retention/${targetKey}/policy-versions`,
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response?.data?.policy ?? null,
      invalidatesTags: (_result, _error, { targetKey }) => [
        'PlatformRetentionTargets',
        { type: 'PlatformRetentionState', id: targetKey },
      ],
    }),
    executePlatformRetention: builder.mutation({
      query: ({ targetKey, body }) => ({
        url: `/platform/retention/${targetKey}/executions`,
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: (_result, _error, { targetKey }) => [
        { type: 'PlatformRetentionState', id: targetKey },
        { type: 'PlatformRetentionExecutions', id: targetKey },
        'PlatformAuditLogs',
      ],
    }),
  }),
});

const {
  useCreatePlatformRetentionPolicyVersionMutation,
  useExecutePlatformRetentionMutation,
  useGetPlatformRetentionExecutionsQuery,
  useGetPlatformRetentionStateQuery,
  useGetPlatformRetentionTargetsQuery,
  usePreviewPlatformRetentionMutation,
} = platformRetentionApi;

export {
  platformRetentionApi,
  useCreatePlatformRetentionPolicyVersionMutation,
  useExecutePlatformRetentionMutation,
  useGetPlatformRetentionExecutionsQuery,
  useGetPlatformRetentionStateQuery,
  useGetPlatformRetentionTargetsQuery,
  usePreviewPlatformRetentionMutation,
};
