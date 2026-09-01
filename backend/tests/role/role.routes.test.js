import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { enforceWorkspaceAccessMode } from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import {
    create,
    list,
    remove,
    update,
} from '../../modules/role/role.controller.js';
import { roleRouter } from '../../modules/role/role.routes.js';

const {
    validationMiddleware,
    workspaceContextMiddleware,
    permissionMiddleware,
    accessModeMiddleware,
} = vi.hoisted(() => ({
    validationMiddleware: vi.fn((req, res, next) => next()),
    workspaceContextMiddleware: vi.fn((req, res, next) => {
        req.workspace = { _id: 'workspace-id' };
        next();
    }),
    permissionMiddleware: vi.fn((req, res, next) => next()),
    accessModeMiddleware: vi.fn((req, res, next) => next()),
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
vi.mock('../../middlewares/enforceWorkspaceAccessMode.js', () => ({
    enforceWorkspaceAccessMode: vi.fn(() => accessModeMiddleware),
}));
vi.mock('../../modules/role/role.controller.js', () => ({
    create: vi.fn((req, res) => res.status(201).json({ status: 'success' })),
    list: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
    remove: vi.fn((req, res) => res.status(204).send()),
    update: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
}));

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/workspaces/:workspaceId/roles', roleRouter);
    return app;
}

describe('role.routes', () => {
    beforeEach(() => {
        authenticate.mockClear();
        loadWorkspaceContext.mockClear();
        validationMiddleware.mockClear();
        workspaceContextMiddleware.mockClear();
        permissionMiddleware.mockClear();
        accessModeMiddleware.mockClear();
        create.mockClear();
        list.mockClear();
        remove.mockClear();
        update.mockClear();
    });

    it('protège la lecture des rôles avec role:read', async () => {
        const response = await request(makeApp())
            .get('/workspaces/507f1f77bcf86cd799439011/roles');

        expect(response.status).toBe(200);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.ROLE_READ,
        );
        expect(list).toHaveBeenCalledOnce();
    });

    it('protège la création des rôles avec role:create', async () => {
        const response = await request(makeApp())
            .post('/workspaces/507f1f77bcf86cd799439011/roles')
            .send({ name: 'Support', permissions: [] });

        expect(response.status).toBe(201);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.ROLE_CREATE,
        );
        expect(enforceWorkspaceAccessMode).toHaveBeenCalled();
        expect(create).toHaveBeenCalledOnce();
    });

    it('protège la modification des rôles avec role:update', async () => {
        const response = await request(makeApp())
            .patch('/workspaces/507f1f77bcf86cd799439011/roles/507f1f77bcf86cd799439012')
            .send({ name: 'Support senior' });

        expect(response.status).toBe(200);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.ROLE_UPDATE,
        );
        expect(update).toHaveBeenCalledOnce();
    });

    it('protège la suppression des rôles avec role:delete', async () => {
        const response = await request(makeApp())
            .delete('/workspaces/507f1f77bcf86cd799439011/roles/507f1f77bcf86cd799439012');

        expect(response.status).toBe(204);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.ROLE_DELETE,
        );
        expect(remove).toHaveBeenCalledOnce();
    });
});
