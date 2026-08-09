import { describe, expect, it, vi } from 'vitest';

import { login, register } from '../../modules/auth/auth.controller.js';
import {
  loginUser,
  registerUser,
} from '../../modules/auth/auth.service.js';


vi.mock('../../modules/auth/auth.service.js', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
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


  it('renvoie le User authentifié sans exposer ses champs internes', async () => {
    loginUser.mockResolvedValue({
      _id: {
        toString: () => 'user-id',
      },

      // Un vrai document Mongoose expose également le getter `id`.
      // Le mock reproduit ce contrat car le controller utilise `user.id`
      // pour construire la représentation publique du User.
      id: 'user-id',

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

    await login(req, res);

    expect(loginUser).toHaveBeenCalledWith(
      req.validated.body,
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

        // Le fonctionnement cryptographique du JWT est déjà testé
        // dans jwt.test.js. Ici, on vérifie seulement le contrat
        // de réponse du controller.
        accessToken: expect.any(String),
      },
    });
  });
});

