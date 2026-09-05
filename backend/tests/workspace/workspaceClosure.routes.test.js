import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorizeWorkspaceOwner } from '../../middlewares/authorizeWorkspaceOwner.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    closeCurrentOwnerWorkspace,
} from '../../modules/workspace/workspaceClosure.controller.js';
import {
    workspaceClosureRouter,
} from '../../modules/workspace/workspaceClosure.routes.js';
import {
    closeWorkspaceBodySchema,
} from '../../modules/workspace/workspaceClosure.validation.js';
import {
    workspaceIdParamsSchema,
} from '../../modules/workspace/workspace.validation.js';

const {
    validationMiddleware,
    workspaceContextMiddleware,
    ownerMiddleware,
    accessModeMiddleware,
} = vi.hoisted(() => ({
    validationMiddleware: vi.fn((req, res, next) => {
        req.validated = {
            params: req.params,
            body: req.body,
        };
        next();
    }),
    workspaceContextMiddleware: vi.fn((req, res, next) => {
        req.workspace = { _id: req.params.workspaceId };
        next();
    }),
    ownerMiddleware: vi.fn((req, res, next) => next()),
    accessModeMiddleware: vi.fn((req, res, next) => next()),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = { id: 'owner-id' };
        next();
    }),
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));

vi.mock('../../middlewares/loadWorkspaceContext.js', () => ({
    loadWorkspaceContext: workspaceContextMiddleware,
}));

vi.mock('../../middlewares/authorizeWorkspaceOwner.js', () => ({
    authorizeWorkspaceOwner: ownerMiddleware,
}));

vi.mock('../../middlewares/enforceWorkspaceAccessMode.js', () => ({
    enforceWorkspaceAccessMode: vi.fn(() => accessModeMiddleware),
}));

vi.mock('../../modules/workspace/workspaceClosure.controller.js', () => ({
    closeCurrentOwnerWorkspace: vi.fn((req, res) =>
        res.status(200).json({ status: 'success' })),
}));

const app = express();
app.use(express.json());
app.use(
    '/workspaces/:workspaceId/closure',
    workspaceClosureRouter,
);

describe('workspaceClosure.routes', () => {
    beforeEach(() => {
        authenticate.mockClear();
        validationMiddleware.mockClear();
        workspaceContextMiddleware.mockClear();
        ownerMiddleware.mockClear();
        accessModeMiddleware.mockClear();
        closeCurrentOwnerWorkspace.mockClear();
    });

    it('protège la fermeture owner et l’autorise explicitement en remédiation', async () => {
        const response = await request(app)
            .post('/workspaces/507f1f77bcf86cd799439011/closure')
            .send({
                currentPassword: 'Correct Horse Battery Staple',
                confirmationName: 'Acme',
            });

        expect(response.status).toBe(200);
        expect(validateRequest).toHaveBeenCalledWith({
            params: workspaceIdParamsSchema,
            body: closeWorkspaceBodySchema,
        });
        expect(enforceWorkspaceAccessMode).toHaveBeenCalledWith({
            allowDuringRemediation: true,
        });
        expect(authenticate).toHaveBeenCalledOnce();
        expect(workspaceContextMiddleware).toHaveBeenCalledOnce();
        expect(authorizeWorkspaceOwner).toBe(ownerMiddleware);
        expect(ownerMiddleware).toHaveBeenCalledOnce();
        expect(accessModeMiddleware).toHaveBeenCalledOnce();
        expect(closeCurrentOwnerWorkspace).toHaveBeenCalledOnce();

        expect(workspaceContextMiddleware.mock.invocationCallOrder[0])
            .toBeLessThan(ownerMiddleware.mock.invocationCallOrder[0]);
        expect(ownerMiddleware.mock.invocationCallOrder[0])
            .toBeLessThan(accessModeMiddleware.mock.invocationCallOrder[0]);
        expect(accessModeMiddleware.mock.invocationCallOrder[0])
            .toBeLessThan(closeCurrentOwnerWorkspace.mock.invocationCallOrder[0]);
    });
});
