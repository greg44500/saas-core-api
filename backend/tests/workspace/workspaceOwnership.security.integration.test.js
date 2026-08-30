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
    CORE_PERMISSION,
} from '../../constants/permissions.constants.js';
import {
    workspaceOwnershipRouter,
} from '../../modules/workspace/workspaceOwnership.routes.js';
import {
    transferOwnership,
} from '../../modules/workspace/workspaceOwnership.controller.js';


const {
    permissions,
} = vi.hoisted(() => ({
    permissions: [],
}));


vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = {
            id: 'actor-id',
        };
        next();
    }),
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => (req, res, next) => {
        req.validated = {
            params: req.params,
            body: req.body,
        };
        next();
    }),
}));

vi.mock('../../middlewares/loadWorkspaceContext.js', () => ({
    loadWorkspaceContext: vi.fn((req, res, next) => {
        req.workspace = {
            _id: req.params.workspaceId,
        };
        req.permissions = [...permissions];
        next();
    }),
}));

vi.mock(
    '../../modules/workspace/workspaceOwnership.controller.js',
    () => ({
        transferOwnership: vi.fn((req, res) =>
            res.status(200).json({
                status: 'success',
            })),
    }),
);


const app = express();
app.use(express.json());
app.use(
    '/workspaces/:workspaceId/ownership',
    workspaceOwnershipRouter,
);
app.use((error, req, res, next) => {
    res.status(error.statusCode ?? 500).json({
        status: error.status ?? 'error',
        message: error.message,
    });
});


beforeEach(() => {
    permissions.splice(0, permissions.length);
    transferOwnership.mockClear();
});


describe('workspace ownership HTTP security', () => {
    const path =
        '/workspaces/507f1f77bcf86cd799439011/ownership';
    const body = {
        newOwnerMemberId:
            '507f1f77bcf86cd799439012',
        previousOwnerRoleId:
            '507f1f77bcf86cd799439013',
        currentPassword:
            'Correct Horse Battery Staple',
    };

    it('refuse le transfert sans la permission owner-only', async () => {
        permissions.push(
            CORE_PERMISSION.WORKSPACE_READ,
            CORE_PERMISSION.WORKSPACE_UPDATE,
        );

        const response = await request(app)
            .patch(path)
            .send(body);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({
            status: 'fail',
            message: 'Permission insuffisante',
        });
        expect(transferOwnership).not.toHaveBeenCalled();
    });

    it('autorise le transfert lorsque la permission dédiée est présente', async () => {
        permissions.push(
            CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
        );

        const response = await request(app)
            .patch(path)
            .send(body);

        expect(response.status).toBe(200);
        expect(transferOwnership).toHaveBeenCalledOnce();
    });
});
