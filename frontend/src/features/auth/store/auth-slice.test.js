import { describe, expect, it } from 'vitest';

import {
  authSlice,
  sessionAuthenticated,
  sessionChecking,
  sessionTerminated,
  sessionUnauthenticated,
} from '@/features/auth/store/auth-slice';

describe('authSlice', () => {
  it('démarre en checking sans access token', () => {
    const state = authSlice.reducer(undefined, { type: '@@init' });

    expect(state).toEqual({
      accessToken: null,
      authStatus: 'checking',
    });
  });

  it('stocke uniquement le token mémoire et marque la session authentifiée', () => {
    const state = authSlice.reducer(
      undefined,
      sessionAuthenticated({ accessToken: 'access-token' }),
    );

    expect(state).toEqual({
      accessToken: 'access-token',
      authStatus: 'authenticated',
    });
  });

  it('nettoie le token sur unauthenticated et terminated', () => {
    const authenticatedState = {
      accessToken: 'access-token',
      authStatus: 'authenticated',
    };

    expect(
      authSlice.reducer(authenticatedState, sessionUnauthenticated()),
    ).toEqual({ accessToken: null, authStatus: 'unauthenticated' });

    expect(authSlice.reducer(authenticatedState, sessionTerminated())).toEqual({
      accessToken: null,
      authStatus: 'unauthenticated',
    });
  });

  it('peut repasser explicitement en checking pour un bootstrap', () => {
    const state = authSlice.reducer(
      { accessToken: 'stale-token', authStatus: 'authenticated' },
      sessionChecking(),
    );

    expect(state).toEqual({ accessToken: null, authStatus: 'checking' });
  });
});
