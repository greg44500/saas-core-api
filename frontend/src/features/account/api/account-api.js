import { sessionTerminated } from '@/features/auth/store/auth-slice';
import { baseApi } from '@/services/api/base-api';

const accountApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAccountClosureImpact: build.query({
      query: () => '/users/me/closure-impact',
      transformResponse: (response) => response?.data?.closureImpact ?? null,
    }),
    closeCurrentAccount: build.mutation({
      query: (payload) => ({
        url: '/users/me/closure',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response) => response?.data?.accountClosure ?? null,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        // La fermeture réussie révoque les sessions côté backend. Le frontend
        // termine immédiatement sa session locale et purge tout cache tenant.
        dispatch(sessionTerminated());
      },
    }),
  }),
});

export const {
  useCloseCurrentAccountMutation,
  useLazyGetAccountClosureImpactQuery,
} = accountApi;

export { accountApi };
