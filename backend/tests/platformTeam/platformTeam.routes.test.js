import express from 'express';
import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import {
    authorizePlatformPermission,
} from '../../middlewares/authorizePlatformPermission.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { platformTeamRouter } from '../../modules/platformTeam/platformTeam.routes.js';
import {
    platformTeamMemberIdParamsSchema,
    updatePlatformTeamMemberRoleBodySchema,
} from '../../modules/platformTeam/platformTeam.validation.js';
import {
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';

const {
    permissionMiddleware,
    validationMiddleware,
    handlers,
} = vi.hoisted(() => ({
    permissionMiddleware: vi.fn((req, res, next) => next()),
    validationMiddleware: vi.fn((req, res, next) => next()),
    handlers: {
        summary: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        list: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        updateRole: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        suspend: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        reactivate: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        revoke: vi.fn((req, res) => res.status(204).send()),
    },
}));

vi.mock('../../middlewares/authorizePlatformPermission.js', () => ({
    authorizePlatformPermission: vi.fn(() => permissionMiddleware),
}));
vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));
vi.mock('../../modules/platformTeam/platformTeam.controller.js', () => handlers);

const app = express();
app.use(express.json());
app.use('/team', platformTeamRouter);

beforeEach(() => {
    permissionMiddleware.mockClear();
    validationMiddleware.mockClear();
    Object.values(handlers).forEach((handler) => handler.mockClear());
});


describe('platformTeamRouter', () => {
    it('protège le snapshot équipe avec team:read sans payload client', async () => {
        const response = await request(app).get('/team/summary');

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission.mock.calls).toContainEqual([
            PLATFORM_PERMISSION.TEAM_READ,
        ]);
        expect(handlers.summary).toHaveBeenCalledOnce();
    });

    it('configure la lecture avec team:read et pagination validée', async () => {
        const response = await request(app)
            .get('/team/members?page=1&limit=20');

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission.mock.calls).toContainEqual([
            PLATFORM_PERMISSION.TEAM_READ,
        ]);
        expect(validateRequest.mock.calls).toContainEqual([{
            query: paginationQuerySchema,
        }]);
        expect(handlers.list).toHaveBeenCalledOnce();
    });

    it('configure le changement de rôle avec sa permission et Zod', async () => {
        const response = await request(app)
            .patch('/team/members/507f1f77bcf86cd799439011/role')
            .send({ roleId: '507f191e810c19729de860ea' });

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission.mock.calls).toContainEqual([
            PLATFORM_PERMISSION.TEAM_MEMBER_ROLE_UPDATE,
        ]);
        expect(validateRequest.mock.calls).toContainEqual([{
            params: platformTeamMemberIdParamsSchema,
            body: updatePlatformTeamMemberRoleBodySchema,
        }]);
        expect(handlers.updateRole).toHaveBeenCalledOnce();
    });

    it('utilise des permissions distinctes pour suspendre, réactiver et retirer', async () => {
        const memberId = '507f1f77bcf86cd799439011';

        expect((await request(app)
            .patch(`/team/members/${memberId}/suspend`)).status).toBe(200);
        expect((await request(app)
            .patch(`/team/members/${memberId}/reactivate`)).status).toBe(200);
        expect((await request(app)
            .delete(`/team/members/${memberId}`)).status).toBe(204);

        expect(authorizePlatformPermission.mock.calls).toContainEqual([
            PLATFORM_PERMISSION.TEAM_MEMBER_SUSPEND,
        ]);
        expect(authorizePlatformPermission.mock.calls).toContainEqual([
            PLATFORM_PERMISSION.TEAM_MEMBER_REACTIVATE,
        ]);
        expect(authorizePlatformPermission.mock.calls).toContainEqual([
            PLATFORM_PERMISSION.TEAM_MEMBER_REVOKE,
        ]);
        expect(handlers.suspend).toHaveBeenCalledOnce();
        expect(handlers.reactivate).toHaveBeenCalledOnce();
        expect(handlers.revoke).toHaveBeenCalledOnce();
    });
});
