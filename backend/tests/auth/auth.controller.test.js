import { describe, expect, it, vi } from 'vitest';

import {
  refreshCookieName,
  refreshCookieOptions,
} from '../../config/cookie.config.js';

import {
  login,
  logout,
  me,
  refresh,
  register,
} from '../../modules/auth/auth.controller.js';

import {
  loginUser,
  registerUser,
} from '../../modules/auth/auth.service.js';

import { revokeCurrentAuthSession, rotateAuthSession } from '../../modules/authSessions/authSession.service.js';

import { signAccessToken } from '../../utils/jwt.js';


vi.mock('../../modules/auth/auth.service.js', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock('../../modules/authSessions/authSession.service.js', () => ({
  revokeCurrentAuthSession: vi.fn(),
  rotateAuthSession: vi.fn(),
}));

vi.mock('../../utils/jwt.js', () => ({
  signAccessToken: vi.fn(),
}));


describe('auth.controller', () => {
  it('renvoie le User créé sans exposer ses champs internes', async () => {
    registerUser.mockResolvedValue({
      _id: {
        toString: () => 'user-id',
      },
      firstName: 'Greg',
      lastName: 'Ballat',
      email: 'greg@example.com',
      emailCanonical: 'greg@example.com',
      platformRole: 'user',
      emailVerifiedAt: null,
    });

    const req = {
      validated: {
        body: {
          firstName: 'Greg',
          lastName: 'Ballat',
          email: 'greg@example.com',
          password: 'une phrase de passe suffisamment longue',
        },
      },
    };

    const json = vi.fn();

    const res = {
      status: vi.fn(() => ({
        json,
      })),
    };

    await register(req, res);

    expect(registerUser).toHaveBeenCalledWith(
      req.validated.body,
    );

    expect(res.status).toHaveBeenCalledWith(201);

    expect(json).toHaveBeenCalledWith({
      status: 'success',
      data: {
        user: {
          id: 'user-id',
          firstName: 'Greg',
          lastName: 'Ballat',
          email: 'greg@example.com',
          emailVerifiedAt: null,
        },
      },
    });
  });


  it('connecte le User, crée le cookie refresh et ne l’expose pas dans le JSON', async () => {
    const user = {
      _id: {
        toString: () => 'user-id',
      },
      firstName: 'Greg',
      lastName: 'Ballat',
      email: 'greg@example.com',
      emailCanonical: 'greg@example.com',
      platformRole: 'user',
      emailVerifiedAt: null,
    };

    loginUser.mockResolvedValue({
      user,
      refreshToken: 'refresh-token-test',
    });

    signAccessToken.mockReturnValue('access-token-test');

    const req = {
      validated: {
        body: {
          email: 'greg@example.com',
          password: 'une phrase de passe suffisamment longue',
        },
      },
      context: {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      },
    };

    const json = vi.fn();

    const res = {
      cookie: vi.fn(),
      status: vi.fn(() => ({
        json,
      })),
    };

    await login(req, res);

    expect(loginUser).toHaveBeenCalledWith({
      email: 'greg@example.com',
      password: 'une phrase de passe suffisamment longue',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Browser',
    });

    expect(signAccessToken).toHaveBeenCalledWith(
      'user-id',
    );

    expect(res.cookie).toHaveBeenCalledWith(
      refreshCookieName,
      'refresh-token-test',
      refreshCookieOptions,
    );

    expect(res.status).toHaveBeenCalledWith(200);

    expect(json).toHaveBeenCalledWith({
      status: 'success',
      data: {
        user: {
          id: 'user-id',
          firstName: 'Greg',
          lastName: 'Ballat',
          email: 'greg@example.com',
          emailVerifiedAt: null,
        },
        accessToken: 'access-token-test',
      },
    });

    // Le refresh token est un secret transporté uniquement
    // dans le cookie HttpOnly. Il ne doit jamais être exposé
    // dans le corps JSON de la réponse.
    const responseBody = json.mock.calls[0][0];

    expect(
      responseBody.data.refreshToken,
    ).toBeUndefined();
  });


  it('renouvelle la session, remplace le cookie refresh et ne l’expose pas dans le JSON', async () => {
    const user = {
      _id: {
        toString: () => 'user-id',
      },
      firstName: 'Greg',
      lastName: 'Ballat',
      email: 'greg@example.com',
      emailCanonical: 'greg@example.com',
      platformRole: 'user',
      emailVerifiedAt: null,
    };

    rotateAuthSession.mockResolvedValue({
      user,
      authSession: {
        _id: 'new-session-id',
      },
      refreshToken: 'refresh-token-r2',
    });

    signAccessToken.mockReturnValue(
      'new-access-token-test',
    );

    const req = {
      cookies: {
        [refreshCookieName]: 'refresh-token-r1',
      },
      context: {
        ipAddress: '192.168.1.20',
        userAgent: 'Mozilla/5.0 Test Browser',
      },
    };

    const json = vi.fn();

    const res = {
      cookie: vi.fn(),
      status: vi.fn(() => ({
        json,
      })),
    };

    await refresh(req, res);

    expect(rotateAuthSession).toHaveBeenCalledWith({
      refreshToken: 'refresh-token-r1',
      ipAddress: '192.168.1.20',
      userAgent: 'Mozilla/5.0 Test Browser',
    });

    expect(signAccessToken).toHaveBeenCalledWith(
      'user-id',
    );

    expect(res.cookie).toHaveBeenCalledWith(
      refreshCookieName,
      'refresh-token-r2',
      refreshCookieOptions,
    );

    expect(res.status).toHaveBeenCalledWith(200);

    expect(json).toHaveBeenCalledWith({
      status: 'success',
      data: {
        user: {
          id: 'user-id',
          firstName: 'Greg',
          lastName: 'Ballat',
          email: 'greg@example.com',
          emailVerifiedAt: null,
        },
        accessToken: 'new-access-token-test',
      },
    });

    /*
     * Ni le nouveau refresh token ni l'AuthSession
     * ne doivent être exposés dans la réponse JSON.
     */
    const responseBody = json.mock.calls[0][0];

    expect(
      responseBody.data.refreshToken,
    ).toBeUndefined();

    expect(
      responseBody.data.authSession,
    ).toBeUndefined();
  });

  it('révoque la session courante et supprime le cookie refresh', async () => {
    revokeCurrentAuthSession.mockResolvedValue({
      _id: 'session-id',
      revokedReason: 'logout',
    });

    const req = {
      cookies: {
        [refreshCookieName]: 'refresh-token-current',
      },
    };

    const send = vi.fn();

    const res = {
      clearCookie: vi.fn(),
      status: vi.fn(() => ({
        send,
      })),
    };

    await logout(req, res);

    expect(
      revokeCurrentAuthSession,
    ).toHaveBeenCalledWith({
      refreshToken: 'refresh-token-current',
    });

    expect(res.clearCookie).toHaveBeenCalledWith(
      refreshCookieName,
      refreshCookieOptions,
    );

    expect(res.status).toHaveBeenCalledWith(204);

    expect(send).toHaveBeenCalledWith();
  });


  it('renvoie le User actuellement authentifié sans exposer ses champs internes', async () => {
    const req = {
      user: {
        id: 'user-id',
        firstName: 'Greg',
        lastName: 'Ballat',
        email: 'greg@example.com',
        emailCanonical: 'greg@example.com',
        platformRole: 'user',
        emailVerifiedAt: null,
      },
    };

    const json = vi.fn();

    const res = {
      status: vi.fn(() => ({
        json,
      })),
    };

    await me(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(json).toHaveBeenCalledWith({
      status: 'success',
      data: {
        user: {
          id: 'user-id',
          firstName: 'Greg',
          lastName: 'Ballat',
          email: 'greg@example.com',
          emailVerifiedAt: null,
        },
      },
    });
  });
});