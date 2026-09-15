import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import {
    listTrash,
    removePermanently,
    restore,
} from '../../modules/file/file.controller.js';
import { fileRouter } from '../../modules/file/file.routes.js';

const {
    executionOrder,
    permissionMiddleware,
    workspaceAccessMiddleware,
} = vi.hoisted(() => ({
    executionOrder: [],
    permissionMiddleware: vi.fn((req, res, next) => {
        executionOrder.push('authorize');
        next();
    }),
    workspaceAccessMiddleware: vi.fn((req, res, next) => {
        executionOrder.push('workspace-access');
        next();
    }),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        executionOrder.push('authenticate');
        req.user = { _id: 'user-id' };
        next();
    }),
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => (req, res, next) => {
        executionOrder.push('validate');
        req.validated = {
            params: req.params,
            query: { page: 1, limit: 20 },
            body: {},
        };
        next();
    }),
}));

vi.mock('../../middlewares/loadWorkspaceContext.js', () => ({
    loadWorkspaceContext: vi.fn((req, res, next) => {
        executionOrder.push('workspace-context');
        req.workspace = { _id: req.params.workspaceId };
        next();
    }),
}));

vi.mock('../../middlewares/authorizePermission.js', () => ({
    authorizePermission: vi.fn(() => permissionMiddleware),
}));

vi.mock('../../middlewares/enforceWorkspaceAccessMode.js', () => ({
    enforceWorkspaceAccessMode: vi.fn(() => workspaceAccessMiddleware),
}));

vi.mock('../../middlewares/enforcePlanFeature.js', () => ({
    enforcePlanFeature: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../middlewares/uploadMiddleware.js', () => ({
    uploadSingleFile: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../middlewares/cleanupTemporaryUploadOnError.js', () => ({
    cleanupTemporaryUploadOnError: vi.fn((error, req, res, next) => next(error)),
}));

vi.mock('../../modules/file/file.controller.js', () => ({
    upload: vi.fn((req, res) => res.status(201).json({ status: 'success' })),
    list: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
    listTrash: vi.fn((req, res) => {
        executionOrder.push('list-trash');
        res.status(200).json({ status: 'success' });
    }),
    getStorageUsage: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
    getById: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
    download: vi.fn((req, res) => res.status(200).end()),
    remove: vi.fn((req, res) => res.status(204).send()),
    removePermanently: vi.fn((req, res) => {
        executionOrder.push('remove-permanently');
        res.status(204).send();
    }),
    restore: vi.fn((req, res) => {
        executionOrder.push('restore');
        res.status(200).json({ status: 'success' });
    }),
}));

const createTestApp = () => {
    const app = express();
    app.use('/workspaces/:workspaceId/files', fileRouter);
    return app;
};

beforeEach(() => {
    executionOrder.length = 0;
    permissionMiddleware.mockClear();
    workspaceAccessMiddleware.mockClear();
    listTrash.mockClear();
    removePermanently.mockClear();
    restore.mockClear();
});

describe('file trash routes', () => {
    it('protège le listing de corbeille avec la permission dédiée', async () => {
        const response = await request(createTestApp())
            .get('/workspaces/507f1f77bcf86cd799439011/files/trash');

        expect(response.status).toBe(200);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.FILE_TRASH_READ,
        );
        expect(listTrash).toHaveBeenCalledOnce();
        expect(executionOrder).toEqual([
            'authenticate',
            'validate',
            'workspace-context',
            'authorize',
            'list-trash',
        ]);
    });

    it('protège la restauration avec sa permission et autorise la remédiation', async () => {
        const response = await request(createTestApp())
            .post(
                '/workspaces/507f1f77bcf86cd799439011/files/507f1f77bcf86cd799439012/restore',
            );

        expect(response.status).toBe(200);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.FILE_RESTORE,
        );
        expect(enforceWorkspaceAccessMode).toHaveBeenCalledWith({
            allowDuringRemediation: true,
        });
        expect(restore).toHaveBeenCalledOnce();
        expect(executionOrder).toEqual([
            'authenticate',
            'validate',
            'workspace-context',
            'authorize',
            'workspace-access',
            'restore',
        ]);
    });

    it('protège la suppression définitive avec sa permission dédiée', async () => {
        const response = await request(createTestApp())
            .delete(
                '/workspaces/507f1f77bcf86cd799439011/files/507f1f77bcf86cd799439012/permanent',
            );

        expect(response.status).toBe(204);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.FILE_DELETE_PERMANENTLY,
        );
        expect(enforceWorkspaceAccessMode).toHaveBeenCalledWith({
            allowDuringRemediation: true,
        });
        expect(removePermanently).toHaveBeenCalledOnce();
        expect(executionOrder).toEqual([
            'authenticate',
            'validate',
            'workspace-context',
            'authorize',
            'workspace-access',
            'remove-permanently',
        ]);
    });
});
