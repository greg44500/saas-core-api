import { describe, expect, it, vi } from 'vitest';

import {
  refreshCookieName,
  refreshCookieOptions,
} from '../../config/cookie.config.js';

import {
  login,
  me,
  register,
} from '../../modules/auth/auth.controller.js';

import {
  loginUser,
  registerUser,
} from '../../modules/auth/auth.service.js';

import { signAccessToken } from '../../utils/jwt.js';


vi.mock('../../modules/auth/auth.service.js', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
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