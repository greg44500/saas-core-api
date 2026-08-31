import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Mutex } from 'async-mutex';

import {
  sessionAuthenticated,
  sessionTerminated,
} from '@/features/auth/store/auth-slice';

const refreshMutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const accessToken = getState().auth.accessToken;

    if (accessToken) {
      headers.set('authorization', `Bearer ${accessToken}`);
    }

    return headers;
  },
});

function extractAccessToken(result) {
  return result?.data?.data?.accessToken ?? null;
}

async function baseQueryWithReauth(args, api, extraOptions = {}) {
  await refreshMutex.waitForUnlock();

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401 || extraOptions.skipReauth === true) {
    return result;
  }

  if (!refreshMutex.isLocked()) {
    const release = await refreshMutex.acquire();

    try {
      const refreshResult = await rawBaseQuery(
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
      result = await rawBaseQuery(args, api, extraOptions);
    } finally {
      release();
    }
  } else {
    await refreshMutex.waitForUnlock();

    if (api.getState().auth.accessToken) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
}

export { baseQueryWithReauth, extractAccessToken, rawBaseQuery, refreshMutex };
