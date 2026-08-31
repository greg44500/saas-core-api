import { describe, expect, it } from 'vitest';

import { authApi } from '@/features/auth/api/auth-api';
import { sessionAuthenticated, sessionTerminated } from '@/features/auth/store/auth-slice';
import { baseApi } from '@/services/api/base-api';
import { createAppStore } from '@/store/store';

describe('createAppStore', () => {
  it('intègre auth et la base RTK Query', () => {
    const store = createAppStore();

    expect(store.getState()).toHaveProperty('auth');
    expect(store.getState()).toHaveProperty(baseApi.reducerPath);
    expect(authApi.reducerPath).toBe(baseApi.reducerPath);
  });

  it('réinitialise le cache RTK Query lors d’une terminaison de session', async () => {
    const store = createAppStore();

    store.dispatch(sessionAuthenticated({ accessToken: 'memory-token' }));
    store.dispatch(
      baseApi.util.upsertQueryData('getCurrentUser', undefined, {
        status: 'success',
        data: { user: { id: 'user-1' } },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(Object.keys(store.getState()[baseApi.reducerPath].queries)).toHaveLength(1);

    store.dispatch(sessionTerminated());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(store.getState().auth).toEqual({
      accessToken: null,
      authStatus: 'unauthenticated',
    });
    expect(Object.keys(store.getState()[baseApi.reducerPath].queries)).toHaveLength(0);
  });
});
