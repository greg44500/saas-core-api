import { baseApi } from '@/services/api/base-api';
import { compactQueryParams } from '@/features/audit-log/api/audit-log-api';

const EMPTY_AUDIT_METADATA = Object.freeze({
  actions: [],
  entityTypes: [],
  statuses: [],
});

const platformAuditLogsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformAuditMetadata: builder.query({
      query: () => '/platform/audit-logs/metadata',
      transformResponse: (response) => response?.data?.metadata ?? EMPTY_AUDIT_METADATA,
      providesTags: [{ type: 'PlatformAuditLogs', id: 'METADATA' }],
    }),
    listPlatformAuditLogs: builder.query({
      query: ({
        page = 1,
        limit = 20,
        workspaceId,
        actorId,
        action,
        entityType,
        status,
        from,
        to,
      } = {}) => ({
        url: '/platform/audit-logs',
        params: compactQueryParams({
          page,
          limit,
          workspaceId,
          actorId,
          action,
          entityType,
          status,
          from,
          to,
        }),
      }),
      transformResponse: (response) => ({
        auditLogs: response?.data?.auditLogs ?? [],
        pagination: response?.meta ?? {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }),
      providesTags: [{ type: 'PlatformAuditLogs', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetPlatformAuditMetadataQuery,
  useListPlatformAuditLogsQuery,
} = platformAuditLogsApi;

export {
  EMPTY_AUDIT_METADATA,
  platformAuditLogsApi,
};
