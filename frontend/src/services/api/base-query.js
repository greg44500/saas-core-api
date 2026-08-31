import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Mutex } from 'async-mutex';

import {
  sessionAuthenticated,
  sessionTerminated,
} from '@/features/auth/store/auth-slice';

function createRawBaseQuery(baseUrl = '/api') {
  return fetchBaseQuery({
    baseUrl,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const accessToken = getState().auth.accessToken;

      if (accessToken) {
        headers.set('authorization', `Bearer ${accessToken}`);
      }

      return headers;
    },
  });
}

function extractAccessToken(result) {
  return result?.data?.data?.accessToken ?? null;
}

function createBaseQueryWithReauth({ baseUrl = '/api' } = {}) {
  const rawQuery = createRawBaseQuery(baseUrl);
  const mutex = new Mutex();

  const queryWithReauth = async (args, api, extraOptions = {}) => {
    await mutex.waitForUnlock();

    let result = await rawQuery(args, api, extraOptions);

    if (result.error?.status !== 401 || extraOptions.skipReauth === true) {
      return result;
    }

    if (!mutex.isLocked()) {
      const release = await mutex.acquire();

      try {
        const refreshResult = await rawQuery(
          { url: '/auth/refresh', method: 'POST' },
          api,
          { skipReauth: true },
        );
        const accessToken = extractAccessToken(refreshResult);

        if (!accessToken) {
          api.dispatch(sessionTerminated());
          return result;
        }

        api.dispatch(sessionAuthenticated({ accessToken }));

        // Le retry utilise volontairement la base brute : un second 401 ne doit
        // jamais déclencher une nouvelle boucle de refresh.
        result = await rawQuery(args, api, extraOptions);
      } finally {
        release();
      }
    } else {
      await mutex.waitForUnlock();

      if (api.getState().auth.accessToken) {
        result = await rawQuery(args, api, extraOptions);
      }
    }

    return result;
  };

  return {
    baseQueryWithReauth: queryWithReauth,
    rawBaseQuery: rawQuery,
    refreshMutex: mutex,
  };
}

const {
  baseQueryWithReauth,
  rawBaseQuery,
  refreshMutex,
} = createBaseQueryWithReauth();

export {
  baseQueryWithReauth,
  createBaseQueryWithReauth,
  createRawBaseQuery,
  extractAccessToken,
  rawBaseQuery,
  refreshMutex,
};
