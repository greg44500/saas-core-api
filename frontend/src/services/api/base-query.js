import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Mutex } from 'async-mutex';

import {
  sessionAuthenticated,
  sessionTerminated,
} from '@/features/auth/store/auth-slice';

/**
 * Frontière HTTP commune de RTK Query.
 *
 * Le frontend conserve uniquement l'access token en mémoire Redux. Le refresh
 * token reste sous l'autorité du backend dans un cookie HttpOnly transmis via
 * `credentials: 'include'`. Ce module orchestre la réauthentification technique
 * ; il ne décide d'aucune permission, entitlement ou règle métier.
 */
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

/**
 * Construit la base query protégée contre les rafales de refresh concurrentes.
 *
 * Un seul appel `/auth/refresh` peut être actif à la fois. Les requêtes ayant
 * reçu 401 attendent le mutex puis rejouent leur appel avec le nouvel access
 * token lorsque le refresh réussit. `skipReauth` empêche explicitement qu'un
 * endpoint technique, notamment le refresh lui-même, déclenche une récursion.
 *
 * Si le backend ne retourne pas de nouvel access token, la session frontend est
 * terminée. Le backend reste l'autorité finale sur la validité des sessions et
 * des credentials ; ce mécanisme ne transforme jamais un 401 en autorisation.
 *
 * @param {object} [options]
 * @param {string} [options.baseUrl]
 * @returns {object} Base queries et mutex partagés par la couche API.
 */
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
