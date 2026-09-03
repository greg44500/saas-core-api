import { baseApi } from '@/services/api/base-api';
import { compactQueryParams } from '@/features/audit-log/api/audit-log-api';

const platformAuditLogsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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

export const { useListPlatformAuditLogsQuery } = platformAuditLogsApi;

export { platformAuditLogsApi };
