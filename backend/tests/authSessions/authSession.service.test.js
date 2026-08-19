import { beforeEach, describe, expect, it, vi } from 'vitest';

import mongoose from 'mongoose';
import {
  AUTH_SESSION_REVOKED_REASON,
} from '../../constants/authSession.constants.js';
import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';

import {
  createAuditLog,
} from '../../modules/auditLog/auditLog.service.js';
import { AuthSession } from '../../modules/authSessions/authSession.model.js';
import {
  createInitialAuthSession,
  revokeAllUserAuthSessions,
  revokeCurrentAuthSession,
  rotateAuthSession,
} from '../../modules/authSessions/authSession.service.js';
import { User } from '../../modules/users/user.model.js';

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('mongoose', async () => {
  const actual = await vi.importActual('mongoose');

  return {
    ...actual,
    default: {
      ...actual.default,
      Types: actual.default.Types,
      connection: {
        transaction: vi.fn(),
      },
    },
  };
});


vi.mock('../../modules/authSessions/authSession.model.js', () => ({
  AuthSession: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
  },
}));


vi.mock('../../modules/users/user.model.js', () => ({
  User: {
    findById: vi.fn(),
  },
}));


describe('authSession.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAuditLog.mockResolvedValue(undefined);

    /*
     * Le test unitaire ne reteste pas MongoDB.
     * On simule simplement l'exécution du callback transactionnel.
     */
    mongoose.connection.transaction.mockImplementation(
      async (callback) => callback({ id: 'mongo-session' }),
    );

    AuthSession.updateMany.mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
    });
  });


  it('crée une nouvelle famille de session et retourne le refresh token brut', async () => {
    const userId = 'user-id';

    const createdSession = {
      _id: 'session-id',
    };

    AuthSession.create.mockResolvedValue(createdSession);

    const result = await createInitialAuthSession({
      userId,
      userAgent: 'Mozilla/5.0 Test Browser',
      ipAddress: '127.0.0.1',
    });

    expect(AuthSession.create).toHaveBeenCalledOnce();

    const sessionData = AuthSession.create.mock.calls[0][0];

    expect(sessionData).toEqual(
      expect.objectContaining({
        user: userId,
        userAgent: 'Mozilla/5.0 Test Browser',
        ipAddress: '127.0.0.1',
        refreshTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        familyId: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );

    expect(sessionData.refreshTokenHash).not.toBe(
      result.refreshToken,
    );

    expect(result).toEqual({
      authSession: createdSession,
      refreshToken: expect.any(String),
    });
  });


  it('fait tourner une AuthSession active dans la même famille', async () => {
    const currentSessionId =
      new mongoose.Types.ObjectId();

    const userId =
      new mongoose.Types.ObjectId();

    const currentAuthSession = {
      _id: currentSessionId,
      user: userId,
      familyId: 'family-id',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      revokedReason: null,
      usedAt: null,
      replacedBySession: null,
      compromisedAt: null,
    };

    const user = {
      _id: userId,
      status: 'active',
    };

    const consumedAuthSession = {
      ...currentAuthSession,
      usedAt: new Date(),
      revokedAt: new Date(),
      revokedReason: 'token_rotated',
    };

    const createdNextSession = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      familyId: 'family-id',
    };

    /*
     * Ces lectures sont désormais directement awaitées
     * par le service : plus de faux .session().
     */
    AuthSession.findOne.mockResolvedValue(
      currentAuthSession,
    );

    User.findById.mockResolvedValue(user);

    AuthSession.findOneAndUpdate.mockResolvedValue(
      consumedAuthSession,
    );

    AuthSession.create.mockResolvedValue([
      createdNextSession,
    ]);

    const result = await rotateAuthSession({
      refreshToken: 'refresh-token-r1',
      ipAddress: '192.168.1.20',
      userAgent: 'Mozilla/5.0 New Browser',
    });

    expect(AuthSession.findOne).toHaveBeenCalledOnce();

    expect(User.findById).toHaveBeenCalledWith(userId);

    expect(
      AuthSession.findOneAndUpdate,
    ).toHaveBeenCalledOnce();

    const [
      consumptionFilter,
      consumptionUpdate,
      consumptionOptions,
    ] = AuthSession.findOneAndUpdate.mock.calls[0];

    expect(consumptionFilter).toEqual(
      expect.objectContaining({
        _id: currentSessionId,
        revokedAt: null,
        usedAt: null,
        replacedBySession: null,
        compromisedAt: null,
      }),
    );

    expect(consumptionUpdate).toEqual({
      $set: expect.objectContaining({
        usedAt: expect.any(Date),
        revokedAt: expect.any(Date),
        revokedReason: 'token_rotated',
        replacedBySession: expect.any(
          mongoose.Types.ObjectId,
        ),
      }),
    });

    expect(consumptionOptions).toEqual(
      expect.objectContaining({
        returnDocument: 'after',
        session: expect.any(Object),
      }),
    );

    expect(AuthSession.create).toHaveBeenCalledOnce();

    const [createdDocuments, createOptions] =
      AuthSession.create.mock.calls[0];

    expect(createdDocuments).toHaveLength(1);

    expect(createdDocuments[0]).toEqual(
      expect.objectContaining({
        user: userId,
        familyId: 'family-id',
        refreshTokenHash:
          expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date),
        ipAddress: '192.168.1.20',
        userAgent: 'Mozilla/5.0 New Browser',
      }),
    );

    expect(createOptions).toEqual({
      session: expect.any(Object),
    });

    /*
     * Une rotation normale ne doit pas compromettre
     * la famille.
     */
    expect(
      AuthSession.updateMany,
    ).not.toHaveBeenCalled();

    expect(result).toEqual({
      user,
      authSession: createdNextSession,
      refreshToken: expect.any(String),
    });
  });


  it('révoque et audite la session courante lors du logout', async () => {
    const userId =
      new mongoose.Types.ObjectId();

    const revokedSession = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      revokedAt: new Date(),
      revokedReason:
        AUTH_SESSION_REVOKED_REASON.LOGOUT,
    };

    AuthSession.findOneAndUpdate.mockResolvedValue(
      revokedSession,
    );

    const result = await revokeCurrentAuthSession({
      refreshToken: 'current-refresh-token',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Browser',
    });

    expect(
      AuthSession.findOneAndUpdate,
    ).toHaveBeenCalledOnce();

    const [
      revocationFilter,
      revocationUpdate,
      revocationOptions,
    ] = AuthSession.findOneAndUpdate.mock.calls[0];

    expect(revocationFilter).toEqual({
      refreshTokenHash:
        expect.stringMatching(/^[a-f0-9]{64}$/),
      revokedAt: null,
    });

    expect(revocationUpdate).toEqual({
      $set: {
        revokedAt: expect.any(Date),
        revokedReason:
          AUTH_SESSION_REVOKED_REASON.LOGOUT,
      },
    });

    expect(revocationOptions).toEqual({
      returnDocument: 'after',
    });

    expect(createAuditLog).toHaveBeenCalledWith({
      actor: userId,
      action: AUDIT_ACTION.LOGOUT,
      entityType: AUDIT_ENTITY_TYPE.AUTH_SESSION,
      entityId: revokedSession._id,
      status: AUDIT_STATUS.SUCCESS,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Browser',
      metadata: {
        revokedReason:
          AUTH_SESSION_REVOKED_REASON.LOGOUT,
      },
    });

    /*
     * Le service retourne toujours la session révoquée afin que ses futurs
     * appelants puissent exploiter le résultat sans relire MongoDB.
     */
    expect(result).toBe(revokedSession);
  });


  it('ignore un logout sans refresh token', async () => {
    const result = await revokeCurrentAuthSession({
      refreshToken: undefined,
    });

    expect(result).toBeNull();

    expect(
      AuthSession.findOneAndUpdate,
    ).not.toHaveBeenCalled();

    expect(createAuditLog).not.toHaveBeenCalled();
  });
  it('maintient le logout si son audit échoue', async () => {
    const revokedSession = {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      revokedAt: new Date(),
      revokedReason:
        AUTH_SESSION_REVOKED_REASON.LOGOUT,
    };

    AuthSession.findOneAndUpdate.mockResolvedValue(
      revokedSession,
    );

    createAuditLog.mockRejectedValueOnce(
      new Error('MongoDB audit write failed'),
    );

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => { });

    const result = await revokeCurrentAuthSession({
      refreshToken: 'current-refresh-token',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Browser',
    });

    expect(result).toBe(revokedSession);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Auth session audit log creation failed',
      {
        action: AUDIT_ACTION.LOGOUT,
        errorName: 'Error',
      },
    );

    consoleErrorSpy.mockRestore();
  });

  it('révoque toutes les AuthSession actives d’un utilisateur lors du logout-all', async () => {
    const userId =
      new mongoose.Types.ObjectId();

    const updateResult = {
      acknowledged: true,
      matchedCount: 3,
      modifiedCount: 3,
    };

    AuthSession.updateMany.mockResolvedValue(
      updateResult,
    );

    const result = await revokeAllUserAuthSessions({
      userId,
    });

    expect(
      AuthSession.updateMany,
    ).toHaveBeenCalledOnce();

    const [
      revocationFilter,
      revocationUpdate,
    ] = AuthSession.updateMany.mock.calls[0];

    expect(revocationFilter).toEqual({
      user: userId,
      revokedAt: null,
    });

    expect(revocationUpdate).toEqual({
      $set: {
        revokedAt: expect.any(Date),
        revokedReason: 'logout_all',
      },
    });

    expect(result).toBe(updateResult);
  });

  it('révoque les AuthSession dans une transaction après un changement de mot de passe', async () => {
    const userId =
      new mongoose.Types.ObjectId();

    const session = {
      id: 'mongo-session',
    };

    await revokeAllUserAuthSessions({
      userId,
      revokedReason:
        AUTH_SESSION_REVOKED_REASON.PASSWORD_CHANGED,
      session,
    });

    expect(
      AuthSession.updateMany,
    ).toHaveBeenCalledWith(
      {
        user: userId,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: expect.any(Date),
          revokedReason:
            AUTH_SESSION_REVOKED_REASON
              .PASSWORD_CHANGED,
        },
      },
      {
        session,
      },
    );
  });

  it('refuse la rotation d’une AuthSession expirée', async () => {
    const currentAuthSession = {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      familyId: 'family-id',
      expiresAt: new Date(Date.now() - 60_000),
      revokedAt: null,
      revokedReason: null,
      usedAt: null,
      replacedBySession: null,
      compromisedAt: null,
    };

    AuthSession.findOne.mockResolvedValue(
      currentAuthSession,
    );

    await expect(
      rotateAuthSession({
        refreshToken: 'expired-refresh-token',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
    });

    expect(User.findById).not.toHaveBeenCalled();

    expect(
      AuthSession.findOneAndUpdate,
    ).not.toHaveBeenCalled();

    expect(AuthSession.create).not.toHaveBeenCalled();

    expect(
      AuthSession.updateMany,
    ).not.toHaveBeenCalled();
  });


  it('détecte la réutilisation d’un refresh token déjà roté et compromet sa famille', async () => {
    const currentAuthSession = {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      familyId: 'family-id',
      expiresAt: new Date(Date.now() + 60_000),

      usedAt: new Date(),
      revokedAt: new Date(),
      revokedReason: 'token_rotated',
      replacedBySession:
        new mongoose.Types.ObjectId(),

      compromisedAt: null,
    };

    AuthSession.findOne.mockResolvedValue(
      currentAuthSession,
    );

    await expect(
      rotateAuthSession({
        refreshToken:
          'already-used-refresh-token',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
    });

    /*
     * Première écriture :
     * toutes les générations deviennent compromises.
     *
     * Deuxième écriture :
     * seules les sessions encore actives sont révoquées
     * avec token_reuse_detected.
     */
    expect(AuthSession.updateMany).toHaveBeenCalledTimes(
      2,
    );

    expect(
      AuthSession.updateMany.mock.calls[0][0],
    ).toEqual({
      familyId: 'family-id',
      compromisedAt: null,
    });

    expect(
      AuthSession.updateMany.mock.calls[0][1],
    ).toEqual({
      $set: {
        compromisedAt: expect.any(Date),
      },
    });

    expect(
      AuthSession.updateMany.mock.calls[1][0],
    ).toEqual({
      familyId: 'family-id',
      revokedAt: null,
    });

    expect(
      AuthSession.updateMany.mock.calls[1][1],
    ).toEqual({
      $set: {
        revokedAt: expect.any(Date),
        revokedReason: 'token_reuse_detected',
      },
    });

    /*
     * Le reuse ne doit jamais créer S2.
     */
    expect(User.findById).not.toHaveBeenCalled();

    expect(
      AuthSession.findOneAndUpdate,
    ).not.toHaveBeenCalled();

    expect(AuthSession.create).not.toHaveBeenCalled();
  });
});