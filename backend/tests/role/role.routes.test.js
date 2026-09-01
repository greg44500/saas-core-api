import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { list } from '../../modules/role/role.controller.js';
import { roleRouter } from '../../modules/role/role.routes.js';

const {
    validationMiddleware,
    workspaceContextMiddleware,
    permissionMiddleware,
} = vi.hoisted(() => ({
    validationMiddleware: vi.fn((req, res, next) => next()),
    workspaceContextMiddleware: vi.fn((req, res, next) => {
        req.workspace = { _id: 'workspace-id' };
        next();
    }),
    permissionMiddleware: vi.fn((req, res, next) => next()),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => next()),
}));
vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));
vi.mock('../../middlewares/loadWorkspaceContext.js', () => ({
    loadWorkspaceContext: workspaceContextMiddleware,
}));
vi.mock('../../middlewares/authorizePermission.js', () => ({
    authorizePermission: vi.fn(() => permissionMiddleware),
}));
vi.mock('../../modules/role/role.controller.js', () => ({
    list: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
}));

describe('role.routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('protège la lecture des rôles avec role:read', async () => {
        const app = express();
        app.use('/workspaces/:workspaceId/roles', roleRouter);

        const response = await request(app)
            .get('/workspaces/507f1f77bcf86cd799439011/roles');

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalledOnce();
        expect(loadWorkspaceContext).toHaveBeenCalledOnce();
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.ROLE_READ,
        );
        expect(permissionMiddleware).toHaveBeenCalledOnce();
        expect(list).toHaveBeenCalledOnce();
    });
});
