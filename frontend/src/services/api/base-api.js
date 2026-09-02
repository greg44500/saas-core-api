import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithReauth } from '@/services/api/base-query';

// Une seule API slice conserve un cache serveur cohérent entre les features et
// permet aux mutations d'invalider des ressources transversales sans recopier
// les données RTK Query dans des slices Redux métier.
const baseApi = createApi({
  reducerPath: 'coreApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'CurrentUser',
    'WorkspaceList',
    'Workspace',
    'PlanCatalog',
    'WorkspaceMembers',
    'WorkspaceRoles',
    'WorkspaceInvitations',
    'WorkspaceFiles',
    'WorkspaceSubscription',
    'PlatformUsers',
    'PlatformWorkspaces',
    'PlatformPlans',
    'PlatformPlanCapabilities',
  ],
  endpoints: () => ({}),
});

export { baseApi };
