import { baseApi } from '@/services/api/base-api';

function compactQueryParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

const auditLogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkspaceAuditLogs: build.query({
      query: ({ workspaceId, page = 1, limit = 20, action, status, entityType, actorId, from, to }) => ({
        url: `/workspaces/${workspaceId}/audit-logs`,
        params: compactQueryParams({
          page,
          limit,
          action,
          status,
          entityType,
          actorId,
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
    }),
  }),
});

export const { useListWorkspaceAuditLogsQuery } = auditLogApi;

export { auditLogApi, compactQueryParams };
