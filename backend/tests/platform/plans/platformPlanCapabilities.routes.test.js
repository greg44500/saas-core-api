import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PLATFORM_ROLE } from '../../../constants/platformRoles.constants.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorizePlatformRole } from '../../../middlewares/authorizePlatformRole.js';
import { platformRouter } from '../../../modules/platform/platform.routes.js';

const platformRoleMiddleware = vi.hoisted(() => vi.fn((req, res, next) => next()));

vi.mock('../../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = {
            _id: 'user-id',
            id: 'user-id',
            platformRole: PLATFORM_ROLE.SUPER_ADMIN,
        };
        next();
    }),
}));

vi.mock('../../../middlewares/authorizePlatformRole.js', () => ({
    authorizePlatformRole: vi.fn(() => platformRoleMiddleware),
}));

vi.mock('../../../modules/platform/plans/platformPlans.controller.js', () => ({
    createPlan: vi.fn(),
    listPlans: vi.fn(),
    updatePlan: vi.fn(),
    archivePlan: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/platform', platformRouter);

describe('GET /platform/plans/capabilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('reste protégé par l’authentification Platform et le rôle super-admin', async () => {
        const response = await request(app).get('/platform/plans/capabilities');

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalledOnce();
        expect(authorizePlatformRole).toHaveBeenCalledWith(PLATFORM_ROLE.SUPER_ADMIN);
        expect(platformRoleMiddleware).toHaveBeenCalledOnce();
        expect(response.body.data.features).toContain('file_upload');
        expect(response.body.data.metrics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'members' }),
                expect.objectContaining({ key: 'storage_bytes' }),
                expect.objectContaining({ key: 'file_uploads_monthly' }),
            ]),
        );
    });
});
