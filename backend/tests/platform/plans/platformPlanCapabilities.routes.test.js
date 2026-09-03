import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../../constants/platformPermissions.constants.js';
import { PLATFORM_ROLE } from '../../../constants/platformRoles.constants.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import {
    authorizePlatformPermission,
} from '../../../middlewares/authorizePlatformPermission.js';
import { platformRouter } from '../../../modules/platform/platform.routes.js';

const permissionMiddleware = vi.hoisted(
    () => vi.fn((req, res, next) => next()),
);

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

vi.mock('../../../middlewares/authorizePlatformPermission.js', () => ({
    authorizePlatformPermission: vi.fn(() => permissionMiddleware),
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
        authenticate.mockClear();
        authorizePlatformPermission.mockClear();
        permissionMiddleware.mockClear();
    });

    it('reste protégé et expose uniquement le registre actif en lecture', async () => {
        const response = await request(app).get('/platform/plans/capabilities');

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalledOnce();
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.CAPABILITIES_READ,
        );
        expect(permissionMiddleware).toHaveBeenCalledOnce();
        expect(response.body.data.features).toContain('file_upload');
        expect(response.body.data.featureDefinitions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: 'file_upload',
                    category: 'files',
                }),
            ]),
        );
        expect(response.body.data.metrics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: 'members',
                    presentation: expect.objectContaining({
                        label: 'Membres',
                    }),
                }),
                expect.objectContaining({ key: 'storage_bytes' }),
                expect.objectContaining({ key: 'file_uploads_monthly' }),
            ]),
        );
    });
});
