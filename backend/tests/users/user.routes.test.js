import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../app.js';
import { authenticate } from '../../middlewares/authenticate.js';
import {
    getCurrentUserClosureImpact,
} from '../../modules/users/userClosureImpact.service.js';
import {
    requestCurrentUserClosure,
} from '../../modules/users/userClosure.service.js';
import { updateCurrentUserProfile } from '../../modules/users/user.service.js';

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = { id: 'user-id' };
        next();
    }),
}));

vi.mock('../../modules/users/user.service.js', () => ({
    updateCurrentUserProfile: vi.fn(),
}));

vi.mock('../../modules/users/userClosureImpact.service.js', () => ({
    getCurrentUserClosureImpact: vi.fn(),
}));

vi.mock('../../modules/users/userClosure.service.js', () => ({
    requestCurrentUserClosure: vi.fn(),
}));

describe('PATCH /api/users/me', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        updateCurrentUserProfile.mockResolvedValue({
            _id: { toString: () => 'user-id' },
            firstName: 'Gregory',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailVerifiedAt: null,
            platformRole: 'user',
        });
    });

    it('protège, valide et met à jour le profil courant', async () => {
        const response = await request(app)
            .patch('/api/users/me')
            .set('Authorization', 'Bearer test-token')
            .set('User-Agent', 'Test Browser')
            .send({ firstName: '  Gregory  ' });

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalled();
        expect(updateCurrentUserProfile).toHaveBeenCalledWith({
            userId: 'user-id',
            firstName: 'Gregory',
            lastName: undefined,
            ipAddress: expect.any(String),
            userAgent: 'Test Browser',
        });
        expect(response.body.data.user).toEqual({
            id: 'user-id',
            firstName: 'Gregory',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailVerifiedAt: null,
        });
    });

    it('refuse une tentative de modification de l’email', async () => {
        const response = await request(app)
            .patch('/api/users/me')
            .set('Authorization', 'Bearer test-token')
            .send({ email: 'new@example.com' });

        expect(response.status).toBe(400);
        expect(updateCurrentUserProfile).not.toHaveBeenCalled();
    });

    it('refuse un body vide', async () => {
        const response = await request(app)
            .patch('/api/users/me')
            .set('Authorization', 'Bearer test-token')
            .send({});

        expect(response.status).toBe(400);
        expect(updateCurrentUserProfile).not.toHaveBeenCalled();
    });
});

describe('GET /api/users/me/closure-impact', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getCurrentUserClosureImpact.mockResolvedValue({
            ownedWorkspaces: [
                {
                    id: 'workspace-id',
                    name: 'Restaurant ACME',
                    currentStatus: 'active',
                    willBeArchived: true,
                    otherActiveMemberCount: 7,
                },
            ],
            workspacesToArchive: [
                {
                    id: 'workspace-id',
                    name: 'Restaurant ACME',
                    currentStatus: 'active',
                    willBeArchived: true,
                    otherActiveMemberCount: 7,
                },
            ],
            memberOnlyWorkspaces: [],
            affectedSubscriptions: [],
            summary: {
                ownedWorkspaceCount: 1,
                workspaceArchiveCount: 1,
                otherActiveMemberCount: 7,
                membershipRemovalCount: 1,
                affectedSubscriptionCount: 0,
            },
        });
    });

    it('protège et retourne l’aperçu calculé par le backend', async () => {
        const response = await request(app)
            .get('/api/users/me/closure-impact')
            .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalled();
        expect(getCurrentUserClosureImpact).toHaveBeenCalledWith({
            userId: 'user-id',
        });
        expect(response.body.data.closureImpact).toMatchObject({
            summary: {
                ownedWorkspaceCount: 1,
                workspaceArchiveCount: 1,
                otherActiveMemberCount: 7,
                membershipRemovalCount: 1,
                affectedSubscriptionCount: 0,
            },
        });
    });
});

describe('POST /api/users/me/closure', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requestCurrentUserClosure.mockResolvedValue({
            id: 'user-id',
            status: 'closed',
            deletionRequestedAt: new Date('2026-09-05T12:00:00.000Z'),
            closedAt: new Date('2026-09-05T12:00:01.000Z'),
            ownedWorkspaceCount: 1,
            archivedWorkspaceCount: 1,
            removedMembershipCount: 2,
            revokedSessionCount: 2,
        });
    });

    it('protège, valide et déclenche la fermeture complète du compte courant', async () => {
        const response = await request(app)
            .post('/api/users/me/closure')
            .set('Authorization', 'Bearer test-token')
            .set('User-Agent', 'Test Browser')
            .send({
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'greg@example.com',
                confirmAccountClosure: true,
            });

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalled();
        expect(requestCurrentUserClosure).toHaveBeenCalledWith({
            userId: 'user-id',
            currentPassword: 'Correct Horse Battery Staple',
            confirmationEmail: 'greg@example.com',
            confirmAccountClosure: true,
            ipAddress: expect.any(String),
            userAgent: 'Test Browser',
        });
        expect(response.body.data.accountClosure).toMatchObject({
            id: 'user-id',
            status: 'closed',
            ownedWorkspaceCount: 1,
            archivedWorkspaceCount: 1,
            removedMembershipCount: 2,
            revokedSessionCount: 2,
        });
    });

    it('refuse une fermeture sans confirmation explicite', async () => {
        const response = await request(app)
            .post('/api/users/me/closure')
            .set('Authorization', 'Bearer test-token')
            .send({
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'greg@example.com',
            });

        expect(response.status).toBe(400);
        expect(requestCurrentUserClosure).not.toHaveBeenCalled();
    });

    it('refuse confirmAccountClosure=false', async () => {
        const response = await request(app)
            .post('/api/users/me/closure')
            .set('Authorization', 'Bearer test-token')
            .send({
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'greg@example.com',
                confirmAccountClosure: false,
            });

        expect(response.status).toBe(400);
        expect(requestCurrentUserClosure).not.toHaveBeenCalled();
    });

    it('refuse les champs non prévus', async () => {
        const response = await request(app)
            .post('/api/users/me/closure')
            .set('Authorization', 'Bearer test-token')
            .send({
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'greg@example.com',
                confirmAccountClosure: true,
                unexpectedField: true,
            });

        expect(response.status).toBe(400);
        expect(requestCurrentUserClosure).not.toHaveBeenCalled();
    });
});
