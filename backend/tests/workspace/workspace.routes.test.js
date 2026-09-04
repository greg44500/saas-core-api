import express from 'express';
import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { enforcePlanFeature } from '../../middlewares/enforcePlanFeature.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';

import {
    create,
    getById,
    list,
    listMembers,
    update,
} from '../../modules/workspace/workspace.controller.js';

import { workspaceRouter } from '../../modules/workspace/workspace.routes.js';

import {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    listWorkspaceMembersQuerySchema,
    workspaceIdParamsSchema,
} from '../../modules/workspace/workspace.validation.js';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import {
    CORE_PLAN_FEATURE,
} from '../../modules/plan/planCapability.registry.js';

const {
    validationMiddleware,
    workspaceContextMiddleware,
    permissionMiddleware,
    featureMiddleware,
    workspaceAccessMiddleware,
} = vi.hoisted(() => ({
    validationMiddleware: vi.fn((req, res, next) => {
        next();
    }),

    workspaceContextMiddleware: vi.fn((req, res, next) => {
        req.workspace = {
            _id: 'workspace-id',
            name: 'Acme',
            status: 'active',
        };

        req.permissions = [
            'workspace:read',
            'workspace:update',
        ];

        next();
    }),

    permissionMiddleware: vi.fn((req, res, next) => {
        next();
    }),

    featureMiddleware: vi.fn((req, res, next) => {
        next();
    }),

    workspaceAccessMiddleware: vi.fn((req, res, next) => {
        req.workspaceAccess = {
            accessMode: 'normal',
        };
        next();
    }),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = {
            id: 'user-id',
        };

        next();
    }),
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));

vi.mock('../../middlewares/loadWorkspaceContext.js', () => ({
    loadWorkspaceContext: workspaceContextMiddleware,
}));

vi.mock('../../middlewares/authorizePermission.js', () => ({
    authorizePermission: vi.fn(
        () => permissionMiddleware,
    ),
}));

vi.mock('../../middlewares/enforcePlanFeature.js', () => ({
    enforcePlanFeature: vi.fn(
        () => featureMiddleware,
    ),
}));

vi.mock('../../middlewares/enforceWorkspaceAccessMode.js', () => ({
    enforceWorkspaceAccessMode: vi.fn(
        () => workspaceAccessMiddleware,
    ),
}));

vi.mock(
    '../../modules/workspace/workspace.controller.js',
    () => ({
        create: vi.fn((req, res) => {
            res.status(201).json({
                status: 'success',
            });
        }),
        list: vi.fn((req, res) => {
            res.status(200).json({
                status: 'success',
            });
        }),
        listMembers: vi.fn((req, res) => {
            res.status(200).json({
                status: 'success',
            });
        }),
        getById: vi.fn((req, res) => {
            res.status(200).json({
                status: 'success',
            });
        }),
        update: vi.fn((req, res) => {
            res.status(200).json({
                status: 'success',
            });
        }),
    }),
);

beforeEach(() => {
    authenticate.mockClear();
    validationMiddleware.mockClear();
    workspaceContextMiddleware.mockClear();
    permissionMiddleware.mockClear();
    featureMiddleware.mockClear();
    workspaceAccessMiddleware.mockClear();
    create.mockClear();
    list.mockClear();
    listMembers.mockClear();
    getById.mockClear();
    update.mockClear();
});

describe('workspace.routes', () => {
    it('protège et valide la création avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());
        app.use('/workspaces', workspaceRouter);

        const response = await request(app)
            .post('/workspaces')
            .send({
                name: 'Acme',
            });

        expect(response.status).toBe(201);
        expect(validateRequest).toHaveBeenCalledWith({
            body: createWorkspaceSchema,
        });
        expect(authenticate).toHaveBeenCalledOnce();
        expect(validationMiddleware).toHaveBeenCalledOnce();
        expect(create).toHaveBeenCalledOnce();
    });

    it('protège l’accès au workspace avec le contexte tenant et la permission de lecture', async () => {
        const app = express();

        app.use(express.json());
        app.use('/workspaces', workspaceRouter);

        const response = await request(app)
            .get('/workspaces/507f1f77bcf86cd799439011');

        expect(response.status).toBe(200);
        expect(validateRequest).toHaveBeenCalledWith({
            params: workspaceIdParamsSchema,
        });
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.WORKSPACE_READ,
        );
        expect(workspaceAccessMiddleware).not.toHaveBeenCalled();
        expect(getById).toHaveBeenCalledOnce();
    });

    it('protège la modification du workspace avec la permission et le mode d’accès', async () => {
        const app = express();

        app.use(express.json());
        app.use('/workspaces', workspaceRouter);

        const response = await request(app)
            .patch('/workspaces/507f1f77bcf86cd799439011')
            .send({
                name: 'Acme Updated',
            });

        expect(response.status).toBe(200);
        expect(validateRequest).toHaveBeenCalledWith({
            params: workspaceIdParamsSchema,
            body: updateWorkspaceSchema,
        });
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.WORKSPACE_UPDATE,
        );
        expect(enforceWorkspaceAccessMode).toHaveBeenCalledWith();
        expect(workspaceAccessMiddleware).toHaveBeenCalledOnce();
        expect(update).toHaveBeenCalledOnce();
        expect(
            permissionMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            workspaceAccessMiddleware.mock.invocationCallOrder[0],
        );
        expect(
            workspaceAccessMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            update.mock.invocationCallOrder[0],
        );
    });

    it('protège la liste des workspaces avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());
        app.use('/workspaces', workspaceRouter);

        const response = await request(app)
            .get('/workspaces');

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalledOnce();
        expect(list).toHaveBeenCalledOnce();
        expect(validationMiddleware).not.toHaveBeenCalled();
        expect(workspaceContextMiddleware).not.toHaveBeenCalled();
        expect(permissionMiddleware).not.toHaveBeenCalled();
        expect(featureMiddleware).not.toHaveBeenCalled();
        expect(workspaceAccessMiddleware).not.toHaveBeenCalled();
    });

    it('protège la liste des membres avec member:read et team_management', async () => {
        const app = express();

        app.use(express.json());
        app.use('/workspaces', workspaceRouter);

        const response = await request(app)
            .get(
                '/workspaces/507f1f77bcf86cd799439011/members?page=2&limit=10',
            );

        expect(response.status).toBe(200);
        expect(validateRequest).toHaveBeenCalledWith({
            params: workspaceIdParamsSchema,
            query: listWorkspaceMembersQuerySchema,
        });
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.MEMBER_READ,
        );
        expect(enforcePlanFeature).toHaveBeenCalledWith(
            CORE_PLAN_FEATURE.TEAM_MANAGEMENT,
        );
        expect(featureMiddleware).toHaveBeenCalledOnce();
        expect(workspaceAccessMiddleware).not.toHaveBeenCalled();
        expect(listMembers).toHaveBeenCalledOnce();
    });
});
