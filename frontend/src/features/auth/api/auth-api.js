import { baseApi } from '@/services/api/base-api';
import {
  sessionAuthenticated,
  sessionTerminated,
} from '@/features/auth/store/auth-slice';

function getAccessTokenFromResponse(response) {
  return response?.data?.accessToken ?? null;
}

const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
      extraOptions: { skipReauth: true },
    }),
    login: build.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      extraOptions: { skipReauth: true },
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        const previousAccessToken = getState().auth.accessToken;
        const { data } = await queryFulfilled;
        const accessToken = getAccessTokenFromResponse(data);

        if (!accessToken) {
          return;
        }

        if (previousAccessToken) {
          dispatch(baseApi.util.resetApiState());
        }

        dispatch(sessionAuthenticated({ accessToken }));
      },
    }),
    refreshSession: build.mutation({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      extraOptions: { skipReauth: true },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const accessToken = getAccessTokenFromResponse(data);

          if (accessToken) {
            dispatch(sessionAuthenticated({ accessToken }));
          } else {
            dispatch(sessionTerminated());
          }
        } catch {
          dispatch(sessionTerminated());
        }
      },
    }),
    getCurrentUser: build.query({
      query: () => '/auth/me',
    }),
    logout: build.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
        responseHandler: 'text',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(sessionTerminated());
        }
      },
    }),
    logoutAll: build.mutation({
      query: () => ({
        url: '/auth/logout-all',
        method: 'POST',
        responseHandler: 'text',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(sessionTerminated());
        }
      },
    }),
    changePassword: build.mutation({
      query: (payload) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: payload,
        responseHandler: 'text',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(sessionTerminated());
      },
    }),
    forgotPassword: build.mutation({
      query: (payload) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: payload,
      }),
      extraOptions: { skipReauth: true },
    }),
    resetPassword: build.mutation({
      query: (payload) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: payload,
      }),
      extraOptions: { skipReauth: true },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(sessionTerminated());
      },
    }),
  }),
});

export const {
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useLoginMutation,
  useLogoutAllMutation,
  useLogoutMutation,
  useRefreshSessionMutation,
  useRegisterMutation,
  useResetPasswordMutation,
} = authApi;

export { authApi, getAccessTokenFromResponse };
