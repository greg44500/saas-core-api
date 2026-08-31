import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createApiHarness(accessToken = null) {
  const state = {
    auth: {
      accessToken,
      authStatus: accessToken ? 'authenticated' : 'unauthenticated',
    },
  };

  const dispatch = vi.fn((action) => {
    if (action.type === 'auth/sessionAuthenticated') {
      state.auth.accessToken = action.payload.accessToken;
      state.auth.authStatus = 'authenticated';
    }

    if (action.type === 'auth/sessionTerminated') {
      state.auth.accessToken = null;
      state.auth.authStatus = 'unauthenticated';
    }

    return action;
  });

  return {
    api: {
      dispatch,
      endpoint: 'testEndpoint',
      forced: false,
      getState: () => state,
      signal: new AbortController().signal,
      type: 'query',
    },
    dispatch,
    state,
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function getRequestUrl(input) {
  return typeof input === 'string' ? input : input.url;
}

const TEST_API_BASE_URL = 'http://localhost/api';

describe('baseQueryWithReauth', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function createTestQueries() {
    const { createBaseQueryWithReauth } = await import('@/services/api/base-query');
    return createBaseQueryWithReauth({ baseUrl: TEST_API_BASE_URL });
  }

  it('injecte centralement le Bearer depuis le store mémoire', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ status: 'success', data: { ok: true } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { rawBaseQuery } = await createTestQueries();
    const { api } = createApiHarness('memory-token');

    await rawBaseQuery('/protected', api, {});

    const request = fetchMock.mock.calls[0][0];
    expect(request.url).toBe('http://localhost/api/protected');
    expect(request.headers.get('authorization')).toBe('Bearer memory-token');
    expect(request.credentials).toBe('include');
  });

  it('rafraîchit une seule fois puis rejoue la requête initiale avec le nouveau token', async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;

    const fetchMock = vi.fn(async (input) => {
      const url = getRequestUrl(input);

      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return jsonResponse({
          status: 'success',
          data: { accessToken: 'fresh-token', user: { id: 'user-1' } },
        });
      }

      if (url.endsWith('/protected')) {
        protectedCalls += 1;

        if (protectedCalls === 1) {
          return jsonResponse({ status: 'fail' }, 401);
        }

        return jsonResponse({ status: 'success', data: { ok: true } });
      }

      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { baseQueryWithReauth } = await createTestQueries();
    const { api, dispatch, state } = createApiHarness('expired-token');

    const result = await baseQueryWithReauth('/protected', api, {});

    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
    expect(state.auth.accessToken).toBe('fresh-token');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth/sessionAuthenticated',
        payload: { accessToken: 'fresh-token' },
      }),
    );
    expect(result.data).toEqual({ status: 'success', data: { ok: true } });
  });

  it('ne boucle pas lorsqu’une requête rejouée retourne encore 401', async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;

    const fetchMock = vi.fn(async (input) => {
      const url = getRequestUrl(input);

      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return jsonResponse({
          status: 'success',
          data: { accessToken: 'fresh-token' },
        });
      }

      protectedCalls += 1;
      return jsonResponse({ status: 'fail' }, 401);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { baseQueryWithReauth } = await createTestQueries();
    const { api } = createApiHarness('expired-token');

    const result = await baseQueryWithReauth('/protected', api, {});

    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
    expect(result.error?.status).toBe(401);
  });

  it('respecte skipReauth pour les 401 naturels des endpoints Auth publics', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ status: 'fail' }, 401),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { baseQueryWithReauth } = await createTestQueries();
    const { api, dispatch } = createApiHarness();

    const result = await baseQueryWithReauth('/auth/login', api, {
      skipReauth: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
    expect(result.error?.status).toBe(401);
  });

  it('coordonne deux 401 concurrents autour d’un unique refresh', async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;

    const fetchMock = vi.fn(async (input) => {
      const url = getRequestUrl(input);

      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return jsonResponse({
          status: 'success',
          data: { accessToken: 'fresh-token' },
        });
      }

      protectedCalls += 1;
      const authorization = input.headers.get('authorization');

      if (authorization === 'Bearer fresh-token') {
        return jsonResponse({ status: 'success', data: { ok: true } });
      }

      return jsonResponse({ status: 'fail' }, 401);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { baseQueryWithReauth } = await createTestQueries();
    const { api } = createApiHarness('expired-token');

    const [firstResult, secondResult] = await Promise.all([
      baseQueryWithReauth('/protected', api, {}),
      baseQueryWithReauth('/protected', api, {}),
    ]);

    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(4);
    expect(firstResult.data?.data?.ok).toBe(true);
    expect(secondResult.data?.data?.ok).toBe(true);
  });
});
