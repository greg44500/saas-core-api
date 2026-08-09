import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSession } from '../../modules/authSessions/authSession.model.js';
import { createInitialAuthSession } from '../../modules/authSessions/authSession.service.js';

vi.mock('../../modules/authSessions/authSession.model.js', () => ({
  AuthSession: {
    create: vi.fn(),
  },
}));

describe('authSession.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      })
    );

    expect(sessionData.refreshTokenHash).not.toBe(result.refreshToken);

    expect(result).toEqual({
      authSession: createdSession,
      refreshToken: expect.any(String),
    });
  });
});