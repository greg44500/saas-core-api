import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import {
    remove,
    suspend,
    updateRole,
} from '../../modules/workspaceMember/workspaceMember.controller.js';
import {
    workspaceMemberRouter,
} from '../../modules/workspaceMember/workspaceMember.routes.js';

const {
    accessModeMiddleware,
    permissionMiddleware,
    validationMiddleware,
} = vi.hoisted(() => ({
    accessModeMiddleware: vi.fn((req, res, next) => next()),
    permissionMiddleware: vi.fn((req, res, next) => next()),
    validationMiddleware: vi.fn((req, res, next) => {
        req.validated = { params: req.params, body: req.body };
        next();
    }),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = { id: 'actor-id' };
        next();
    }),
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));

vi.mock('../../middlewares/loadWorkspaceContext.js', () => ({
    loadWorkspaceContext: vi.fn((req, res, next) => {
        req.workspace = { _id: req.params.workspaceId };
        next();
    }),
}));

vi.mock('../../middlewares/authorizePermission.js', () => ({
    authorizePermission: vi.fn(() => permissionMiddleware),
}));

vi.mock('../../middlewares/enforceWorkspaceAccessMode.js', () => ({
    enforceWorkspaceAccessMode: vi.fn(() => accessModeMiddleware),
}));

vi.mock('../../modules/workspaceMember/workspaceMember.controller.js', () => ({
    remove: vi.fn((req, res) => res.status(204).send()),
    suspend: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
    updateRole: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
}));

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/workspaces/:workspaceId/members', workspaceMemberRouter);
    return app;
};

describe('workspaceMember.routes', () => {
    beforeEach(() => {
        permissionMiddleware.mockClear();
        accessModeMiddleware.mockClear();
        remove.mockClear();
        suspend.mockClear();
        updateRole.mockClear();
    });

    it('protège le changement de rôle avec member:update', async () => {
        const response = await request(createApp())
            .patch('/workspaces/507f1f77bcf86cd799439011/members/507f1f77bcf86cd799439012/role')
            .send({ roleId: '507f1f77bcf86cd799439013' });

        expect(response.status).toBe(200);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.MEMBER_UPDATE,
        );
        expect(updateRole).toHaveBeenCalledOnce();
    });

    it('protège la suspension avec member:suspend en mode normal', async () => {
        const response = await request(createApp())
            .post('/workspaces/507f1f77bcf86cd799439011/members/507f1f77bcf86cd799439012/suspend');

        expect(response.status).toBe(200);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.MEMBER_SUSPEND,
        );
        expect(suspend).toHaveBeenCalledOnce();
    });

    it('autorise la suppression pendant la remédiation', async () => {
        const response = await request(createApp())
            .delete('/workspaces/507f1f77bcf86cd799439011/members/507f1f77bcf86cd799439012');

        expect(response.status).toBe(204);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.MEMBER_REMOVE,
        );
        expect(enforceWorkspaceAccessMode).toHaveBeenCalledWith({
            allowDuringRemediation: true,
        });
        expect(remove).toHaveBeenCalledOnce();
    });
});
