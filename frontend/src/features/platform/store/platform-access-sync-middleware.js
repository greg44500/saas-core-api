import {
  CURRENT_PLATFORM_CONTEXT_TAG,
} from '@/features/platform/api/platform-current-context-api';
import { baseApi } from '@/services/api/base-api';

function getRejectedRequestUrl(action) {
  const request = action?.meta?.baseQueryMeta?.request;

  if (typeof request === 'string') {
    return request;
  }

  return typeof request?.url === 'string' ? request.url : null;
}

function normalizeApiPathname(requestUrl) {
  if (!requestUrl) {
    return null;
  }

  try {
    const pathname = new URL(requestUrl, 'http://localhost').pathname;

    return pathname.startsWith('/api/')
      ? pathname.slice('/api'.length)
      : pathname;
  } catch {
    return null;
  }
}

function isPlatformAuthorizationFailure(action) {
  if (action?.payload?.status !== 403) {
    return false;
  }

  const pathname = normalizeApiPathname(
    getRejectedRequestUrl(action),
  );

  if (!pathname || pathname === '/platform/me') {
    return false;
  }

  return pathname.startsWith('/platform/');
}

const platformAccessSyncMiddleware = ({ dispatch }) => (next) => (action) => {
  const result = next(action);

  if (isPlatformAuthorizationFailure(action)) {
    // Un 403 Platform peut signaler qu'un autre administrateur vient de
    // suspendre, révoquer ou restreindre ce membre. Le contexte courant est
    // donc revalidé depuis le backend avant de continuer à présenter l'ancien
    // jeu de permissions conservé dans le cache RTK Query.
    dispatch(
      baseApi.util.invalidateTags([
        CURRENT_PLATFORM_CONTEXT_TAG,
      ]),
    );
  }

  return result;
};

export {
  getRejectedRequestUrl,
  isPlatformAuthorizationFailure,
  normalizeApiPathname,
  platformAccessSyncMiddleware,
};
