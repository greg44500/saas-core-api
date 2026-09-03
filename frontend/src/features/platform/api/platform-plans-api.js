import { baseApi } from '@/services/api/base-api';

const platformPlansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPlatformPlanCapabilities: builder.query({
      query: () => '/platform/plans/capabilities',
      transformResponse: (response) => response?.data ?? {
        features: [],
        featureDefinitions: [],
        metrics: [],
      },
      providesTags: ['PlatformPlanCapabilities'],
    }),

    listPlatformPlans: builder.query({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/platform/plans',
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        plans: response?.data?.plans ?? [],
        pagination: response?.meta ?? {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }),
      providesTags: (result) => [
        { type: 'PlatformPlans', id: 'LIST' },
        ...(result?.plans ?? []).map((plan) => ({
          type: 'PlatformPlans',
          id: plan.id,
        })),
      ],
    }),

    createPlatformPlan: builder.mutation({
      query: (body) => ({
        url: '/platform/plans',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'PlatformPlans', id: 'LIST' },
        'PlanCatalog',
      ],
    }),

    updatePlatformPlan: builder.mutation({
      query: ({ planId, ...body }) => ({
        url: `/platform/plans/${planId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { planId }) => [
        { type: 'PlatformPlans', id: 'LIST' },
        { type: 'PlatformPlans', id: planId },
        'PlanCatalog',
      ],
    }),

    archivePlatformPlan: builder.mutation({
      query: (planId) => ({
        url: `/platform/plans/${planId}/archive`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, planId) => [
        { type: 'PlatformPlans', id: 'LIST' },
        { type: 'PlatformPlans', id: planId },
        'PlanCatalog',
      ],
    }),
  }),
});

export const {
  useArchivePlatformPlanMutation,
  useCreatePlatformPlanMutation,
  useListPlatformPlanCapabilitiesQuery,
  useListPlatformPlansQuery,
  useUpdatePlatformPlanMutation,
} = platformPlansApi;
