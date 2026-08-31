import { baseApi } from '@/services/api/base-api';

const planApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listPublicPlans: build.query({
      query: () => '/plans',
      transformResponse: (response) => response?.data?.plans ?? [],
      providesTags: ['PlanCatalog'],
    }),
  }),
});

export const { useListPublicPlansQuery } = planApi;

export { planApi };
