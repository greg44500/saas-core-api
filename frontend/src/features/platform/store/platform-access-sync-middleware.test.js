import { describe, expect, it, vi } from 'vitest';

import {
  CURRENT_PLATFORM_CONTEXT_TAG,
} from '@/features/platform/api/platform-current-context-api';
import {
  isPlatformAuthorizationFailure,
  platformAccessSyncMiddleware,
} from '@/features/platform/store/platform-access-sync-middleware';
import { baseApi } from '@/services/api/base-api';

function createRejectedAction({
  status = 403,
  url = 'http://localhost/api/platform/plans',
} = {}) {
  return {
    type: 'coreApi/executeQuery/rejected',
    payload: { status },
    meta: {
      baseQueryMeta: {
        request: { url },
      },
    },
  };
}

describe('platform access sync middleware', () => {
  it('identifie un 403 provenant du périmètre administratif Platform', () => {
    expect(isPlatformAuthorizationFailure(createRejectedAction())).toBe(true);
  });

  it('ignore les erreurs qui ne doivent pas revalider le contexte Platform', () => {
    expect(isPlatformAuthorizationFailure(createRejectedAction({
      status: 401,
    }))).toBe(false);
    expect(isPlatformAuthorizationFailure(createRejectedAction({
      url: 'http://localhost/api/workspaces/workspace-1',
    }))).toBe(false);
    expect(isPlatformAuthorizationFailure(createRejectedAction({
      url: 'http://localhost/api/platform/me',
    }))).toBe(false);
    expect(isPlatformAuthorizationFailure(createRejectedAction({
      url: 'http://localhost/api/platform-invitations/accept-existing',
    }))).toBe(false);
  });

  it('invalide uniquement le contexte Platform courant après un 403 Platform', () => {
    const dispatch = vi.fn();
    const next = vi.fn((action) => action);
    const action = createRejectedAction();
    const invoke = platformAccessSyncMiddleware({ dispatch })(next);

    expect(invoke(action)).toBe(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      baseApi.util.invalidateTags([
        CURRENT_PLATFORM_CONTEXT_TAG,
      ]),
    );
  });

  it('ne perturbe pas un 403 hors Platform', () => {
    const dispatch = vi.fn();
    const next = vi.fn((action) => action);
    const action = createRejectedAction({
      url: 'http://localhost/api/workspaces/workspace-1',
    });
    const invoke = platformAccessSyncMiddleware({ dispatch })(next);

    invoke(action);

    expect(dispatch).not.toHaveBeenCalled();
  });
});
