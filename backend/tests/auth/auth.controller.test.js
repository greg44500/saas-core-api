import { describe, expect, it, vi } from 'vitest';

import {
  refreshCookieName,
  refreshCookieOptions,
} from '../../config/cookie.config.js';

import {
  changePassword,
  forgotPassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
} from '../../modules/auth/auth.controller.js';

import {
  changeUserPassword,
  forgotUserPassword,
  loginUser,
  registerUser,
} from '../../modules/auth/auth.service.js';

import {
  revokeAllUserAuthSessions,
  revokeCurrentAuthSession,
  rotateAuthSession,
} from '../../modules/authSessions/authSession.service.js';

import { signAccessToken } from '../../utils/jwt.js';


vi.mock('../../modules/auth/auth.service.js', () => ({
  changeUserPassword: vi.fn(),
  forgotUserPassword: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock('../../modules/authSessions/authSession.service.js', () => ({
  revokeAllUserAuthSessions: vi.fn(),
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
      passwordChangedAt: null,
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
      null,
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

  it('traite une demande de réinitialisation avec une réponse publique générique', async () => {
    const genericMessage =
      'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.';

    /*
     * Le service est mocké car ce test porte uniquement
     * sur la responsabilité HTTP du controller.
     *
     * La recherche du User, la création du token et l'envoi
     * de l'email sont déjà testés dans auth.service.test.js.
     */
    forgotUserPassword.mockResolvedValue(
      { message: genericMessage, }
    );

    const req = {
      validated: {
        body: {
          email: 'greg@example.com',
        },
      },
      context: {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      },
    };

    const json = vi.fn();

    const res = {
      status: vi.fn(() => ({
        json,
      })),
    };

    await forgotPassword(req, res);

    /*
     * Le controller doit transmettre uniquement les données
     * dont le service a besoin, sans lui transmettre req/res.
     */
    expect(
      forgotUserPassword,
    ).toHaveBeenCalledWith({
      email: 'greg@example.com',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Browser',
    });

    expect(res.status).toHaveBeenCalledWith(200);

    /*
     * La réponse publique reste volontairement générique.
     * Elle ne doit contenir aucune information sur l'existence
     * réelle du compte ou sur la création d'un token.
     */
    expect(json).toHaveBeenCalledWith({
      status: 'success',
      message: genericMessage,
    });
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
      passwordChangedAt: null,
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
      null,
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


  it('révoque toutes les sessions de l’utilisateur et supprime le cookie refresh', async () => {
    revokeAllUserAuthSessions.mockResolvedValue({
      acknowledged: true,
      matchedCount: 3,
      modifiedCount: 3,
    });

    const req = {
      user: {
        id: 'user-id',
      },
    };

    const send = vi.fn();

    const res = {
      clearCookie: vi.fn(),
      status: vi.fn(() => ({
        send,
      })),
    };

    await logoutAll(req, res);

    expect(
      revokeAllUserAuthSessions,
    ).toHaveBeenCalledWith({
      userId: 'user-id',
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
  it('modifie le mot de passe et supprime le cookie refresh', async () => {
    changeUserPassword.mockResolvedValue({
      passwordChangedAt:
        new Date('2026-08-13T12:00:00.000Z'),
    });

    const req = {
      user: {
        id: 'user-id',
      },
      validated: {
        body: {
          currentPassword:
            'mot de passe actuel suffisamment long',
          newPassword:
            'nouveau mot de passe suffisamment long',
        },
      },
    };

    const send = vi.fn();

    const res = {
      clearCookie: vi.fn(),
      status: vi.fn(() => ({
        send,
      })),
    };

    await changePassword(req, res);

    expect(
      changeUserPassword,
    ).toHaveBeenCalledWith({
      userId: 'user-id',
      currentPassword:
        'mot de passe actuel suffisamment long',
      newPassword:
        'nouveau mot de passe suffisamment long',
    });

    expect(res.clearCookie).toHaveBeenCalledWith(
      refreshCookieName,
      refreshCookieOptions,
    );

    expect(res.status).toHaveBeenCalledWith(204);
    expect(send).toHaveBeenCalledWith();
  });
});