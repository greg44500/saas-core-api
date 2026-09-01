import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithReauth } from '@/services/api/base-query';

const baseApi = createApi({
  reducerPath: 'coreApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'WorkspaceList',
    'Workspace',
    'PlanCatalog',
    'WorkspaceMembers',
    'WorkspaceRoles',
    'WorkspaceInvitations',
  ],
  endpoints: () => ({}),
});

export { baseApi };
